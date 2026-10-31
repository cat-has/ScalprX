import { describe, expect, it } from 'vitest'
import { closedResults, computeMetrics, maxDrawdown, byPair, resultOf } from '../src/lib/metrics'
import type { Trade } from '../src/types'

let n = 0
function trade(p: Partial<Trade>): Trade {
  n++
  return {
    id: `t${n}`, pair: 'BTCUSDT', direction: 'long', entry: 100, exit: 110, stop: 95, takeProfit: null, size: 1, fees: 0,
    openedAt: 1_000_000 * n, closedAt: 1_000_000 * n + 1000, setup: 'EMA', timeframe: '5m', rationale: '', emotion: '',
    executionQuality: 3, mistakes: [], preNotes: '', postNotes: '', createdAt: 0, ...p,
  }
}

describe('journal metrics', () => {
  it('empty dataset is safe', () => {
    const m = computeMetrics([])
    expect(m.total).toBe(0)
    expect(m.winRate).toBeNull()
    expect(m.profitFactor).toBeNull()
    expect(m.expectancy).toBeNull()
  })
  it('computes core metrics for a known set', () => {
    const ts = [trade({ exit: 110 }), trade({ exit: 95 }), trade({ exit: 105, fees: 1 }), trade({ exit: 90 })]
    const m = computeMetrics(closedResults(ts))
    // nets: +10, -5, +4, -10
    expect(m.total).toBe(4)
    expect(m.wins).toBe(2)
    expect(m.winRate).toBe(50)
    expect(m.netPnl).toBeCloseTo(-1, 10)
    expect(m.avgWin).toBeCloseTo(7, 10)
    expect(m.avgLoss).toBeCloseTo(-7.5, 10)
    expect(m.profitFactor).toBeCloseTo(14 / 15, 10)
    expect(m.expectancy).toBeCloseTo(-0.25, 10)
    // R: +2, -1, +0.8, -2 => avg -0.05 ... (2-1+0.8-2)/4
    expect(m.avgR).toBeCloseTo(-0.05, 10)
  })
  it('long and short pnl with fees', () => {
    expect(resultOf(trade({ direction: 'short', entry: 100, stop: 105, exit: 90, fees: 2 }))!.net).toBeCloseTo(8, 10)
  })
  it('max drawdown from the cumulative curve', () => {
    const ts = [trade({ exit: 110 }), trade({ exit: 90 }), trade({ exit: 95 }), trade({ exit: 120 })]
    // curve: +10, 0, -5, +15 -> peak 10, trough -5 => dd 15
    expect(maxDrawdown(closedResults(ts))).toBeCloseTo(15, 10)
  })
  it('profit factor is infinite with wins and no losses; open trades are excluded', () => {
    const m = computeMetrics(closedResults([trade({ exit: 110 }), trade({ exit: null, closedAt: null })]))
    expect(m.total).toBe(1)
    expect(m.profitFactor).toBeNull()
    expect(m.profitFactorInfinite).toBe(true)
  })
  it('groups by pair', () => {
    const rows = byPair(closedResults([trade({}), trade({ pair: 'ETHUSDT', exit: 90 })]))
    expect(rows.map((r) => r.key).sort()).toEqual(['BTCUSDT', 'ETHUSDT'])
  })
})
