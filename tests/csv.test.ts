import { describe, expect, it } from 'vitest'
import { csvToTrades, parseCsv, tradesToCsv } from '../src/lib/csv'
import type { Trade } from '../src/types'

const t: Trade = {
  id: 'abc', pair: 'BTCUSDT', direction: 'long', entry: 100, exit: 110, stop: 95, takeProfit: 120, size: 1.5, fees: 0.2,
  openedAt: Date.UTC(2026, 0, 1), closedAt: Date.UTC(2026, 0, 1, 1), setup: 'EMA, cross', timeframe: '5m',
  rationale: 'Line one\nLine "two"', emotion: 'calm', executionQuality: 4, mistakes: ['fomo', 'early exit'], preNotes: '=SUM(A1)', postNotes: '', createdAt: 0,
}

describe('csv', () => {
  it('parses quotes, commas and newlines', () => {
    expect(parseCsv('a,b\n"x,1","y\n""z"""\n')).toEqual([['a', 'b'], ['x,1', 'y\n"z"']])
  })
  it('round-trips a trade including formula-like text', () => {
    const csv = tradesToCsv([t])
    expect(csv).toContain("'=SUM(A1)")
    const r = csvToTrades(csv)
    expect(r.errors).toEqual([])
    expect(r.trades).toHaveLength(1)
    expect(r.trades[0]).toMatchObject({ pair: 'BTCUSDT', entry: 100, exit: 110, size: 1.5, setup: 'EMA, cross', rationale: 'Line one\nLine "two"', preNotes: '=SUM(A1)' })
    expect(r.trades[0].mistakes).toEqual(['fomo', 'early exit'])
  })
  it('reports row-level validation errors and skips duplicates', () => {
    const bad = 'pair,direction,entry,stop,size,openedAt\nBTCUSDT,long,100,105,1,2026-01-01T00:00:00Z\nBTCUSDT,sideways,100,95,1,2026-01-01\nETHUSDT,long,100,95,1,2026-01-01'
    const r = csvToTrades(bad)
    expect(r.trades).toHaveLength(1)
    expect(r.errors).toHaveLength(2)
    const dup = csvToTrades(tradesToCsv([t]), new Set(['abc']))
    expect(dup.skipped).toBe(1)
    expect(dup.trades).toHaveLength(0)
  })
  it('rejects files missing required columns', () => {
    expect(csvToTrades('foo,bar\n1,2').errors[0]).toContain('Missing required')
  })
})
