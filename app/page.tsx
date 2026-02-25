"use client";

import { useState, useEffect } from "react";

type Stock = {
  name: string;
  close: number;
  change: number;
  volume: number;
  rsi: number;
  weeklyRsi: number;
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

  // Enable browser notifications
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

    try {
      // Fetch NIFTY
      const niftyPayload = {
        symbols: { tickers: ["NSE:NIFTY"], query: { types: [] } },
        columns: ["change"],
      };

      const niftyRes = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(niftyPayload),
      });

      const niftyData = await niftyRes.json();
      const niftyVal = niftyData.data?.[0]?.d?.[0] ?? 0;
      setNiftyChange(round(niftyVal));

      // Fetch NSE Stocks
      const payload = {
        filter: [
          { left: "exchange", operation: "equal", right: "NSE" },
          ...(sector !== "ALL"
            ? [{ left: "sector", operation: "equal", right: sector }]
            : []),
        ],
        symbols: { query: { types: [] }, tickers: [] },
        columns: ["name", "close", "change", "volume", "RSI", "RSI|1W", "sector"],
        sort: { sortBy: "change", sortOrder: "desc" },
        range: [0, 50],
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      const processed = data.data.map((s: any) => {
        const name = s.d[0];
        const close = round(s.d[1]);
        const change = round(s.d[2]);
        const volume = s.d[3];
        const rsi = round(s.d[4]);
        const weeklyRsi = round(s.d[5]);
        const sectorName = s.d[6] || "Unknown";

        // Probability engine
        let score = 0;

        if (change > 3) score += 20;
        if (volume > 1000000) score += 20;
        if (rsi > 55) score += 20;
        if (weeklyRsi > 55) score += 20;
        if (change > niftyVal) score += 20;

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
          weeklyRsi,
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

      processed.sort((a: any, b: any) => b.probability - a.probability);
      setStocks(processed);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="bg-black min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold text-green-400 mb-3">
        🚀 AI Multi-Timeframe Engine
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

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="bg-gray-800 px-3 py-2 rounded"
        >
          <option value="ALL">All Sectors</option>
          <option value="Technology Services">IT</option>
          <option value="Finance">Finance</option>
          <option value="Consumer Non-Durables">FMCG</option>
          <option value="Energy Minerals">Energy</option>
          <option value="Health Technology">Healthcare</option>
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
          <div
            key={i}
            className="bg-gray-900 p-5 rounded-2xl border border-gray-800"
          >
            <div className="flex justify-between">
              <div className="font-bold text-lg">{s.name}</div>
              <div className={s.change > 0 ? "text-green-400" : "text-red-400"}>
                {s.change}%
              </div>
            </div>

            <div className="text-sm text-gray-400">
              ₹{s.close} | Sector: {s.sector}
            </div>

            <div className="text-sm mt-2">
              Daily RSI: {s.rsi} | Weekly RSI: {s.weeklyRsi}
            </div>

            <div className="mt-2">
              📊 Probability:{" "}
              <span
                className={
                  s.probability >= 75
                    ? "text-green-400 font-bold"
                    : s.probability >= 60
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
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
              <span
                className={
                  s.signal === "STRONG BUY"
                    ? "text-green-400"
                    : s.signal === "BUY"
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {s.signal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}