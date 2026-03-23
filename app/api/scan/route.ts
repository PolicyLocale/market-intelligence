import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    const results = [];

    for (const symbol of symbols) {
      const query = `${symbol}.NS`;

      const data: any = await yahooFinance.chart(query, {
        interval: "5m",
        range: "1d",
      });

      const quotes = data?.indicators?.quote?.[0];
      const timestamps = data?.timestamp;

      if (!quotes || !timestamps) continue;

      const candles = timestamps.map((t: number, i: number) => ({
        time: t,
        open: quotes.open[i],
        close: quotes.close[i],
        high: quotes.high[i],
        low: quotes.low[i],
        volume: quotes.volume[i],
      }));

      results.push({
        symbol,
        candles,
      });
    }

    return NextResponse.json({ data: results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}