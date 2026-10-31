import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candle, Timeframe } from '../types'
import { describeError, fetchCandles } from '../services/market-data'

export interface CandleState { candles: Candle[]; loading: boolean; error: string | null; source: string | null; updatedAt: number | null }
/** Polls candles for one pair/timeframe. Never fabricates data: on failure it keeps the last real candles and reports the error. */
export function useCandles(symbol: string, tf: Timeframe, refreshSec: number, enabled = true): CandleState & { reload: () => void } {
  const [state, setState] = useState<CandleState>({ candles: [], loading: true, error: null, source: null, updatedAt: null })
  const key = useRef('')
  const load = useCallback(async () => {
    try {
      const r = await fetchCandles(symbol, tf, 300)
      setState({ candles: r.data, loading: false, error: null, source: r.source, updatedAt: Date.now() })
    } catch (e) {
      const d = describeError(e)
      setState((s) => ({ ...s, loading: false, error: d.message }))
    }
  }, [symbol, tf])
  useEffect(() => {
    if (!enabled) return
    const k = `${symbol}|${tf}`
    if (key.current !== k) { key.current = k; setState({ candles: [], loading: true, error: null, source: null, updatedAt: null }) }
    void load()
    const id = setInterval(() => { if (document.visibilityState === 'visible') void load() }, Math.max(5, refreshSec) * 1000)
    return () => clearInterval(id)
  }, [symbol, tf, refreshSec, enabled, load])
  return { ...state, reload: () => void load() }
}
