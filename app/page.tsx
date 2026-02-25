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
  intraday: boolean;
};

export default function Home() {
  const [strategy, setStrategy] = useState("all");
  const [sector, setSector] = useState("ALL");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [niftyChange, setNiftyChange] = useState(0);
  const [sortBy, setSortBy] = useState<"gainers" | "losers" | "intraday">(
    "gainers"
  );

  const round = (n: number | null | undefined) => {
    if (n === null || n === undefined || isNaN(n)) return 0;
    return Number(n.toFixed(2));
  };

  useEffect(() => {
    if ("Notification" in window) Notification.requestPermission();
  }, []);

  const sendNotification = (stock: Stock) => {
    if (Notification.permission === "granted") {
      new Notification(`🚀 STRONG BUY: ${stock.name}`, {
        body: `Target ₹${stock.target} | SL ₹${stock.stopLoss}`,
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setStocks([]);

    try {
      // Fetch NIFTY change
      const niftyRes = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({
          symbols: { tickers: ["NSE:NIFTY"], query: { types: [] } },
          columns: ["change"],
        }),
      });

      const niftyData = await niftyRes.json();
      const niftyVal = round(niftyData?.data?.[0]?.d?.[0] ?? 0);
      setNiftyChange(niftyVal);

      const columns = ["name", "close", "change", "volume", "RSI", "sector"];

      const payload = {
        filter: [
          { left: "exchange", operation: "equal", right: "NSE" },
          ...(sector !== "ALL"
            ? [{ left: "sector", operation: "equal", right: sector }]
            : []),
        ],
        symbols: { query: { types: [] }, tickers: [] },
        columns,
        sort: {
          sortBy: sortBy === "gainers" ? "change" : "change",
          sortOrder: sortBy === "gainers" ? "desc" : "asc",
        },
        range: [0, 50],
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data || !data.data || !Array.isArray(data.data)) {
        console.warn("Empty/Invalid API response:", data);
        setLoading(false);
        return;
      }

      const processed: Stock[] = data.data
        .map((s: any) => {
          if (!s?.d) return null;

          const name = s.d[0] ?? "Unknown";
          const close = round(s.d[1]);
          const change = round(s.d[2]);
          const volume = s.d[3] ?? 0;
          const rsi = round(s.d[4]);
          const sectorName = s.d[5] || "Unknown";

          if (close === 0 && change === 0) return null;

          // Probability & signal calculation
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
          } else if (strategy === "aggressive") {
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

          const intraday = change >= 2 && volume > 500000;

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
            intraday,
          };

          if (signal === "STRONG BUY") sendNotification(stock);

          return stock;
        })
        // ✅ TypeScript-safe filter
        .filter((s): s is Stock => s !== null);

      // Filter intraday if selected
      const finalList =
        sortBy === "intraday" ? processed.filter((s) => s.intraday) : processed;

      setStocks(finalList);
    } catch (err) {
      console.error("Fetch error:", err);
      setStocks([]);
    }

    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-green-400">🚀 Anto's Market Engine</h1>
        <button
          onClick={fetchData}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 font-bold"
        >
          🔍 Scan & Refresh
        </button>
      </div>

      <div className="text-gray-400 mb-4">NIFTY Change: {niftyChange}%</div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="bg-gray-800 px-3 py-2 rounded"
        >
          <option value="all">All Strategies</option>
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

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "gainers" | "losers" | "intraday")
          }
          className="bg-gray-800 px-3 py-2 rounded"
        >
          <option value="gainers">Top Gainers</option>
          <option value="losers">Top Losers</option>
          <option value="intraday">Intraday Movers</option>
        </select>
      </div>

      {loading && <p className="text-yellow-400">Scanning market...</p>}

      <div className="grid gap-5">
        {stocks.length === 0 && !loading && (
          <p className="text-gray-300">No results available</p>
        )}

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

            <div className="text-sm text-gray-400 mt-1">
              ₹{s.close} | Volume: {s.volume.toLocaleString()} | Sector: {s.sector} | RSI: {s.rsi}{" "}
              {s.intraday && <span className="text-yellow-400 font-bold">| Intraday</span>}
            </div>

            <div className="mt-2">
              📊 Probability:{" "}
              <span
                className={
                  s.probability >= 75
                    ? "text-green-400 font-bold"
                    : s.probability >= 60
                    ? "text-yellow-400 font-bold"
                    : "text-red-400 font-bold"
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