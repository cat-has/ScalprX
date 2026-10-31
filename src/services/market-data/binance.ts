import type { Candle, Ticker, Timeframe } from '../../types'
import { getJson } from './http'
import { FeedError, type MarketProvider } from './types'

const HOSTS = ['https://api.binance.com', 'https://data-api.binance.vision']
const num = (v: unknown) => Number(v)

async function tryHosts<T>(path: string): Promise<T> {
  let lastErr: unknown
  for (const h of HOSTS) {
    try {
      return await getJson<T>(h + path)
    } catch (e) {
      lastErr = e
      if (e instanceof FeedError && e.kind === 'rate_limit') throw e
    }
  }
  throw lastErr
}

interface Raw24 { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }
interface RawBook { symbol: string; bidPrice: string; askPrice: string }

/** Binance public spot market data (no API key). Falls back to the data-api.binance.vision mirror. */
export const binanceProvider: MarketProvider = {
  id: 'binance',
  label: 'Binance public API',
  async getTickers(symbols) {
    const q = encodeURIComponent(JSON.stringify(symbols))
    const [t24, book] = await Promise.all([
      tryHosts<Raw24[]>(`/api/v3/ticker/24hr?symbols=${q}`),
      tryHosts<RawBook[]>(`/api/v3/ticker/bookTicker?symbols=${q}`).catch(() => [] as RawBook[]),
    ])
    const bm = new Map(book.map((b) => [b.symbol, b]))
    return t24.map((r): Ticker => {
      const b = bm.get(r.symbol)
      const bid = b ? num(b.bidPrice) : undefined
      const ask = b ? num(b.askPrice) : undefined
      return {
        symbol: r.symbol, price: num(r.lastPrice), changePct: num(r.priceChangePercent), high: num(r.highPrice), low: num(r.lowPrice),
        quoteVolume: num(r.quoteVolume), bid, ask, spreadPct: bid && ask ? ((ask - bid) / ((ask + bid) / 2)) * 100 : undefined,
      }
    })
  },
  async getCandles(symbol, tf: Timeframe, limit = 300) {
    const rows = await tryHosts<unknown[][]>(`/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`)
    return rows.map((k): Candle => ({ t: num(k[0]), o: num(k[1]), h: num(k[2]), l: num(k[3]), c: num(k[4]), v: num(k[5]) }))
  },
  async listSymbols() {
    const rows = await tryHosts<{ symbol: string }[]>('/api/v3/ticker/price')
    return rows.map((r) => r.symbol).filter((s) => s.endsWith('USDT') && !/(UP|DOWN|BULL|BEAR)USDT$/.test(s)).sort()
  },
}
