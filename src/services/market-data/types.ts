import type { Candle, Ticker, Timeframe } from '../../types'

export type FeedErrorKind = 'rate_limit' | 'blocked' | 'network' | 'http' | 'parse'
export class FeedError extends Error {
  kind: FeedErrorKind
  status?: number
  constructor(kind: FeedErrorKind, message: string, status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}
export interface MarketProvider {
  id: string
  label: string
  getTickers(symbols: string[]): Promise<Ticker[]>
  getCandles(symbol: string, tf: Timeframe, limit?: number): Promise<Candle[]>
  listSymbols(): Promise<string[]>
}
export interface Fetched<T> { data: T; source: string }
