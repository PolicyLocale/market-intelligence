export const runtime = "nodejs";

import { NextResponse } from "next/server";
import axios from "axios";
import yahooFinance from "yahoo-finance2";

let batchIndex = 0;
const BATCH_SIZE = 10;

async function fetchFromNSE(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`;

    const res = await axios.get(url);
    const result = res.data?.chart?.result?.[0];

    if (!result) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];

    if (!timestamps || !quotes) return null;

    const candles = timestamps
      .map((t: number, i: number) => ({
        time: t,
        open: quotes.open?.[i],
        high: quotes.high?.[i],
        low: quotes.low?.[i],
        close: quotes.close?.[i],
        volume: quotes.volume?.[i],
      }))
      .filter((c: any) => c.close != null);

    return candles.length ? candles : null;
  } catch {
    return null;
  }
}

async function fetchFromYahoo(symbol: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    const data: any = await yahooFinance.chart(`${symbol}.NS`, {
      period1: oneDayAgo,
      period2: now,
      interval: "5m",
    });

    const quotes = data?.indicators?.quote?.[0];
    const timestamps = data?.timestamp;

    if (!quotes || !timestamps) return null;

    const candles = timestamps
      .map((t: number, i: number) => ({
        time: t,
        open: quotes.open?.[i],
        high: quotes.high?.[i],
        low: quotes.low?.[i],
        close: quotes.close?.[i],
        volume: quotes.volume?.[i],
      }))
      .filter((c: any) => c.close != null);

    return candles.length ? candles : null;
  } catch {
    return null;
  }
}

function getMarketStatus() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const day = ist.getDay();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();

  const isWeekend = day === 0 || day === 6;

  const isOpen =
    !isWeekend &&
    (hours > 9 || (hours === 9 && minutes >= 15)) &&
    (hours < 15 || (hours === 15 && minutes <= 30));

  return isOpen ? "OPEN" : "CLOSED";
}

export async function POST(request: Request) {
  // ✅ FIX: request is now correctly inside handler
  const isBackground = new URL(request.url).searchParams.get("background");

  try {
    const res = await fetch("http://localhost:3000/api/symbols");
    const json = await res.json();

    const allSymbols: string[] = json.symbols || [];

    const totalBatches = Math.ceil(allSymbols.length / BATCH_SIZE);

    const start = batchIndex * BATCH_SIZE;
    const end = start + BATCH_SIZE;

    const symbols = allSymbols.slice(start, end);

    batchIndex = (batchIndex + 1) % totalBatches;

    const results: any[] = [];

    for (const symbol of symbols) {
      let candles = await fetchFromNSE(symbol);

      if (!candles) {
        candles = await fetchFromYahoo(symbol);
      }

      if (!candles || candles.length < 5) continue;

      const first = candles[0];
      const last = candles[candles.length - 1];

      const change =
        ((last.close - first.open) / first.open) * 100;

      let signal = "HOLD";

      if (change > 1) signal = "WATCH BUY";
      else if (change < -1) signal = "WATCH SELL";

      results.push({
        symbol,
        candles,
        change,
        signal,
        rsi: 50,
        resistance: last.high,
        support: last.low,
        volumeSpike: false,
      });
    }

    console.log("VALID RESULTS FOUND:", results.length);

    return NextResponse.json({
      data: results,
      batch: batchIndex,
      totalBatches,
      marketStatus: getMarketStatus(),
      lastCandleTime: results[0]?.candles?.at(-1)?.time || null,
    });

  } catch (err: any) {
    console.error("SCAN ERROR:", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}