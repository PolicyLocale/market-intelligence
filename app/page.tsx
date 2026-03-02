'use client'

import React from 'react'

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

/* ---------------- SIMULATED STOCK DATA ---------------- */

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
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    price: 1485,
    changePercent: 0.8,
    strongBuyPercent: 77, // ❌ filtered out
    growthProbability: 70,
    totalVolume: 2100000,
    buyVolume: 1200000,
    sellVolume: 900000,
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

/* ---------------- PAGE ---------------- */

export default function StocksPage() {
  /** TOP GAINERS — High conviction + high growth */
  const topGainers = STOCKS.filter(
    s =>
      s.strongBuyPercent >= 80 &&
      s.growthProbability >= 70 &&
      !s.isIntradayMover
  )

  /** INTRADAY MOVERS — separated */
  const intradayMovers = STOCKS.filter(
    s =>
      s.isIntradayMover &&
      s.strongBuyPercent >= 80
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <Header />

      <Section title="🚀 Top Gainers (Strong Buy ≥ 80%)">
        {topGainers.map(stock => (
          <StockRow key={stock.symbol} stock={stock} />
        ))}
        {topGainers.length === 0 && (
          <EmptyState message="No high-confidence gainers found" />
        )}
      </Section>

      <Section title="⚡ Intraday Movers">
        {intradayMovers.map(stock => (
          <StockRow key={stock.symbol} stock={stock} />
        ))}
        {intradayMovers.length === 0 && (
          <EmptyState message="No strong intraday movers" />
        )}
      </Section>
    </div>
  )
}

/* ---------------- COMPONENTS ---------------- */

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold">
        High-Growth Stock Watchlist
      </h1>
      <p className="text-gray-600">
        Showing only high-confidence stocks with strong institutional interest
      </p>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function StockRow({ stock }: { stock: Stock }) {
  const buyPct = Math.round(
    (stock.buyVolume / stock.totalVolume) * 100
  )
  const sellPct = 100 - buyPct

  return (
    <div className="border rounded-lg p-4 flex justify-between items-center">
      {/* LEFT */}
      <div>
        <div className="font-semibold">
          {stock.symbol}{' '}
          <span className="text-sm text-gray-500">
            {stock.name}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          ₹{stock.price} ·{' '}
          <span
            className={
              stock.changePercent >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }
          >
            {stock.changePercent}%
          </span>{' '}
          · Strong Buy{' '}
          <span className="text-green-700 font-medium">
            {stock.strongBuyPercent}%
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="text-right text-sm space-y-1">
        <div>
          Total Vol:{' '}
          <span className="font-medium">
            {format(stock.totalVolume)}
          </span>
        </div>

        <div className="flex gap-3 justify-end">
          <span className="text-green-600">
            Buy {format(stock.buyVolume)} ({buyPct}%)
          </span>
          <span className="text-red-600">
            Sell {format(stock.sellVolume)} ({sellPct}%)
          </span>
        </div>

        {/* Buy vs Sell Bar */}
        <div className="h-2 w-40 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{ width: `${buyPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-gray-500 italic text-sm">
      {message}
    </div>
  )
}

/* ---------------- UTILS ---------------- */

function format(value: number) {
  return Intl.NumberFormat('en-IN', {
    notation: 'compact',
  }).format(value)
}