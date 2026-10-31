import Dexie, { type Table } from 'dexie'
import type { Alert, AppNotification, SessionNote, Ticker, Trade } from '../../types'

export interface TickerSnapshot { id: 'tickers'; at: number; source: string; data: Ticker[] }
export interface KeyVal { key: string; value: unknown }

export class ScalprxDB extends Dexie {
  trades!: Table<Trade, string>
  alerts!: Table<Alert, string>
  notifications!: Table<AppNotification, string>
  notes!: Table<SessionNote, string>
  snapshots!: Table<TickerSnapshot, string>
  kv!: Table<KeyVal, string>
  constructor(name = 'scalprx') {
    super(name)
    this.version(1).stores({
      trades: 'id, pair, openedAt, closedAt',
      alerts: 'id, pair, active',
      notifications: 'id, createdAt',
      notes: 'date',
      snapshots: 'id',
      kv: 'key',
    })
  }
}
export const db = new ScalprxDB()

export interface Backup {
  app: 'scalprx'
  version: 1
  exportedAt: string
  trades: Trade[]
  alerts: Alert[]
  notes: SessionNote[]
  settings: unknown
  watchlist: unknown
}

export async function exportBackup(settings: unknown, watchlist: unknown): Promise<Backup> {
  return { app: 'scalprx', version: 1, exportedAt: new Date().toISOString(), trades: await db.trades.toArray(), alerts: await db.alerts.toArray(), notes: await db.notes.toArray(), settings, watchlist }
}

export function validateBackup(raw: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'File is not a JSON object.' }
  const b = raw as Partial<Backup>
  if (b.app !== 'scalprx') return { ok: false, error: 'This is not a ScalprX backup file.' }
  if (b.version !== 1) return { ok: false, error: `Unsupported backup version: ${String(b.version)}.` }
  if (!Array.isArray(b.trades) || !Array.isArray(b.alerts) || !Array.isArray(b.notes)) return { ok: false, error: 'Backup is missing trades, alerts or notes arrays.' }
  for (const t of b.trades) {
    const x = t as Partial<Trade>
    if (typeof x.id !== 'string' || typeof x.pair !== 'string' || !(x.direction === 'long' || x.direction === 'short') || !(Number(x.entry) > 0) || !(Number(x.stop) > 0) || !(Number(x.size) > 0) || !Number.isFinite(Number(x.openedAt))) {
      return { ok: false, error: `Backup contains an invalid trade record (id: ${String((t as Trade)?.id)}).` }
    }
  }
  return { ok: true, backup: b as Backup }
}

export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.trades, db.alerts, db.notes, async () => {
    await db.trades.bulkPut(b.trades)
    await db.alerts.bulkPut(b.alerts)
    await db.notes.bulkPut(b.notes)
  })
}

export async function resetAll(): Promise<void> {
  await Promise.all([db.trades.clear(), db.alerts.clear(), db.notifications.clear(), db.notes.clear(), db.snapshots.clear(), db.kv.clear()])
  Object.keys(localStorage).filter((k) => k.startsWith('scalprx.')).forEach((k) => localStorage.removeItem(k))
}
