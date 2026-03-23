"use client";

import { useState, useCallback, useMemo } from "react";

type ViewMode = "gainers" | "losers" | "intraday";

type Candle = {
  open: number;
  close: number;
};

/* 🔥 SIMULATED 5-CANDLE BUILDER (Replace with real API later) */
function buildCandles(change: number, price: number): Candle[] {
  const candles: Candle[] = [];

  let base = price * (1 - change / 100);

  for (let i = 0; i < 5; i++) {
    const volatility = (Math.random() - 0.5) * 0.5;
    const open = base;
    const close = base * (1 + volatility / 100);

    candles.push({ open, close });
    base = close;
  }

  return candles;
}

/* 🧠 CANDLE ANALYSIS */
function analyzeCandles(candles: Candle[]) {
  const colors = candles.map((c) =>
    c.close > c.open ? "GREEN" : "RED"
  );

  const last = colors.slice(-2);

  if (last[0] === "RED" && last[1] === "GREEN") {
    return "REVERSAL_UP";
  }

  if (last[0] === "GREEN" && last[1] === "RED") {
    return "REVERSAL_DOWN";
  }

  const greenCount = colors.filter((c) => c === "GREEN").length;
  const redCount = colors.filter((c) => c === "RED").length;

  if (greenCount >= 4) return "STRONG_UP";
  if (redCount >= 4) return "STRONG_DOWN";

  return "SIDEWAYS";
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("intraday");

  /* ✅ FETCH */
  const scanStocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: [],
          markets: ["india"],
          columns: ["name", "close", "change", "volume"],
          range: [0, 100],
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Scan failed ${res.status}`);

      const data = JSON.parse(text);
      setStocks(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 🔥 CORE ENGINE */
  const processed = useMemo(() => {
    return stocks
      .map((row) => {
        const d = row.d ?? [];
        const price = Number(d[1] ?? 0);
        const change = Number(d[2] ?? 0);
        const volume = Number(d[3] ?? 0);

        /* 🎯 BUILD CANDLES */
        const candles = buildCandles(change, price);

        /* 🧠 ANALYZE */
        const trend = analyzeCandles(candles);

        /* 📊 MOMENTUM SCORE */
        const score =
          Math.abs(change) * 30 + Math.log10(volume + 1) * 20;

        /* 🚀 SIGNAL ENGINE */
        let signal = "HOLD";

        if (trend === "REVERSAL_UP" && score > 50)
          signal = "BUY";

        if (trend === "STRONG_UP" && score > 70)
          signal = "STRONG BUY";

        if (trend === "REVERSAL_DOWN" && score > 50)
          signal = "SELL";

        if (trend === "STRONG_DOWN" && score > 70)
          signal = "STRONG SELL";

        /* 🎯 TARGET + SL */
        const target =
          signal.includes("BUY")
            ? price * (1 + Math.abs(change) / 100 * 1.5)
            : price * (1 - Math.abs(change) / 100 * 1.5);

        const stopLoss =
          signal.includes("BUY")
            ? price * (1 - Math.abs(change) / 100)
            : price * (1 + Math.abs(change) / 100);

        return {
          symbol: row.s,
          price,
          change,
          volume,
          trend,
          signal,
          score,
          target,
          stopLoss,
        };
      })

      /* 🔒 QUALITY FILTER */
      .filter((s) => s.volume > 500000 && Math.abs(s.change) > 0.5)

      /* 🎯 VIEW FILTER */
      .filter((s) => {
        if (view === "gainers") return s.change > 0;

        if (view === "losers") return s.change < 0;

        if (view === "intraday")
          return (
            s.signal === "STRONG BUY" ||
            s.signal === "STRONG SELL"
          );

        return true;
      })

      /* 📊 SORT */
      .sort((a, b) => {
        if (view === "gainers") return b.change - a.change;
        if (view === "losers") return a.change - b.change;
        return b.score - a.score;
      });
  }, [stocks, view]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Anto&apos;s Pro Trading Engine
        </h1>
        <button
          onClick={scanStocks}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          Scan Market
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Tab label="🟢 Gainers" active={view === "gainers"} onClick={() => setView("gainers")} />
        <Tab label="🔴 Losers" active={view === "losers"} onClick={() => setView("losers")} />
        <Tab label="⚡ Intraday" active={view === "intraday"} onClick={() => setView("intraday")} />
      </div>

      {/* Status */}
      {loading && <p className="text-zinc-400">Scanning...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {processed.map((s, i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs space-y-1"
          >
            <div className="flex justify-between font-semibold">
              <span>
                {s.symbol}{" "}
                <span className={s.change > 0 ? "text-green-400" : "text-red-400"}>
                  ({s.change.toFixed(2)}%)
                </span>
              </span>

              <span
                className={
                  s.signal.includes("BUY")
                    ? "text-green-400"
                    : s.signal.includes("SELL")
                    ? "text-red-400"
                    : "text-zinc-400"
                }
              >
                {s.signal}
              </span>
            </div>

            <div className="text-zinc-400">
              Trend: {s.trend}
            </div>

            <div className="flex justify-between">
              <span>₹ {s.price.toFixed(2)}</span>
              <span className="text-green-400">
                T: {s.target.toFixed(2)}
              </span>
              <span className="text-red-400">
                SL: {s.stopLoss.toFixed(2)}
              </span>
            </div>

            <div className="text-zinc-500">
              Vol: {(s.volume / 1000).toFixed(0)}K
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded text-sm border ${
        active
          ? "bg-green-600 border-green-500"
          : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}