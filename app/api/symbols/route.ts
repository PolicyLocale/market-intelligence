export const runtime = "nodejs";

import { NextResponse } from "next/server";

let cachedSymbols: string[] = [];
let lastFetch = 0;

export async function GET() {
  try {
    const now = Date.now();

    // ✅ Cache for 1 hour
    if (cachedSymbols.length && now - lastFetch < 60 * 60 * 1000) {
      return NextResponse.json({ symbols: cachedSymbols });
    }

    const url =
      "https://archives.nseindia.com/content/indices/ind_nifty500list.csv";

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const text = await res.text();

    const lines = text.split("\n").slice(1);

    const symbols = lines
      .map((line) => line.split(",")[2])
      .filter(Boolean);

    cachedSymbols = symbols;
    lastFetch = now;

    return NextResponse.json({ symbols });
  } catch (err) {
    console.error("SYMBOL FETCH ERROR:", err);

    return NextResponse.json({ symbols: [] });
  }
}