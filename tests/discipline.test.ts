import { describe, expect, it } from 'vitest'
import { evaluateDiscipline } from '../src/lib/discipline'
import { evaluateAlert } from '../src/lib/alerts'
import type { Alert, Trade } from '../src/types'
import { DEFAULT_SETTINGS } from '../src/lib/settings'

const now = new Date(2026, 5, 10, 15, 0).getTime()
const mk = (i: number, exit: number): Trade => ({
  id: `d${i}`, pair: 'BTCUSDT', direction: 'long', entry: 100, exit, stop: 95, takeProfit: null, size: 1, fees: 0,
  openedAt: now - (10 - i) * 60000, closedAt: now - (10 - i) * 60000 + 30000, setup: '', timeframe: '5m', rationale: '', emotion: '',
  executionQuality: 3, mistakes: [], preNotes: '', postNotes: '', createdAt: 0,
})

describe('discipline', () => {
  it('flags consecutive losses and daily loss limit', () => {
    const rules = { ...DEFAULT_SETTINGS.discipline, dailyLossLimit: 10, maxConsecLosses: 3 }
    const st = evaluateDiscipline([mk(1, 96), mk(2, 96), mk(3, 96)], rules, 1000, now)
    expect(st.consecutiveLosses).toBe(3)
    expect(st.breaches.map((b) => b.id)).toEqual(expect.arrayContaining(['daily', 'streak']))
  })
  it('no breaches with no trades', () => {
    expect(evaluateDiscipline([], DEFAULT_SETTINGS.discipline, 1000, now).breaches).toEqual([])
  })
})

describe('alerts', () => {
  const a: Alert = { id: '1', pair: 'BTCUSDT', kind: 'price_above', value: 100, cooldownMin: 5, mode: 'repeat', active: true, createdAt: 0 }
  it('triggers on condition', () => {
    expect(evaluateAlert(a, { price: 101 }, now)).toContain('BTC/USDT')
    expect(evaluateAlert(a, { price: 99 }, now)).toBeNull()
  })
  it('respects cooldown and once mode', () => {
    expect(evaluateAlert({ ...a, triggeredAt: now - 60000 }, { price: 101 }, now)).toBeNull()
    expect(evaluateAlert({ ...a, triggeredAt: now - 10 * 60000 }, { price: 101 }, now)).not.toBeNull()
    expect(evaluateAlert({ ...a, mode: 'once', triggeredAt: now - 99 * 60000 }, { price: 101 }, now)).toBeNull()
  })
  it('percentage move works both directions', () => {
    const p: Alert = { ...a, kind: 'pct_move', value: 2, baseline: 100 }
    expect(evaluateAlert(p, { price: 97.5 }, now)).not.toBeNull()
    expect(evaluateAlert(p, { price: 101 }, now)).toBeNull()
  })
})
