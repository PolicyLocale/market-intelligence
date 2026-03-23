import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    const results = [];

    for (const symbol of symbols) {
      const quote: any = await yahooFinance.quote(`${symbol}.NS`);

      results.push({
        symbol,
        price: quote.regularMarketPrice,
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