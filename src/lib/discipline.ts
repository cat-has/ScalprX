import type { Trade } from '../types'
import type { DisciplineRules } from './settings'
import { dayKey } from './format'
import { resultOf } from './metrics'

export interface Breach { id: string; severity: 'warn' | 'breach'; message: string }
export interface DisciplineStatus {
  todayTrades: number
  todayNet: number
  consecutiveLosses: number
  cooldownUntil: number | null
  breaches: Breach[]
}

export function evaluateDiscipline(trades: Trade[], rules: DisciplineRules, equity: number, now = Date.now()): DisciplineStatus {
  const today = dayKey(now)
  const todays = trades.filter((t) => dayKey(t.closedAt ?? t.openedAt) === today || dayKey(t.openedAt) === today)
  const closedToday = todays.map(resultOf).filter((x) => x != null)
  const todayNet = closedToday.reduce((s, r) => s + r.net, 0)
  const closed = trades.map(resultOf).filter((x) => x != null).sort((a, b) => (a.trade.closedAt ?? 0) - (b.trade.closedAt ?? 0))
  let consecutiveLosses = 0
  for (let i = closed.length - 1; i >= 0 && closed[i].net < 0; i--) consecutiveLosses++
  const lastLoss = closed.length ? closed[closed.length - 1] : null
  const cooldownUntil = consecutiveLosses >= rules.maxConsecLosses && rules.cooldownMin > 0 && lastLoss?.trade.closedAt ? lastLoss.trade.closedAt + rules.cooldownMin * 60000 : null
  const breaches: Breach[] = []
  if (rules.dailyLossLimit > 0 && todayNet <= -rules.dailyLossLimit) breaches.push({ id: 'daily', severity: 'breach', message: `Daily loss limit reached: ${todayNet.toFixed(2)} vs limit -${rules.dailyLossLimit}.` })
  else if (rules.dailyLossLimit > 0 && todayNet <= -0.8 * rules.dailyLossLimit) breaches.push({ id: 'daily-near', severity: 'warn', message: 'Daily loss is above 80% of your limit.' })
  if (rules.maxTradesPerDay > 0 && todays.length > rules.maxTradesPerDay) breaches.push({ id: 'count', severity: 'breach', message: `${todays.length} trades recorded today, above your limit of ${rules.maxTradesPerDay}.` })
  else if (rules.maxTradesPerDay > 0 && todays.length === rules.maxTradesPerDay) breaches.push({ id: 'count-at', severity: 'warn', message: 'You have reached your maximum trades for today.' })
  if (rules.maxConsecLosses > 0 && consecutiveLosses >= rules.maxConsecLosses) breaches.push({ id: 'streak', severity: 'breach', message: `${consecutiveLosses} consecutive losses recorded (limit ${rules.maxConsecLosses}).${cooldownUntil && cooldownUntil > now ? ` Planned cooldown ends in ${Math.ceil((cooldownUntil - now) / 60000)} min.` : ''}` })
  if (equity > 0 && rules.maxRiskPct > 0) {
    for (const t of todays) {
      const risk = Math.abs(t.entry - t.stop) * t.size
      const pct = (risk / equity) * 100
      if (pct > rules.maxRiskPct + 1e-9) breaches.push({ id: `risk-${t.id}`, severity: 'warn', message: `${t.pair} trade planned ${pct.toFixed(2)}% risk, above your ${rules.maxRiskPct}% limit.` })
    }
  }
  return { todayTrades: todays.length, todayNet, consecutiveLosses, cooldownUntil, breaches }
}

export function summarize(trades: Trade[], fromMs: number, toMs: number) {
  const rs = trades.map(resultOf).filter((x) => x != null).filter((r) => (r.trade.closedAt ?? 0) >= fromMs && (r.trade.closedAt ?? 0) < toMs)
  const net = rs.reduce((s, r) => s + r.net, 0)
  const wins = rs.filter((r) => r.net > 0).length
  return { trades: rs.length, net, winRate: rs.length ? (wins / rs.length) * 100 : null }
}

export const DEFAULT_PRE = ['Market context checked (trend, news, volatility)', 'Setup matches my written plan', 'Entry, stop-loss and take-profit defined', 'Position size calculated with the risk calculator', 'Risk within my per-trade limit', 'I am calm and not trying to recover losses']
export const DEFAULT_POST = ['Trade recorded in the journal', 'Followed the plan (entry, stop, target)', 'Mistakes tagged honestly', 'Screenshot or notes saved', 'One lesson written down']
