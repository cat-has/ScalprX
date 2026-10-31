import { beforeEach, describe, expect, it } from 'vitest'
import { db, exportBackup, resetAll, restoreBackup, validateBackup } from '../src/services/storage/db'
import type { Trade } from '../src/types'

const t: Trade = { id: 's1', pair: 'BTCUSDT', direction: 'long', entry: 100, exit: 105, stop: 95, takeProfit: null, size: 1, fees: 0, openedAt: 1, closedAt: 2, setup: '', timeframe: '5m', rationale: '', emotion: '', executionQuality: 3, mistakes: [], preNotes: '', postNotes: '', createdAt: 0 }

describe('storage', () => {
  beforeEach(async () => { await resetAll() })
  it('persists, exports, resets and restores', async () => {
    await db.trades.put(t)
    const b = await exportBackup({ theme: 'dark' }, ['BTCUSDT'])
    expect(validateBackup(JSON.parse(JSON.stringify(b))).ok).toBe(true)
    await resetAll()
    expect(await db.trades.count()).toBe(0)
    await restoreBackup(b)
    expect((await db.trades.get('s1'))?.entry).toBe(100)
  })
  it('rejects invalid backups', () => {
    expect(validateBackup({ app: 'other' }).ok).toBe(false)
    expect(validateBackup({ app: 'scalprx', version: 1, trades: [{ id: 1 }], alerts: [], notes: [] }).ok).toBe(false)
    expect(validateBackup(null).ok).toBe(false)
  })
})
