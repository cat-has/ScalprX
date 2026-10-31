import type { Direction } from '../types'

/**
 * Assumptions: LINEAR contracts (spot or USDT-margined perpetuals), PnL in the quote currency:
 *   long  PnL = (exit - entry) * size      short PnL = (entry - exit) * size
 * Inverse (coin-margined) contracts are NOT supported. Fees are a percent of notional charged on
 * entry AND exit. Position sizing is fee-inclusive: the loss at the stop, fees included, equals
 * the chosen risk amount.
 */
export interface RiskInput {
  direction: Direction
  equity: number
  riskPct: number
  entry: number
  stop: number
  takeProfit?: number | null
  feePct: number
  leverage: number
  maintenanceMarginPct: number
}
export interface RiskResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  riskAmount: number
  size: number
  notional: number
  margin: number
  grossLossAtStop: number
  feesAtStop: number
  totalLossAtStop: number
  grossProfitAtTp: number | null
  feesAtTp: number | null
  netProfitAtTp: number | null
  rewardRisk: number | null
  netRewardRisk: number | null
  liquidationPrice: number | null
  marginPctOfEquity: number
}

export function roundTo(n: number, d: number): number {
  if (!Number.isFinite(n)) return n
  const f = 10 ** d
  return Math.round((n + Number.EPSILON) * f) / f
}

export function pnl(direction: Direction, entry: number, exit: number, size: number): number {
  return direction === 'long' ? (exit - entry) * size : (entry - exit) * size
}

/** Approximate isolated-margin liquidation for a linear position. Ignores funding, fees, tiered margin. */
export function liquidationPrice(direction: Direction, entry: number, leverage: number, mmrPct: number): number | null {
  if (!(leverage > 1)) return null
  const m = mmrPct / 100
  const p = direction === 'long' ? entry * (1 - 1 / leverage + m) : entry * (1 + 1 / leverage - m)
  return p > 0 ? p : null
}

export function calculateRisk(i: RiskInput): RiskResult {
  const errors: string[] = []
  const warnings: string[] = []
  const f = i.feePct / 100
  if (!(i.equity > 0)) errors.push('Account equity must be greater than 0.')
  if (!(i.riskPct > 0) || i.riskPct > 100) errors.push('Risk percent must be between 0 and 100.')
  if (!(i.entry > 0)) errors.push('Entry price must be greater than 0.')
  if (!(i.stop > 0)) errors.push('Stop-loss price must be greater than 0.')
  if (!(i.leverage >= 1)) errors.push('Leverage must be 1 or higher.')
  if (!(i.feePct >= 0)) errors.push('Fee percent cannot be negative.')
  if (i.entry > 0 && i.stop > 0) {
    if (i.direction === 'long' && i.stop >= i.entry) errors.push('For a long, the stop-loss must be below the entry.')
    if (i.direction === 'short' && i.stop <= i.entry) errors.push('For a short, the stop-loss must be above the entry.')
  }
  const tp = i.takeProfit
  const hasTp = tp != null && Number.isFinite(tp) && tp > 0
  if (hasTp && i.entry > 0) {
    if (i.direction === 'long' && tp <= i.entry) errors.push('For a long, take-profit must be above the entry.')
    if (i.direction === 'short' && tp >= i.entry) errors.push('For a short, take-profit must be below the entry.')
  }
  const empty: RiskResult = {
    valid: false, errors, warnings, riskAmount: 0, size: 0, notional: 0, margin: 0, grossLossAtStop: 0,
    feesAtStop: 0, totalLossAtStop: 0, grossProfitAtTp: null, feesAtTp: null, netProfitAtTp: null,
    rewardRisk: null, netRewardRisk: null, liquidationPrice: null, marginPctOfEquity: 0,
  }
  if (errors.length) return empty

  const riskAmount = i.equity * (i.riskPct / 100)
  const perUnitLoss = Math.abs(i.entry - i.stop)
  const perUnitFees = (i.entry + i.stop) * f
  const size = riskAmount / (perUnitLoss + perUnitFees)
  const notional = size * i.entry
  const margin = notional / i.leverage
  const grossLossAtStop = size * perUnitLoss
  const feesAtStop = size * perUnitFees
  let grossProfitAtTp: number | null = null
  let feesAtTp: number | null = null
  let netProfitAtTp: number | null = null
  let rewardRisk: number | null = null
  let netRewardRisk: number | null = null
  if (hasTp) {
    grossProfitAtTp = pnl(i.direction, i.entry, tp, size)
    feesAtTp = size * (i.entry + tp) * f
    netProfitAtTp = grossProfitAtTp - feesAtTp
    rewardRisk = Math.abs(tp - i.entry) / perUnitLoss
    netRewardRisk = netProfitAtTp / (grossLossAtStop + feesAtStop)
  }
  const liq = liquidationPrice(i.direction, i.entry, i.leverage, i.maintenanceMarginPct)
  const marginPctOfEquity = (margin / i.equity) * 100
  if (margin > i.equity) warnings.push('Required margin exceeds account equity. Reduce risk or the stop distance, or review leverage.')
  if (i.leverage >= 10) warnings.push(`Leverage of ${i.leverage}x is material: small adverse moves can liquidate the position.`)
  if (liq != null) {
    const beyond = i.direction === 'long' ? i.stop <= liq : i.stop >= liq
    if (beyond) warnings.push('Your stop-loss is at or beyond the estimated liquidation price. The position could be liquidated before the stop triggers.')
  }
  if (rewardRisk != null && rewardRisk < 1) warnings.push('Reward/risk is below 1:1.')
  return {
    valid: true, errors, warnings, riskAmount, size, notional, margin, grossLossAtStop, feesAtStop,
    totalLossAtStop: grossLossAtStop + feesAtStop, grossProfitAtTp, feesAtTp, netProfitAtTp, rewardRisk,
    netRewardRisk, liquidationPrice: liq, marginPctOfEquity,
  }
}
