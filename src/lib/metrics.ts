import type { Trade } from '../types'
import { pnl } from './risk'
import { sessionOf } from './session'

export interface TradeResult {
  trade: Trade
  gross: number
  net: number
  plannedRisk: number
  r: number | null
}
/** Closed trades only. gross = linear PnL, net = gross - fees, plannedRisk = |entry-stop|*size, R = net / plannedRisk. */
export function resultOf(t: Trade): TradeResult | null {
  if (t.exit == null || t.closedAt == null) return null
  const gross = pnl(t.direction, t.entry, t.exit, t.size)
  const net = gross - t.fees
  const plannedRisk = Math.abs(t.entry - t.stop) * t.size
  return { trade: t, gross, net, plannedRisk, r: plannedRisk > 0 ? net / plannedRisk : null }
}

export interface Metrics {
  total: number
  wins: number
  losses: number
  breakeven: number
  winRate: number | null
  netPnl: number
  grossPnl: number
  fees: number
  avgWin: number | null
  avgLoss: number | null
  profitFactor: number | null
  profitFactorInfinite: boolean
  expectancy: number | null
  avgR: number | null
  maxDrawdown: number
  bestTrade: number | null
  worstTrade: number | null
}
export const emptyMetrics: Metrics = {
  total: 0, wins: 0, losses: 0, breakeven: 0, winRate: null, netPnl: 0, grossPnl: 0, fees: 0, avgWin: null,
  avgLoss: null, profitFactor: null, profitFactorInfinite: false, expectancy: null, avgR: null, maxDrawdown: 0,
  bestTrade: null, worstTrade: null,
}

/** Max drawdown: largest peak-to-trough fall of the cumulative net P&L curve (starting at 0), ordered by close time. */
export function maxDrawdown(results: TradeResult[]): number {
  const sorted = [...results].sort((a, b) => (a.trade.closedAt ?? 0) - (b.trade.closedAt ?? 0))
  let cum = 0
  let peak = 0
  let dd = 0
  for (const r of sorted) {
    cum += r.net
    if (cum > peak) peak = cum
    if (peak - cum > dd) dd = peak - cum
  }
  return dd
}

export function equityCurve(results: TradeResult[]): { t: number; v: number }[] {
  const sorted = [...results].sort((a, b) => (a.trade.closedAt ?? 0) - (b.trade.closedAt ?? 0))
  let cum = 0
  return sorted.map((r) => ({ t: r.trade.closedAt ?? 0, v: (cum += r.net) }))
}

export function computeMetrics(results: TradeResult[]): Metrics {
  const n = results.length
  if (n === 0) return { ...emptyMetrics }
  const wins = results.filter((r) => r.net > 0)
  const losses = results.filter((r) => r.net < 0)
  const sumWin = wins.reduce((s, r) => s + r.net, 0)
  const sumLoss = losses.reduce((s, r) => s + r.net, 0)
  const netPnl = results.reduce((s, r) => s + r.net, 0)
  const rs = results.map((r) => r.r).filter((x): x is number => x != null)
  return {
    total: n,
    wins: wins.length,
    losses: losses.length,
    breakeven: n - wins.length - losses.length,
    winRate: (wins.length / n) * 100,
    netPnl,
    grossPnl: results.reduce((s, r) => s + r.gross, 0),
    fees: results.reduce((s, r) => s + r.trade.fees, 0),
    avgWin: wins.length ? sumWin / wins.length : null,
    avgLoss: losses.length ? sumLoss / losses.length : null,
    profitFactor: sumLoss < 0 ? sumWin / Math.abs(sumLoss) : null,
    profitFactorInfinite: sumLoss === 0 && sumWin > 0,
    expectancy: netPnl / n,
    avgR: rs.length ? rs.reduce((s, x) => s + x, 0) / rs.length : null,
    maxDrawdown: maxDrawdown(results),
    bestTrade: Math.max(...results.map((r) => r.net)),
    worstTrade: Math.min(...results.map((r) => r.net)),
  }
}

export interface GroupRow { key: string; metrics: Metrics }
export function groupBy(results: TradeResult[], keyFn: (r: TradeResult) => string): GroupRow[] {
  const map = new Map<string, TradeResult[]>()
  for (const r of results) {
    const k = keyFn(r) || '(none)'
    map.set(k, [...(map.get(k) ?? []), r])
  }
  return [...map.entries()].map(([key, rs]) => ({ key, metrics: computeMetrics(rs) })).sort((a, b) => b.metrics.netPnl - a.metrics.netPnl)
}
export const byPair = (r: TradeResult[]) => groupBy(r, (x) => x.trade.pair)
export const byTimeframe = (r: TradeResult[]) => groupBy(r, (x) => x.trade.timeframe)
export const bySetup = (r: TradeResult[]) => groupBy(r, (x) => x.trade.setup)
export const bySession = (r: TradeResult[]) => groupBy(r, (x) => sessionOf(x.trade.closedAt ?? x.trade.openedAt))

export function closedResults(trades: Trade[]): TradeResult[] {
  return trades.map(resultOf).filter((x): x is TradeResult => x != null)
}
