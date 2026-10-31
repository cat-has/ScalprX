import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AppProvider } from '../src/app/store'
import { RiskPage } from '../src/features/risk/RiskPage'
import { JournalPage } from '../src/features/journal/JournalPage'
import { TradeEditor } from '../src/features/journal/TradeEditor'
import { db } from '../src/services/storage/db'

beforeEach(async () => {
  cleanup()
  localStorage.clear()
  await db.trades.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))))
})

describe('UI smoke tests (network failing, as when offline)', () => {
  it('risk calculator computes a position size', async () => {
    render(<AppProvider><RiskPage /></AppProvider>)
    fireEvent.change(screen.getByLabelText(/Account equity/), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText('Entry price'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Stop-loss price'), { target: { value: '95' } })
    fireEvent.change(screen.getByLabelText('Fee per side (%)'), { target: { value: '0' } })
    await waitFor(() => expect(screen.getByText('Position size')).toBeTruthy())
    expect(screen.getByText(/^20\.000000/)).toBeTruthy()
  })
  it('risk calculator shows an error for a wrong-side stop', async () => {
    render(<AppProvider><RiskPage /></AppProvider>)
    fireEvent.change(screen.getByLabelText('Entry price'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Stop-loss price'), { target: { value: '105' } })
    await waitFor(() => expect(screen.getByText(/stop-loss must be below the entry/)).toBeTruthy())
  })
  it('journal shows an honest empty state and lists saved trades', async () => {
    render(<AppProvider><JournalPage /></AppProvider>)
    expect(await screen.findByText('Your journal is empty')).toBeTruthy()
    await db.trades.put({ id: 'u1', pair: 'ETHUSDT', direction: 'long', entry: 100, exit: 110, stop: 95, takeProfit: null, size: 1, fees: 0, openedAt: Date.now() - 5000, closedAt: Date.now(), setup: 'Breakout', timeframe: '5m', rationale: '', emotion: '', executionQuality: 3, mistakes: [], preNotes: '', postNotes: '', createdAt: 0 })
    expect(await screen.findByRole('link', { name: 'ETH/USDT' })).toBeTruthy()
  })
  it('trade editor validates before saving', async () => {
    render(<AppProvider><TradeEditor /></AppProvider>)
    fireEvent.click(screen.getByText('Save trade'))
    expect(await screen.findByText(/Fix these before saving/)).toBeTruthy()
    expect(await db.trades.count()).toBe(0)
  })
})

import { DataPage } from '../src/features/settings/DataPage'
import { AnalyticsPage } from '../src/components/analytics/AnalyticsPage'
import { ToastProvider } from '../src/app/toast'
import { exportBackup } from '../src/services/storage/db'

const wrap = (ui: React.ReactElement) => render(<AppProvider><ToastProvider>{ui}</ToastProvider></AppProvider>)
const trade = { id: 'dp1', pair: 'BTCUSDT', direction: 'long' as const, entry: 100, exit: 105, stop: 95, takeProfit: null, size: 1, fees: 0, openedAt: 1, closedAt: 2, setup: '', timeframe: '5m', rationale: '', emotion: '', executionQuality: 3, mistakes: [], preNotes: '', postNotes: '', createdAt: 0 }

describe('Data page', () => {
  it('renders export, restore and reset controls', async () => {
    wrap(<DataPage />)
    expect(await screen.findByText(/Download full backup/)).toBeTruthy()
    expect(screen.getByText(/Export journal \(CSV\)/)).toBeTruthy()
    expect(screen.getByText(/Choose backup file/)).toBeTruthy()
    expect(screen.getByText(/Reset everything/)).toBeTruthy()
  })
  it('exports a backup and shows a toast', async () => {
    await db.trades.put(trade)
    const create = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    wrap(<DataPage />)
    fireEvent.click(await screen.findByText(/Download full backup/))
    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(await screen.findAllByText(/Backup exported: 1 trades/)).toBeTruthy()
  })
  it('restores a valid backup file and rejects an invalid one', async () => {
    await db.trades.put(trade)
    const good = await exportBackup({ theme: 'light', refreshSec: 30 }, ['BTCUSDT', 'ETHUSDT'])
    await db.trades.clear()
    wrap(<DataPage />)
    const input = (await screen.findByLabelText('Choose backup file')) as HTMLInputElement
    const mk = (obj: unknown) => { const f = new File([JSON.stringify(obj)], 'b.json', { type: 'application/json' }); Object.defineProperty(f, 'text', { value: () => Promise.resolve(JSON.stringify(obj)) }); return f }
    fireEvent.change(input, { target: { files: [mk({ app: 'nope' })] } })
    expect(await screen.findAllByText(/not a ScalprX backup/)).toBeTruthy()
    expect(await db.trades.count()).toBe(0)
    fireEvent.change(input, { target: { files: [mk(good)] } })
    await waitFor(async () => expect(await db.trades.count()).toBe(1))
    expect(JSON.parse(localStorage.getItem('scalprx.settings.v1') ?? '{}').refreshSec).toBe(30)
  })
})

describe('Sample preview', () => {
  it('shows sample metrics without writing to the database', async () => {
    wrap(<AnalyticsPage />)
    fireEvent.click(await screen.findByText('Preview with sample data'))
    expect(await screen.findByText(/previewing generated sample records/)).toBeTruthy()
    expect(await screen.findByText('R-multiple distribution')).toBeTruthy()
    expect(await db.trades.count()).toBe(0)
  })
})
