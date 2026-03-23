"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function Page() {
  const [trades, setTrades] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [movers, setMovers] = useState<any[]>([]);
  const [batchInfo, setBatchInfo] = useState("");
  const [marketStatus, setMarketStatus] = useState("");
  const [lastCandle, setLastCandle] = useState("");

  const isFetching = useRef(false);

  const scan = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const json = await res.json();

      setBatchInfo(`Batch ${json.batch}/${json.totalBatches}`);
      setMarketStatus(json.marketStatus);

      if (json.lastCandleTime) {
        const date = new Date(json.lastCandleTime * 1000);
        setLastCandle(date.toLocaleTimeString());
      }

      const strong = json.data
        .filter((s:any) =>
          ["STRONG BUY","STRONG SELL"].includes(s.signal)
        )
        .slice(0,3);

      const watch = json.data
        .filter((s:any) => s.signal.includes("WATCH"))
        .slice(0,5);

      const movers = json.data
        .sort((a:any,b:any)=> Math.abs(b.change) - Math.abs(a.change))
        .slice(0,5);

      setTrades(prev => [...prev, ...strong].slice(0,10));
      setWatchlist(watch);
      setMovers(movers);

    } catch (err) {
      console.error(err);
    }

    isFetching.current = false;
  }, []);

  useEffect(() => {
    scan();
    const i = setInterval(scan, 300000);
    return () => clearInterval(i);
  }, []);

  const Card = ({s}:{s:any}) => (
    <div className="bg-zinc-900 p-3 rounded text-xs">
      <div className="flex justify-between">
        <b>{s.symbol}</b>
        <span className={
          s.signal.includes("BUY")?"text-green-400":
          s.signal.includes("SELL")?"text-red-400":"text-yellow-400"
        }>
          {s.signal}
        </span>
      </div>

      <div>RSI: {s.rsi?.toFixed(1)}</div>

      <div>
        Break: {s.signal.includes("BUY")
          ? s.resistance?.toFixed(2)
          : s.support?.toFixed(2)}
      </div>

      <div className="text-green-400">
        Vol: {s.volumeSpike ? "SPIKE" : "Normal"}
      </div>

      <div className={s.change >= 0 ? "text-green-400" : "text-red-400"}>
        {s.change?.toFixed(2)}%
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-black text-white min-h-screen space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">📊 Trading Engine</h1>

        <div className="text-right text-xs">
          <div className={
            marketStatus === "OPEN"
              ? "text-green-400"
              : "text-red-400"
          }>
            Market: {marketStatus}
          </div>

          <div className="text-zinc-400">
            Last Candle: {lastCandle || "-"}
          </div>

          <div className="text-zinc-500">
            {batchInfo}
          </div>
        </div>
      </div>

      <Section title="🔥 Confirmed Trades">
        {trades.map((s,i)=><Card key={i} s={s}/>)}
      </Section>

      <Section title="👀 Watchlist">
        {watchlist.map((s,i)=><Card key={i} s={s}/>)}
      </Section>

      <Section title="🚀 Active Movers">
        {movers.map((s,i)=><Card key={i} s={s}/>)}
      </Section>

    </div>
  );
}

function Section({title,children}:{title:string,children:any}){
  return (
    <div>
      <h2 className="mb-2">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}