import { describe, expect, it } from 'vitest'
import { calculateRisk, liquidationPrice, pnl, roundTo } from '../src/lib/risk'

const base = { direction: 'long' as const, equity: 10000, riskPct: 1, entry: 100, stop: 95, takeProfit: 110, feePct: 0, leverage: 1, maintenanceMarginPct: 0.5 }

describe('risk calculator', () => {
  it('long sizing with zero fees: 100 risk / 5 stop = 20 units', () => {
    const r = calculateRisk(base)
    expect(r.valid).toBe(true)
    expect(r.size).toBeCloseTo(20, 10)
    expect(r.grossLossAtStop).toBeCloseTo(100, 8)
    expect(r.grossProfitAtTp).toBeCloseTo(200, 8)
    expect(r.rewardRisk).toBeCloseTo(2, 10)
    expect(r.notional).toBeCloseTo(2000, 8)
  })
  it('short sizing mirrors long', () => {
    const r = calculateRisk({ ...base, direction: 'short', stop: 105, takeProfit: 90 })
    expect(r.size).toBeCloseTo(20, 10)
    expect(r.grossProfitAtTp).toBeCloseTo(200, 8)
  })
  it('fee-inclusive sizing makes total loss at stop equal the risk amount', () => {
    const r = calculateRisk({ ...base, feePct: 0.1 })
    expect(r.totalLossAtStop).toBeCloseTo(100, 8)
    expect(r.size).toBeLessThan(20)
    expect(r.netProfitAtTp!).toBeLessThan(r.grossProfitAtTp!)
  })
  it('margin and notional scale with leverage', () => {
    const r = calculateRisk({ ...base, leverage: 10 })
    expect(r.margin).toBeCloseTo(200, 8)
    expect(r.warnings.some((w) => w.includes('Leverage'))).toBe(true)
  })
  it('rejects wrong-side stops and take-profits', () => {
    expect(calculateRisk({ ...base, stop: 101 }).valid).toBe(false)
    expect(calculateRisk({ ...base, direction: 'short', stop: 95, takeProfit: 90 }).valid).toBe(false)
    expect(calculateRisk({ ...base, takeProfit: 99 }).valid).toBe(false)
  })
  it('rejects zero or invalid inputs without throwing', () => {
    expect(calculateRisk({ ...base, equity: 0 }).valid).toBe(false)
    expect(calculateRisk({ ...base, entry: NaN }).valid).toBe(false)
    expect(calculateRisk({ ...base, leverage: 0 }).valid).toBe(false)
  })
  it('liquidation price approximations', () => {
    expect(liquidationPrice('long', 100, 10, 0.5)).toBeCloseTo(90.5, 8)
    expect(liquidationPrice('short', 100, 10, 0.5)).toBeCloseTo(109.5, 8)
    expect(liquidationPrice('long', 100, 1, 0.5)).toBeNull()
  })
  it('warns when stop is beyond liquidation', () => {
    const r = calculateRisk({ ...base, leverage: 25, stop: 90 })
    expect(r.warnings.some((w) => w.includes('liquidation'))).toBe(true)
  })
  it('pnl and rounding helpers', () => {
    expect(pnl('long', 100, 110, 2)).toBe(20)
    expect(pnl('short', 100, 110, 2)).toBe(-20)
    expect(roundTo(1.005, 2)).toBe(1.01)
  })
})
