"use client";

import { useState } from "react";

type Stock = {
  d: any[];
  benchmark?: string;
  score?: number;
  breakout?: boolean;
};

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [niftyChange, setNiftyChange] = useState<number>(0);

  async function fetchData(type: string) {
    setLoading(true);

    const sortOrder = type === "losers" ? "asc" : "desc";

    try {
      // Fetch NIFTY change %
      const niftyPayload = {
        symbols: { tickers: ["NSE:NIFTY"], query: { types: [] } },
        columns: ["change"],
      };

      const niftyRes = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(niftyPayload),
      });

      const niftyData = await niftyRes.json();
      const niftyValue = niftyData.data?.[0]?.d?.[0] ?? 0;
      setNiftyChange(niftyValue);

      // Fetch stock data
      const payload = {
        filter: [{ left: "exchange", operation: "equal", right: "NSE" }],
        options: { lang: "en" },
        symbols: { query: { types: [] }, tickers: [] },
        columns: ["name", "close", "change", "volume", "RSI"],
        sort: { sortBy: "change", sortOrder },
        range: [0, 50],
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      const updated = data.data.map((stock: any) => {
        const change = stock.d[2];
        const volume = stock.d[3];
        const rsi = stock.d[4];

        let score = 0;

        if (change > 2) score += 1;
        if (rsi > 55) score += 1;
        if (volume > 500000) score += 1;
        if (change > niftyValue) score += 1;

        const breakout =
          change > 3 &&
          rsi > 60 &&
          rsi < 75 &&
          volume > 800000;

        return {
          ...stock,
          benchmark:
            change > niftyValue ? "Above NIFTY" : "Below NIFTY",
          score,
          breakout,
        };
      });

      // Smart Ranking
      updated.sort((a: any, b: any) => b.score - a.score);

      setStocks(updated);
    } catch (error) {
      console.error("Error fetching data:", error);
    }

    setLoading(false);
  }

  return (
    <div className="bg-black min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold mb-2 text-green-400">
        Anto’s Market Intelligence
      </h1>

      <div className="text-sm text-gray-400 mb-6">
        NIFTY Change: {niftyChange}%
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => fetchData("gainers")}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          Top 50 Gainers
        </button>

        <button
          onClick={() => fetchData("losers")}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          Top 50 Losers
        </button>
      </div>

      {loading && <p className="text-yellow-400">Loading...</p>}

      <div className="grid gap-4">
        {stocks.map((stock, i) => (
          <div
            key={i}
            className="bg-gray-900 p-4 rounded-xl border border-gray-800"
          >
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg">
                {stock.d[0]}
              </div>

              <div
                className={
                  stock.d[2] > 0
                    ? "text-green-400 font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {stock.d[2]}%
              </div>
            </div>

            <div className="text-sm mt-2 text-gray-300">
              ₹ {stock.d[1]} | RSI: {stock.d[4]}
            </div>

            <div
              className={`mt-2 text-xs font-semibold ${
                stock.benchmark === "Above NIFTY"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {stock.benchmark}
            </div>

            {stock.score && stock.score >= 3 && (
              <div className="mt-2 text-xs text-yellow-400 font-bold">
                🔥 Momentum Strong
              </div>
            )}

            {stock.breakout && (
              <div className="mt-2 text-xs text-purple-400 font-bold">
                🚀 Possible Breakout
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}