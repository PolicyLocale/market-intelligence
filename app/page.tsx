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
      const res = await fetch('/api/stocks/scan', {
        cache: 'no-store',
      })
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

  /* Initial load */
  useEffect(() => {
    scanStocks()
  }, [scanStocks])

  /* ---------------- FILTERING ---------------- */

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

  const intradayMovers = stocks.filter(
    s => s.isIntradayMover
  )

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
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Anto&apos;s Market Engine
          </h1>
          <p className="text-sm text-gray-400">
            High-conviction scans · Zero noise
          </p>
        </header>

        {/* FILTER BAR + SCAN */}
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

        {/* CONTENT */}
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

/* ---------------- STOCK CARD ---------------- */

function StockCard({ stock }: { stock: Stock }) {
  const buyPct =
    stock.totalVolume > 0
      ? Math.round((stock.buyVolume / stock.totalVolume) * 100)
      : 0

  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-black">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">
            {stock.symbol}{' '}
            <span className="text-sm text-gray-400">
              {stock.name}
            </span>
          </div>
          <div className="text-sm">
            ₹{stock.price}{' '}
            <span
              className={
                stock.changePercent >= 0
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {stock.changePercent}%
            </span>
          </div>
        </div>

        <div className="text-right text-sm">
          <div className="text-green-500">
            Strong Buy {stock.strongBuyPercent}%
          </div>
          <div className="text-xs text-gray-400">
            Bounce {stock.bounceMomentum}%
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- STATES ---------------- */

function EmptyState() {
  return (
    <div className="text-center text-sm text-gray-400 italic py-8">
      No stocks match this scan
    </div>
  )
}