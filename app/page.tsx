'use client'

import { useEffect, useState, useCallback } from 'react'

type Stock = {
  symbol: string
  name: string
  price: number
  changePercent: number
  strongBuyPercent: number
  growthProbability: number
  fairValue: number
  bounceMomentum: number
  totalVolume: number
  buyVolume: number
  sellVolume: number
  isIntradayMover: boolean
}

type Tab = 'GAINERS' | 'LOSERS' | 'INTRADAY'

export default function StocksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('GAINERS')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  /* 🔌 SERVER SCAN */
  const scanStocks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stocks/scan', { cache: 'no-store' })
      const data = await res.json()
      setStocks(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Scan failed', err)
      setStocks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scanStocks()
  }, [scanStocks])

  /* ---------------- FILTERING LOGIC ---------------- */

  const topGainers = stocks.filter(
    s =>
      s.strongBuyPercent >= 80 &&
      s.growthProbability >= 70 &&
      !s.isIntradayMover
  )

  const topLosers = stocks.filter(
    s =>
      s.price < s.fairValue &&
      s.bounceMomentum >= 70 &&
      s.strongBuyPercent >= 75
  )

  const intradayMovers = stocks.filter(s => s.isIntradayMover)

  const visibleStocks =
    activeTab === 'GAINERS'
      ? topGainers
      : activeTab === 'LOSERS'
      ? topLosers
      : intradayMovers

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* HEADER */}
        <header>
          <h1 className="text-2xl font-semibold">
            Anto&apos;s Market Engine
          </h1>
          <p className="text-sm text-gray-400">
            High-conviction market scanner
          </p>
        </header>

        {/* FILTER BAR */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <FilterTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {lastUpdated && (
              <span>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={scanStocks}
              disabled={loading}
              className="border border-gray-700 px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? 'Scanning…' : 'Scan / Refresh'}
            </button>
          </div>
        </div>

        {/* STOCK LIST */}
        <div className="space-y-4">
          {visibleStocks.map(stock => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}

          {!loading && visibleStocks.length === 0 && (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- FILTER TABS ---------------- */

function FilterTabs({
  activeTab,
  onChange,
}: {
  activeTab: Tab
  onChange: (tab: Tab) => void
}) {
  const cls = (tab: Tab) =>
    activeTab === tab
      ? 'border-b-2 border-white font-medium'
      : 'text-gray-400'

  return (
    <div className="flex gap-6 text-sm">
      <button onClick={() => onChange('GAINERS')} className={cls('GAINERS')}>
        Top Gainers
      </button>
      <button onClick={() => onChange('LOSERS')} className={cls('LOSERS')}>
        Top Losers
      </button>
      <button onClick={() => onChange('INTRADAY')} className={cls('INTRADAY')}>
        Intraday Movers
      </button>
    </div>
  )
}

/* ---------------- ENGAGING STOCK CARD ---------------- */

function StockCard({ stock }: { stock: Stock }) {
  const isGreen = stock.changePercent >= 0

  const buyPct =
    stock.totalVolume > 0
      ? Math.round((stock.buyVolume / stock.totalVolume) * 100)
      : 0

  const sellPct = 100 - buyPct

  const conviction =
    stock.strongBuyPercent >= 90
      ? 'HIGH'
      : stock.strongBuyPercent >= 80
      ? 'MEDIUM'
      : 'LOW'

  const glow =
    conviction === 'HIGH'
      ? isGreen
        ? 'shadow-[0_0_18px_rgba(34,197,94,0.35)]'
        : 'shadow-[0_0_18px_rgba(239,68,68,0.35)]'
      : ''

  return (
    <div
      className={`relative border rounded-lg p-4 bg-black transition-all duration-300
        ${isGreen ? 'border-green-700/40' : 'border-red-700/40'}
        ${glow}
        hover:scale-[1.01]
      `}
    >
      {/* SIGNAL STRIP */}
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-l
          ${isGreen ? 'bg-green-500' : 'bg-red-500'}
          ${conviction === 'HIGH' ? 'animate-pulse' : ''}
        `}
      />

      <div className="flex justify-between gap-4">
        {/* LEFT */}
        <div>
          <div className="font-semibold tracking-wide">
            {stock.symbol}{' '}
            <span className="text-sm text-gray-400">
              {stock.name}
            </span>
          </div>

          <div className="text-sm mt-1 flex items-center gap-2">
            <span className="text-white font-medium">
              ₹{stock.price}
            </span>
            <span
              className={`font-semibold flex items-center gap-1
                ${isGreen ? 'text-green-400' : 'text-red-400'}
              `}
            >
              {isGreen ? '▲ +' : '▼ '}
              {stock.changePercent}%
            </span>
          </div>

          {/* BUY / SELL VOLUME */}
          <div className="mt-3 text-xs text-gray-400">
            <div className="flex justify-between mb-1">
              <span className="text-green-400">Buy {buyPct}%</span>
              <span className="text-red-400">Sell {sellPct}%</span>
            </div>
            <div className="h-1.5 w-48 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${buyPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right text-sm min-w-[130px]">
          <div className="text-green-400 font-medium">
            Strong Buy {stock.strongBuyPercent}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Bounce {stock.bounceMomentum}%
          </div>

          <div
            className={`mt-2 inline-block text-[10px] px-2 py-0.5 rounded
              ${
                conviction === 'HIGH'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-gray-800 text-gray-400'
              }
            `}
          >
            {conviction} CONVICTION
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- EMPTY STATE ---------------- */

function EmptyState() {
  return (
    <div className="text-center text-sm text-gray-400 italic py-8">
      No stocks match this scan
    </div>
  )
}