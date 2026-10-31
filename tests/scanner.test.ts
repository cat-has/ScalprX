import { describe, expect, it } from 'vitest'
import { evaluateSetup } from '../src/lib/scanner'
import { DEFAULT_SETTINGS } from '../src/lib/settings'
import type { Candle } from '../src/types'

const { indicators, scanner } = DEFAULT_SETTINGS
function series(n: number, f: (i: number) => number, vol = (_i: number) => 10): Candle[] {
  return Array.from({ length: n }, (_, i) => { const c = f(i); return { t: i * 60000, o: c, h: c + 0.5, l: c - 0.5, c, v: vol(i) } })
}

describe('scanner', () => {
  it('does not manufacture setups with too little data', () => {
    const s = evaluateSetup('BTCUSDT', '5m', series(20, (i) => 100 + i), indicators, scanner, null)
    expect(s.bias).toBe('insufficient')
    expect(s.entry).toBeNull()
  })
  it('flat market is neutral', () => {
    const s = evaluateSetup('BTCUSDT', '5m', series(200, () => 100), indicators, scanner, null)
    expect(['neutral']).toContain(s.bias)
    expect(s.long).not.toBeNull()
    expect(s.long!.conditions).toHaveLength(6)
  })
  it('exposes indicator values and conditions for a trending series', () => {
    const s = evaluateSetup('ETHUSDT', '5m', series(200, (i) => 100 + i * 0.3 + Math.sin(i / 3)), indicators, scanner, 0.01)
    expect(s.values).not.toBeNull()
    expect(s.trend).toBe('up')
    expect(s.explanation.length).toBeGreaterThan(10)
    expect(s.spreadPct).toBe(0.01)
  })
})
