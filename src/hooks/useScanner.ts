import { useCallback, useEffect, useRef, useState } from 'react'
import type { Timeframe } from '../types'
import { describeError, fetchCandles } from '../services/market-data'
import { evaluateSetup, type Setup } from '../lib/scanner'
import type { IndicatorConfig, ScannerConfig } from '../lib/settings'

export interface ScanState { setups: Setup[]; scanning: boolean; error: string | null; finishedAt: number | null }
/** Fetches real candles for each symbol and evaluates the rule set. Candle failures are reported, never replaced with fake data. */
export function useScanner(symbols: string[], tf: Timeframe, ind: IndicatorConfig, cfg: ScannerConfig, spreads: Record<string, number | undefined>, everySec: number, enabled = true) {
  const [state, setState] = useState<ScanState>({ setups: [], scanning: false, error: null, finishedAt: null })
  const spreadRef = useRef(spreads)
  const busy = useRef(false)
  useEffect(() => { spreadRef.current = spreads }, [spreads])
  const key = symbols.join(',')
  const scan = useCallback(async () => {
    if (busy.current || !symbols.length) return
    busy.current = true
    setState((s) => ({ ...s, scanning: true }))
    const out: Setup[] = []
    let error: string | null = null
    for (const sym of symbols) {
      try {
        const r = await fetchCandles(sym, tf, 300)
        out.push(evaluateSetup(sym, tf, r.data, ind, cfg, spreadRef.current[sym] ?? null))
      } catch (e) {
        error = describeError(e).message
        if (/rate/i.test(error)) break
      }
    }
    busy.current = false
    setState((prev) => ({ setups: out.length ? out : prev.setups, scanning: false, error: error && !out.length ? error : error ? `${error} Some pairs could not be scanned.` : null, finishedAt: Date.now() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tf, ind, cfg])
  useEffect(() => {
    if (!enabled) return
    void scan()
    const id = setInterval(() => { if (document.visibilityState === 'visible') void scan() }, Math.max(30, everySec) * 1000)
    return () => clearInterval(id)
  }, [scan, everySec, enabled])
  return { ...state, scanNow: () => void scan() }
}
