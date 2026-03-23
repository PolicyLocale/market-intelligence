export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

let batchIndex = 0;
const BATCH_SIZE = 80;

/* ================= MARKET STATUS ================= */

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

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    // 🔥 Fetch symbols
    const res = await fetch("http://localhost:3000/api/symbols");
    const json = await res.json();
    const allSymbols: string[] = json.symbols || [];

    if (!allSymbols.length) {
      return NextResponse.json({ data: [] });
    }

    /* ================= ROTATION ================= */

    const totalBatches = Math.ceil(allSymbols.length / BATCH_SIZE);

    const start = batchIndex * BATCH_SIZE;
    const end = start + BATCH_SIZE;

    const symbols = allSymbols.slice(start, end);

    batchIndex = (batchIndex + 1) % totalBatches;

    const results = [];

    const now = new Date();
    const period2 = Math.floor(now.getTime() / 1000);

    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 1);
    const period1 = Math.floor(startTime.getTime() / 1000);

    for (const symbol of symbols) {
      try {
        const data: any = await yahooFinance.chart(`${symbol}.NS`, {
          interval: "5m",
          period1,
          period2,
        });

        const quotes = data?.indicators?.quote?.[0];
        const timestamps = data?.timestamp;

        if (!quotes || !timestamps) continue;

        const candles = timestamps
          .map((t: number, i: number) => ({
            time: t,
            open: quotes.open[i],
            close: quotes.close[i],
            high: quotes.high[i],
            low: quotes.low[i],
            volume: quotes.volume[i],
          }))
          .filter(
            (c) =>
              c.open != null &&
              c.close != null &&
              c.high != null &&
              c.low != null
          );

        if (candles.length < 10) continue;

        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const first = candles[0];

        const change =
          ((last.close - first.open) / first.open) * 100;

        // 🔥 Filters
        if (Math.abs(change) < 0.5) continue;
        if ((last.volume || 0) < 500000) continue;

        /* ================= VOLUME ================= */

        const volumes = candles.map((c) => c.volume || 0);
        const avgVol =
          volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;

        const volumeSpike = last.volume > avgVol * 1.8;

        /* ================= SUPPORT / RES ================= */

        const recent = candles.slice(-5);
        const resistance = Math.max(...recent.map((c) => c.high));
        const support = Math.min(...recent.map((c) => c.low));

        /* ================= RSI ================= */

        let gain = 0,
          loss = 0;
        for (let i = candles.length - 10; i < candles.length - 1; i++) {
          const diff = candles[i + 1].close - candles[i].close;
          if (diff > 0) gain += diff;
          else loss -= diff;
        }

        const rs = gain / (loss || 1);
        const rsi = 100 - 100 / (1 + rs);

        /* ================= ENTRY LOGIC ================= */

        let signal = "HOLD";

        if (
          prev.close <= resistance &&
          last.close > resistance &&
          volumeSpike &&
          rsi > 55
        ) {
          signal = "STRONG BUY";
        } else if (
          prev.close >= support &&
          last.close < support &&
          volumeSpike &&
          rsi < 45
        ) {
          signal = "STRONG SELL";
        } else if (last.close > resistance * 0.995) {
          signal = "WATCH BUY";
        } else if (last.close < support * 1.005) {
          signal = "WATCH SELL";
        }

        results.push({
          symbol,
          candles,
          change,
          volumeSpike,
          signal,
          rsi,
          resistance,
          support,
        });
      } catch (err) {
        console.error("Symbol error:", symbol);
      }
    }

    const lastCandleTime =
      results[0]?.candles?.slice(-1)[0]?.time || null;

    return NextResponse.json({
      data: results,
      batch: batchIndex,
      totalBatches,
      marketStatus: getMarketStatus(),
      lastCandleTime,
    });
  } catch (err: any) {
    console.error("SCAN ERROR:", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}