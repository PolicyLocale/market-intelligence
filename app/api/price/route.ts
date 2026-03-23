export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbols = body?.symbols;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: "Invalid symbols input" },
        { status: 400 }
      );
    }

    const results = [];

    for (const symbol of symbols) {
      try {
        const quote: any = await yahooFinance.quote(`${symbol}.NS`);

        results.push({
          symbol,
          price: quote?.regularMarketPrice ?? null,
        });
      } catch (err) {
        console.error("Price error:", symbol, err);
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: any) {
    console.error("PRICE API ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}