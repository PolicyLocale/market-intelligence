"use client";

import { useState, useCallback, useMemo } from "react";

type ViewMode = "momentum" | "bounce" | "intraday";

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("momentum");

  /* ✅ WORKING CONNECTIVITY — UNCHANGED */
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
          range: [0, 50],
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

  /* ✅ UI-ONLY INTELLIGENCE */
  const filteredStocks = useMemo(() => {
    return stocks
      .map((row) => {
        const d = row.d ?? [];
        const price = Number(d[1] ?? 0);
        const change = Number(d[2] ?? 0);
        const volume = Number(d[3] ?? 0);

        // Buy/Sell volume inference
        const buyVolume = change >= 0 ? volume * 0.6 : volume * 0.4;
        const sellVolume = volume - buyVolume;

        const probability = Math.min(
          100,
          Math.max(
            0,
            Math.round(Math.abs(change) * 15 + (volume / 1_000_000) * 20)
          )
        );

        const signal = probability >= 75 ? "STRONG BUY" : "BUY";
        const target = price * (1 + probability / 200);
        const stopLoss = price * (1 - probability / 300);

        return {
          symbol: row.s,
          price,
          change,
          volume,
          buyVolume,
          sellVolume,
          probability,
          signal,
          target,
          stopLoss,
        };
      })
      /* ✅ FILTER: REMOVE STOCKS WITH ZERO BUY VOLUME */
      .filter((s) => s.buyVolume > 0)
      /* VIEW-WISE FILTERING */
      .filter((s) => {
        if (view === "momentum") return s.change > 0;
        if (view === "bounce") return s.change < 0 && s.probability >= 50;
        if (view === "intraday")
          return Math.abs(s.change) >= 1.5 && s.volume > 1_000_000;
        return true;
      })
      /* SORTING */
      .sort((a, b) => {
        if (view === "momentum") return b.probability - a.probability;
        return Math.abs(b.change) - Math.abs(a.change);
      });
  }, [stocks, view]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Anto&apos;s Market Engine
        </h1>
        <button
          onClick={scanStocks}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          Scan / Refresh
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Tab label="🚀 Top Momentum" active={view === "momentum"} onClick={() => setView("momentum")} />
        <Tab label="🔁 Bounce Candidates" active={view === "bounce"} onClick={() => setView("bounce")} />
        <Tab label="⚡ Intraday Movers" active={view === "intraday"} onClick={() => setView("intraday")} />
      </div>

      {/* Status */}
      {loading && <p className="text-zinc-400 mb-4">Scanning market…</p>}
      {error && <p className="text-red-400 mb-4">Error: {error}</p>}
      {!loading && !error && filteredStocks.length === 0 && (
        <p className="text-zinc-500">No stocks match this scan</p>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {filteredStocks.map((s, idx) => (
          <div
            key={idx}
            className={`bg-zinc-900 border border-zinc-800 rounded p-3 text-xs space-y-1 relative ${
              s.probability === 100 ? "ring-2 ring-yellow-400" : ""
            }`}
          >
            {/* Badge for 100% confidence */}
            {s.probability === 100 && (
              <span className="absolute top-1 right-1 bg-yellow-400 text-black px-1 text-[9px] font-bold rounded-full">
                100%
              </span>
            )}

            {/* Line 1 */}
            <div className="flex justify-between font-semibold">
              <span>
                {s.symbol}{" "}
                <span className={s.change >= 0 ? "text-green-400" : "text-red-400"}>
                  ({s.change >= 0 ? "+" : ""}
                  {s.change.toFixed(2)}%)
                </span>
              </span>
              <span className={s.signal === "STRONG BUY" ? "text-green-400" : "text-green-300"}>
                {s.signal} • {s.probability}%
              </span>
            </div>

            {/* Line 2 */}
            <div className="flex justify-between text-zinc-300">
              <span>₹ {s.price.toFixed(2)}</span>
              <span className="text-green-400">T: {s.target.toFixed(2)}</span>
              <span className="text-red-400">SL: {s.stopLoss.toFixed(2)}</span>
            </div>

            {/* Line 3 */}
            <div className="flex justify-between text-zinc-400">
              <span>Vol: {(s.volume / 1000).toFixed(0)}K</span>
              <span className="text-green-400">B.Vol: {(s.buyVolume / 1000).toFixed(0)}K</span>
              <span className="text-red-400">S.Vol: {(s.sellVolume / 1000).toFixed(0)}K</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Tab Component */
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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