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
