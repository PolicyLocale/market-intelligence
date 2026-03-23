"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type Trade = {
  symbol: string;
  signal: string;
  entry: number;
  target: number;
  sl: number;
  price?: number;
};

export default function Page() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const prevSignals = useRef<Record<string, string>>({});

  /* =========================
     🔁 MAIN SCAN (5 MIN)
  ========================= */

  const scan = useCallback(async () => {
    const res = await fetch("/api/scan", {
      method: "POST",
      body: JSON.stringify({
        symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN"],
      }),
    });

    const json = await res.json();

    const processed = (json.data || [])
      .map((s: any) => {
        const result = analyze(s.candles);
        const levels = getLevels(s.candles, result.signal);
        const score = getScore(result, s.candles);

        return {
          symbol: s.symbol,
          ...result,
          ...levels,
          score,
        };
      })
      .filter((s: any) => s.signal !== "HOLD")
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    triggerAlerts(processed);
    setTrades(processed);
  }, []);

  /* =========================
     ⚡ LIVE PRICE (5 SEC)
  ========================= */

  const updatePrices = useCallback(async () => {
    if (!trades.length) return;

    const res = await fetch("/api/price", {
      method: "POST",
      body: JSON.stringify({
        symbols: trades.map((t) => t.symbol),
      }),
    });

    const json = await res.json();

    setTrades((prev) =>
      prev.map((t) => {
        const live = json.data.find(
          (d: any) => d.symbol === t.symbol
        );

        if (!live) return t;

        const newPrice = live.price;

        /* 🔥 TRAILING SL */
        let newSL = t.sl;

        if (t.signal.includes("BUY") && newPrice > t.entry) {
          newSL = Math.max(t.sl, newPrice * 0.995);
        }

        if (t.signal.includes("SELL") && newPrice < t.entry) {
          newSL = Math.min(t.sl, newPrice * 1.005);
        }

        return {
          ...t,
          price: newPrice,
          sl: newSL,
        };
      })
    );
  }, [trades]);

  /* =========================
     🔁 INTERVALS
  ========================= */

  useEffect(() => {
    scan();

    const scanInterval = setInterval(scan, 300000);
    const priceInterval = setInterval(updatePrices, 5000);

    return () => {
      clearInterval(scanInterval);
      clearInterval(priceInterval);
    };
  }, [scan, updatePrices]);

  /* =========================
     📊 INDICATORS
  ========================= */

  function calculateVWAP(c: any[]) {
    let tpv = 0,
      vol = 0;
    c.forEach((x) => {
      const tp = (x.high + x.low + x.close) / 3;
      tpv += tp * x.volume;
      vol += x.volume;
    });
    return tpv / vol;
  }

  function calculateRSI(c: any[]) {
    let g = 0,
      l = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i].close - c[i - 1].close;
      if (d > 0) g += d;
      else l -= d;
    }
    const rs = g / (l || 1);
    return 100 - 100 / (1 + rs);
  }

  /* =========================
     🧠 STRATEGY
  ========================= */

  function analyze(c: any[]) {
    const l5 = c.slice(-5);
    const last = l5[l5.length - 1];
    const prev = l5[l5.length - 2];

    const vwap = calculateVWAP(c);
    const rsi = calculateRSI(c);

    const highs = l5.map((x) => x.high);
    const lows = l5.map((x) => x.low);

    const res = Math.max(...highs);
    const sup = Math.min(...lows);

    if (last.close > res && rsi > 55)
      return { signal: "BREAKOUT BUY", vwap, rsi };

    if (last.close < sup && rsi < 45)
      return { signal: "BREAKDOWN SELL", vwap, rsi };

    if (prev.close < vwap && last.close > vwap)
      return { signal: "VWAP BUY", vwap, rsi };

    if (prev.close > vwap && last.close < vwap)
      return { signal: "VWAP SELL", vwap, rsi };

    return { signal: "HOLD", vwap, rsi };
  }

  function getLevels(c: any[], signal: string) {
    const last = c[c.length - 1];

    if (signal.includes("BUY"))
      return {
        entry: last.close,
        target: last.close * 1.01,
        sl: last.low,
      };

    if (signal.includes("SELL"))
      return {
        entry: last.close,
        target: last.close * 0.99,
        sl: last.high,
      };

    return {};
  }

  function getScore(a: any, c: any[]) {
    let s = 0;
    if (a.signal.includes("BREAKOUT")) s += 50;
    if (a.signal.includes("VWAP")) s += 40;
    s += Math.abs(a.rsi - 50);
    s += Math.log10(c[c.length - 1].volume || 1) * 10;
    return s;
  }

  /* =========================
     🔔 ALERTS
  ========================= */

  function triggerAlerts(stocks: any[]) {
    stocks.forEach((s) => {
      if (prevSignals.current[s.symbol] !== s.signal) {
        new Audio(
          "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
        ).play();

        prevSignals.current[s.symbol] = s.signal;
      }
    });
  }

  /* =========================
     🎨 UI
  ========================= */

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1 className="text-xl font-bold mb-4">
        🚀 Live Intraday Engine
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trades.map((t, i) => (
          <div
            key={i}
            className="bg-zinc-900 p-4 rounded border ring-2 ring-yellow-400"
          >
            <div className="flex justify-between">
              <strong>{t.symbol}</strong>
              <span
                className={
                  t.signal.includes("BUY")
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {t.signal}
              </span>
            </div>

            <div>Live: ₹{t.price?.toFixed(2) || t.entry}</div>

            <div className="text-green-400">
              Target: ₹{t.target.toFixed(2)}
            </div>

            <div className="text-red-400">
              SL (Trailing): ₹{t.sl.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}