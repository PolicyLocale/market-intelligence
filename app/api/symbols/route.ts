export const runtime = "nodejs";

import { NextResponse } from "next/server";

let cachedSymbols: string[] = [];
let lastFetch = 0;

export async function GET() {
  try {
    const now = Date.now();

    if (cachedSymbols.length && now - lastFetch < 60 * 60 * 1000) {
      return NextResponse.json({ symbols: cachedSymbols });
    }

    const res = await fetch(
      "https://archives.nseindia.com/content/indices/ind_nifty500list.csv",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const text = await res.text();

    const symbols = text
      .split("\n")
      .slice(1)
      .map((l) => l.split(",")[2])
      .filter(Boolean);

    cachedSymbols = symbols;
    lastFetch = now;

    return NextResponse.json({ symbols });
  } catch (err) {
    console.error("SYMBOL FETCH ERROR:", err);

    // fallback (so UI never breaks)
    return NextResponse.json({
      symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN"],
    });
  }
}