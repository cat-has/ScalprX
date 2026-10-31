import type { Candle, Ticker, Timeframe } from '../../types'
import { getJson } from './http'
import { FeedError, type MarketProvider } from './types'

const HOST = 'https://api.bybit.com'
const IV: Record<Timeframe, string> = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '1h': '60' }
interface Envelope<T> { retCode: number; retMsg: string; result: T }
interface RawTicker { symbol: string; lastPrice: string; price24hPcnt: string; highPrice24h: string; lowPrice24h: string; turnover24h: string; bid1Price: string; ask1Price: string }

async function call<T>(path: string): Promise<T> {
  const r = await getJson<Envelope<T>>(HOST + path)
  if (r.retCode !== 0) throw new FeedError('http', `Bybit error: ${r.retMsg}`)
  return r.result
}

/** Bybit v5 public spot market data - used as a fallback when Binance is unreachable. */
export const bybitProvider: MarketProvider = {
  id: 'bybit',
  label: 'Bybit public API (fallback)',
  async getTickers(symbols) {
    const res = await call<{ list: RawTicker[] }>('/v5/market/tickers?category=spot')
    const want = new Set(symbols)
    return res.list.filter((r) => want.has(r.symbol)).map((r): Ticker => {
      const bid = Number(r.bid1Price)
      const ask = Number(r.ask1Price)
      return {
        symbol: r.symbol, price: Number(r.lastPrice), changePct: Number(r.price24hPcnt) * 100, high: Number(r.highPrice24h),
        low: Number(r.lowPrice24h), quoteVolume: Number(r.turnover24h), bid, ask, spreadPct: bid && ask ? ((ask - bid) / ((ask + bid) / 2)) * 100 : undefined,
      }
    })
  },
  async getCandles(symbol, tf, limit = 300) {
    const res = await call<{ list: string[][] }>(`/v5/market/kline?category=spot&symbol=${symbol}&interval=${IV[tf]}&limit=${Math.min(limit, 1000)}`)
    return res.list.map((k): Candle => ({ t: Number(k[0]), o: Number(k[1]), h: Number(k[2]), l: Number(k[3]), c: Number(k[4]), v: Number(k[5]) })).sort((a, b) => a.t - b.t)
  },
  async listSymbols() {
    const res = await call<{ list: RawTicker[] }>('/v5/market/tickers?category=spot')
    return res.list.map((r) => r.symbol).filter((s) => s.endsWith('USDT')).sort()
  },
}
