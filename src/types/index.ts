export type Timeframe = '1m' | '3m' | '5m' | '15m' | '1h'
export const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '1h']
export type Direction = 'long' | 'short'

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }

export interface Ticker {
  symbol: string
  price: number
  changePct: number
  high: number
  low: number
  quoteVolume: number
  bid?: number
  ask?: number
  spreadPct?: number
}

export interface Trade {
  id: string
  pair: string
  direction: Direction
  entry: number
  exit: number | null
  stop: number
  takeProfit: number | null
  size: number
  fees: number
  openedAt: number
  closedAt: number | null
  setup: string
  timeframe: string
  rationale: string
  emotion: string
  executionQuality: number
  mistakes: string[]
  preNotes: string
  postNotes: string
  createdAt: number
}

export type AlertKind = 'price_above' | 'price_below' | 'pct_move' | 'rsi_above' | 'rsi_below'
export interface Alert {
  id: string
  pair: string
  kind: AlertKind
  value: number
  baseline?: number
  timeframe?: Timeframe
  cooldownMin: number
  mode: 'once' | 'repeat'
  active: boolean
  createdAt: number
  triggeredAt?: number
}
export interface AppNotification {
  id: string
  alertId: string
  message: string
  createdAt: number
  read: boolean
  dismissed: boolean
}
export interface SessionNote { date: string; text: string }
