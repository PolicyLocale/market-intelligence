"use client";

import { useState, useEffect } from "react";

type Stock = {
  name: string;
  close: number;
  change: number;
  volume: number;
  rsi: number;
  probability: number;
  target: number;
  stopLoss: number;
  signal: string;
  sector: string;
};

export default function Home() {
  const [strategy, setStrategy] = useState("balanced");
  const [sector, setSector] = useState("ALL");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [niftyChange, setNiftyChange] = useState(0);

  const round = (n: number) => Number(n.toFixed(2));

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (stock: Stock) => {
    if (Notification.permission === "granted") {
      new Notification(`🚀 STRONG BUY: ${stock.name}`, {
        body: `Target ₹${stock.target} | SL ₹${stock.stopLoss}`,
      });
    }
  };

  async function fetchData() {
    setLoading(true);
    setStocks([]);

    try {
      // 1️⃣ Get NIFTY change
      const niftyRes = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({
          symbols: { tickers: ["NSE:NIFTY"], query: { types: [] } },
          columns: ["change"],
        }),
      });

      const niftyData = await niftyRes.json();
      const niftyVal = niftyData?.data?.[0]?.d?.[0] ?? 0;
      setNiftyChange(round(niftyVal));

      // 2️⃣ Get NSE Stocks
      const payload = {
        filter: [
          { left: "exchange", operation: "equal", right: "NSE" },
        ],
        symbols: { query: { types: [] }, tickers: [] },
        columns: ["name", "close", "change", "volume", "RSI", "sector"],
        sort: { sortBy: "change", sortOrder: "desc" },
        range: [0, 50],
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data?.data) {
        console.error("Invalid API response:", data);
        setLoading(false);
        return;
      }

      const processed = data.data.map((s: any) => {
        const name = s.d[0];
        const close = round(s.d[1]);
        const change = round(s.d[2]);
        const volume = s.d[3];
        const rsi = round(s.d[4]);
        const sectorName = s.d[5] || "Unknown";

        let score = 0;

        if (change > 3) score += 20;
        if (volume > 1000000) score += 20;
        if (rsi > 55) score += 20;
        if (change > niftyVal) score += 20;
        if (rsi > 60) score += 20;

        let targetMultiplier = 1.08;
        let stopMultiplier = 0.94;

        if (strategy === "conservative") {
          targetMultiplier = 1.05;
          stopMultiplier = 0.97;
          score += 5;
        }

        if (strategy === "aggressive") {
          targetMultiplier = 1.15;
          stopMultiplier = 0.90;
          score -= 5;
        }

        const probability = round(score);
        const target = round(close * targetMultiplier);
        const stopLoss = round(close * stopMultiplier);

        let signal = "HOLD";
        if (probability >= 75) signal = "STRONG BUY";
        else if (probability >= 60) signal = "BUY";
        else if (probability < 40) signal = "SELL";

        const stock: Stock = {
          name,
          close,
          change,
          volume,
          rsi,
          probability,
          target,
          stopLoss,
          signal,
          sector: sectorName,
        };

        if (signal === "STRONG BUY") {
          sendNotification(stock);
        }

        return stock;
      });

      processed.sort((a, b) => b.probability - a.probability);
      setStocks(processed);

    } catch (err) {
      console.error("Error:", err);
    }

    setLoading(false);
  }

  return (
    <div className="bg-black min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold text-green-400 mb-3">
        🚀 AI Market Engine (Stable)
      </h1>

      <div className="text-gray-400 mb-4">
        NIFTY Change: {niftyChange}%
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="bg-gray-800 px-3 py-2 rounded"
        >
          <option value="conservative">Conservative</option>
          <option value="balanced">Balanced</option>
          <option value="aggressive">Aggressive</option>
        </select>

        <button
          onClick={fetchData}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          Scan Market
        </button>
      </div>

      {loading && <p className="text-yellow-400">Scanning market...</p>}

      <div className="grid gap-5">
        {stocks.map((s, i) => (
          <div key={i} className="bg-gray-900 p-5 rounded-2xl border border-gray-800">
            <div className="flex justify-between">
              <div className="font-bold text-lg">{s.name}</div>
              <div className={s.change > 0 ? "text-green-400" : "text-red-400"}>
                {s.change}%
              </div>
            </div>

            <div className="text-sm text-gray-400">
              ₹{s.close} | RSI: {s.rsi}
            </div>

            <div className="mt-2">
              📊 Probability:{" "}
              <span className="text-green-400 font-bold">
                {s.probability}%
              </span>
            </div>

            <div className="mt-3 bg-gray-800 p-3 rounded">
              🎯 Target: ₹{s.target}
              <br />
              🛑 Stop: ₹{s.stopLoss}
            </div>

            <div className="mt-2 font-bold">
              Signal:{" "}
              <span className="text-green-400">
                {s.signal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}