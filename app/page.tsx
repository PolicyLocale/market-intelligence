'use client'

import { useState } from 'react'

type Stock = {
  symbol: string
  name: string
  price: number
  changePercent: number
  strongBuyPercent: number
  growthProbability: number
  totalVolume: number
  buyVolume: number
  sellVolume: number
  isIntradayMover: boolean
}

/* ---------------- SIMULATED DATA ---------------- */

const STOCKS: Stock[] = [
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    price: 3895,
    changePercent: 2.4,
    strongBuyPercent: 86,
    growthProbability: 78,
    totalVolume: 1200000,
    buyVolume: 820000,
    sellVolume: 380000,
    isIntradayMover: false,
  },
  {
    symbol: 'INFY',
    name: 'Infosys',
    price: 1620,
    changePercent: 1.9,
    strongBuyPercent: 82,
    growthProbability: 74,
    totalVolume: 980000,
    buyVolume: 610000,
    sellVolume: 370000,
    isIntradayMover: false,
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    price: 2920,
    changePercent: 3.1,
    strongBuyPercent: 88,
    growthProbability: 82,
    totalVolume: 2500000,
    buyVolume: 1800000,
    sellVolume: 700000,
    isIntradayMover: true,
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank',
    price: 1125,
    changePercent: -1.3,
    strongBuyPercent: 84,
    growthProbability: 76,
    totalVolume: 1700000,
    buyVolume: 700000,
    sellVolume: 1000000,
    isIntradayMover: true,
  },
]

type Tab = 'TOP_GAINERS' | 'INTRADAY'

/* ---------------- PAGE ---------------- */

export default function StocksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('TOP_GAINERS')

  /** 🔹 LONG TERM – HIGH CONVICTION */
  const topGainers = STOCKS.filter(
    s =>
      s.strongBuyPercent >= 80 &&
      s.growthProbability >= 70 &&
      !s.isIntradayMover
  )

  /** 🔹 SHORT TERM – INTRADAY MOMENTUM */
  const intradayMovers = STOCKS.filter(
    s => s.isIntradayMover
  )

  const visibleStocks =
    activeTab === 'TOP_GAINERS'
      ? topGainers
      : intradayMovers

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* OLD FILTER BAR (LOGIC FIXED) */}
      <FilterTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* NEW CARD LIST */}
      <div className="space-y-4">
        {visibleStocks.map(stock => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}

        {visibleStocks.length === 0 && (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

/* ---------------- OLD UI FILTER TABS ---------------- */

function FilterTabs({
  activeTab,
  onChange,
}: {
  activeTab: Tab
  onChange: (tab: Tab) => void
}) {
  return (
    <div className="flex gap-6 border-b pb-2 text-sm">
      <button
        onClick={() => onChange('TOP_GAINERS')}
        className={
          activeTab === 'TOP_GAINERS'
            ? 'border-b-2 border-blue-600 font-medium'
            : 'text-gray-500'
        }
      >
        Top Gainers
      </button>

      <button
        onClick={() => onChange('INTRADAY')}
        className={
          activeTab === 'INTRADAY'
            ? 'border-b-2 border-blue-600 font-medium'
            : 'text-gray-500'
        }
      >
        Intraday Movers
      </button>
    </div>
  )
}

/* ---------------- NEW CARD UI ---------------- */

function StockCard({ stock }: { stock: Stock }) {
  const buyPct = Math.round(
    (stock.buyVolume / stock.totalVolume) * 100
  )

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">
            {stock.symbol}{' '}
            <span className="text-sm text-gray-500">
              {stock.name}
            </span>
          </div>
          <div className="text-sm">
            ₹{stock.price}{' '}
            <span
              className={
                stock.changePercent >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {stock.changePercent}%
            </span>
          </div>
        </div>

        <div className="text-right text-sm">
          <div className="text-green-700 font-medium">
            Strong Buy {stock.strongBuyPercent}%
          </div>
          <div className="text-xs text-gray-500">
            Growth {stock.growthProbability}%
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm">
        <div className="flex justify-between">
          <span>Total Volume</span>
          <span className="font-medium">
            {format(stock.totalVolume)}
          </span>
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-green-600">
            Buy {format(stock.buyVolume)} ({buyPct}%)
          </span>
          <span className="text-red-600">
            Sell {format(stock.sellVolume)}
          </span>
        </div>

        <div className="h-2 bg-gray-200 rounded mt-2 overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{ width: `${buyPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-gray-500 italic">
      No stocks available
    </div>
  )
}

/* ---------------- UTILS ---------------- */

function format(value: number) {
  return Intl.NumberFormat('en-IN', {
    notation: 'compact',
  }).format(value)
}