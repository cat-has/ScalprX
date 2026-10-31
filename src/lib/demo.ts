import type { Alert, AppNotification, Trade } from '../types'

/** Deterministic SAMPLE data for previews only. Never written to the database, never exported, never used by Dashboard or Discipline. */
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

export function makeDemoTrades(now = Date.now()): Trade[] {
  const r = rng(20261031)
  const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']
  const px: Record<string, number> = { BTCUSDT: 68000, ETHUSDT: 3400, SOLUSDT: 165, XRPUSDT: 0.62, BNBUSDT: 590 }
  const setups = ['EMA cross', 'VWAP reclaim', 'Breakout', 'Pullback', 'Range fade']
  const tfs = ['1m', '3m', '5m', '15m']
  const emotions = ['Calm', 'Confident', 'Anxious', 'Greedy', 'Frustrated']
  const mistakes = ['FOMO entry', 'Early exit', 'Moved stop', 'Chased price', 'Ignored plan']
  const out: Trade[] = []
  for (let i = 0; i < 42; i++) {
    const pair = pairs[Math.floor(r() * pairs.length)]
    const dir = r() < 0.55 ? 'long' : 'short'
    const entry = px[pair] * (0.97 + r() * 0.06)
    const stopPct = 0.002 + r() * 0.004
    const stop = dir === 'long' ? entry * (1 - stopPct) : entry * (1 + stopPct)
    const riskUnit = Math.abs(entry - stop)
    const size = 10 / riskUnit
    const win = r() < 0.48
    const mult = win ? 0.8 + r() * 2.2 : -(0.7 + r() * 0.5)
    const exit = dir === 'long' ? entry + riskUnit * mult : entry - riskUnit * mult
    const opened = now - (42 - i) * 17 * 3600_000 - Math.floor(r() * 3600_000)
    const closed = opened + (3 + Math.floor(r() * 40)) * 60_000
    out.push({
      id: `demo-${i}`, pair, direction: dir, entry, exit, stop, takeProfit: dir === 'long' ? entry + riskUnit * 2 : entry - riskUnit * 2,
      size, fees: size * (entry + exit) * 0.0005, openedAt: opened, closedAt: closed, setup: setups[Math.floor(r() * setups.length)],
      timeframe: tfs[Math.floor(r() * tfs.length)], rationale: 'Sample trade for previewing reports.', emotion: emotions[Math.floor(r() * emotions.length)],
      executionQuality: 1 + Math.floor(r() * 5), mistakes: !win && r() < 0.5 ? [mistakes[Math.floor(r() * mistakes.length)]] : [],
      preNotes: '', postNotes: 'Sample data - not a real trade.', createdAt: opened,
    })
  }
  return out.sort((a, b) => b.openedAt - a.openedAt)
}
export function makeDemoAlerts(now = Date.now()): { alerts: Alert[]; notifications: AppNotification[] } {
  const alerts: Alert[] = [
    { id: 'demo-a1', pair: 'BTCUSDT', kind: 'price_above', value: 70000, cooldownMin: 15, mode: 'once', active: true, createdAt: now - 86400000 },
    { id: 'demo-a2', pair: 'ETHUSDT', kind: 'price_below', value: 3200, cooldownMin: 15, mode: 'repeat', active: true, createdAt: now - 86400000 },
    { id: 'demo-a3', pair: 'SOLUSDT', kind: 'rsi_above', value: 70, timeframe: '5m', cooldownMin: 30, mode: 'repeat', active: false, createdAt: now - 172800000, triggeredAt: now - 3 * 3600_000 },
    { id: 'demo-a4', pair: 'XRPUSDT', kind: 'pct_move', value: 3, baseline: 0.62, cooldownMin: 60, mode: 'once', active: false, createdAt: now - 172800000, triggeredAt: now - 9 * 3600_000 },
  ]
  const notifications: AppNotification[] = [
    { id: 'demo-n1', alertId: 'demo-a3', message: 'SOL/USDT RSI is 71.3 (above 70)', createdAt: now - 3 * 3600_000, read: false, dismissed: false },
    { id: 'demo-n2', alertId: 'demo-a4', message: 'XRP/USDT moved 3.12% from 0.62 (threshold 3%)', createdAt: now - 9 * 3600_000, read: true, dismissed: false },
  ]
  return { alerts, notifications }
}
