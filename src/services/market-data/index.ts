import type { Candle, Ticker, Timeframe } from '../../types'
import { binanceProvider } from './binance'
import { bybitProvider } from './bybit'
import { FeedError, type Fetched, type MarketProvider } from './types'

export { FeedError } from './types'
export type { Fetched, MarketProvider } from './types'

/** Providers in priority order. Add another exchange by implementing MarketProvider and appending it here. */
export const PROVIDERS: MarketProvider[] = [binanceProvider, bybitProvider]

async function firstOk<T>(fn: (p: MarketProvider) => Promise<T>, providers = PROVIDERS): Promise<Fetched<T>> {
  let err: unknown
  for (const p of providers) {
    try {
      return { data: await fn(p), source: p.label }
    } catch (e) {
      err = e
    }
  }
  throw err instanceof Error ? err : new FeedError('network', 'All market-data providers failed.')
}
export const fetchTickers = (symbols: string[]): Promise<Fetched<Ticker[]>> => firstOk((p) => p.getTickers(symbols))
export const fetchCandles = (symbol: string, tf: Timeframe, limit = 300): Promise<Fetched<Candle[]>> => firstOk((p) => p.getCandles(symbol, tf, limit))
export const fetchSymbols = (): Promise<Fetched<string[]>> => firstOk((p) => p.listSymbols())

export function describeError(e: unknown): { status: 'rate_limited' | 'error' | 'offline'; message: string } {
  if (!navigator.onLine) return { status: 'offline', message: 'You are offline.' }
  if (e instanceof FeedError) {
    if (e.kind === 'rate_limit') return { status: 'rate_limited', message: e.message + ' Refreshing will slow down automatically.' }
    return { status: 'error', message: e.message }
  }
  return { status: 'error', message: 'Unexpected market-data error.' }
}
