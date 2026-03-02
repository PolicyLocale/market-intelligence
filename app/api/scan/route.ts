import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const tvResponse = await fetch(
      "https://scanner.tradingview.com/india/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify(body),
      }
    );

    const text = await tvResponse.text();

    // 🔍 HARD LOG — THIS IS CRITICAL
    console.log("TradingView status:", tvResponse.status);
    console.log("TradingView response:", text.slice(0, 300));

    if (!tvResponse.ok) {
      return NextResponse.json(
        { error: "TradingView rejected request", raw: text },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Route crash:", err);
    return NextResponse.json(
      { error: "Route crashed", message: err?.message },
      { status: 500 }
    );
  }
}