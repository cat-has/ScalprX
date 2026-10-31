import type { Alert } from '../types'

export interface AlertContext { price: number | null; rsi?: number | null }
export function describeAlert(a: Alert): string {
  const p = a.pair.replace('USDT', '/USDT')
  switch (a.kind) {
    case 'price_above': return `${p} price at or above ${a.value}`
    case 'price_below': return `${p} price at or below ${a.value}`
    case 'pct_move': return `${p} moves ${a.value}% from ${a.baseline ?? '?'}`
    case 'rsi_above': return `${p} RSI(${a.timeframe ?? '5m'}) at or above ${a.value}`
    case 'rsi_below': return `${p} RSI(${a.timeframe ?? '5m'}) at or below ${a.value}`
  }
}
/** Pure evaluation: returns a message when the condition is met and cooldown allows, else null. */
export function evaluateAlert(a: Alert, ctx: AlertContext, now = Date.now()): string | null {
  if (!a.active) return null
  if (a.triggeredAt && a.mode === 'once') return null
  if (a.triggeredAt && now - a.triggeredAt < a.cooldownMin * 60000) return null
  const p = ctx.price
  const name = a.pair.replace('USDT', '/USDT')
  switch (a.kind) {
    case 'price_above': return p != null && p >= a.value ? `${name} reached ${p} (above ${a.value})` : null
    case 'price_below': return p != null && p <= a.value ? `${name} reached ${p} (below ${a.value})` : null
    case 'pct_move': {
      if (p == null || !a.baseline) return null
      const ch = ((p - a.baseline) / a.baseline) * 100
      return Math.abs(ch) >= a.value ? `${name} moved ${ch.toFixed(2)}% from ${a.baseline} (threshold ${a.value}%)` : null
    }
    case 'rsi_above': return ctx.rsi != null && ctx.rsi >= a.value ? `${name} RSI is ${ctx.rsi.toFixed(1)} (above ${a.value})` : null
    case 'rsi_below': return ctx.rsi != null && ctx.rsi <= a.value ? `${name} RSI is ${ctx.rsi.toFixed(1)} (below ${a.value})` : null
  }
}
