import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Alert, AppNotification, Ticker, Trade } from '../types'
import { DEFAULT_PAIRS, DEFAULT_SETTINGS, mergeSettings, type Settings } from '../lib/settings'
import { readJson, writeJson } from '../hooks/useLocalStorage'
import { db } from '../services/storage/db'
import { describeError, fetchCandles, fetchTickers } from '../services/market-data'
import { evaluateAlert } from '../lib/alerts'
import { rsi, last } from '../lib/indicators'
import { uid } from '../lib/format'
import { makeDemoAlerts, makeDemoTrades } from '../lib/demo'
import { showBrowserNotification } from '../services/notifications/browser'

export type FeedStatus = 'loading' | 'live' | 'stale' | 'cached' | 'offline' | 'rate_limited' | 'error'
export interface Feed { status: FeedStatus; tickers: Ticker[]; updatedAt: number | null; source: string | null; error: string | null }

interface Ctx {
  settings: Settings
  setSettings: (p: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void
  watchlist: string[]
  setWatchlist: (w: string[]) => void
  feed: Feed
  refresh: () => void
  trades: Trade[]
  alerts: Alert[]
  notifications: AppNotification[]
  tickerOf: (symbol: string) => Ticker | undefined
  demo: boolean
  setDemo: (on: boolean) => void
  sample: { trades: Trade[]; alerts: Alert[]; notifications: AppNotification[] }
}
const AppCtx = createContext<Ctx | null>(null)
export const useApp = (): Ctx => {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp must be used inside AppProvider')
  return c
}
const SETTINGS_KEY = 'scalprx.settings.v1'
const WATCH_KEY = 'scalprx.watchlist.v1'

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => mergeSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS)))
  const [watchlist, setWatchlistState] = useState<string[]>(() => {
    const w = readJson<unknown>(WATCH_KEY, DEFAULT_PAIRS)
    return Array.isArray(w) && w.every((x) => typeof x === 'string') && w.length ? (w as string[]) : DEFAULT_PAIRS
  })
  const [feed, setFeed] = useState<Feed>({ status: 'loading', tickers: [], updatedAt: null, source: null, error: null })
  const settingsRef = useRef(settings)
  const watchRef = useRef(watchlist)
  const failures = useRef(0)

  const setSettings: Ctx['setSettings'] = useCallback((p) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...(typeof p === 'function' ? p(prev) : p) }
      writeJson(SETTINGS_KEY, next)
      return next
    })
  }, [])
  const setWatchlist = useCallback((w: string[]) => { setWatchlistState(w); writeJson(WATCH_KEY, w) }, [])
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { watchRef.current = watchlist }, [watchlist])

  // Theme
  useEffect(() => {
    const apply = () => {
      const t = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : settings.theme
      document.documentElement.dataset.theme = t
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f6fb' : '#0b1220')
    }
    apply()
    if (settings.theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  // Cached snapshot on first load (clearly labelled "cached")
  useEffect(() => {
    void db.snapshots.get('tickers').then((s) => {
      if (s) setFeed((f) => (f.status === 'loading' ? { status: 'cached', tickers: s.data, updatedAt: s.at, source: s.source, error: null } : f))
    }).catch(() => undefined)
  }, [])

  const poll = useCallback(async () => {
    const symbols = Array.from(new Set([...watchRef.current, settingsRef.current.chartPair]))
    try {
      const r = await fetchTickers(symbols)
      failures.current = 0
      const at = Date.now()
      setFeed({ status: 'live', tickers: r.data, updatedAt: at, source: r.source, error: null })
      void db.snapshots.put({ id: 'tickers', at, source: r.source, data: r.data }).catch(() => undefined)
    } catch (e) {
      failures.current++
      const d = describeError(e)
      setFeed((f) => ({ ...f, status: f.tickers.length ? (d.status === 'error' ? 'stale' : d.status) : d.status, error: d.message }))
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let stopped = false
    const loop = async () => {
      if (document.visibilityState === 'visible') await poll()
      if (stopped) return
      const base = Math.max(5, settingsRef.current.refreshSec) * 1000
      timer = setTimeout(() => void loop(), base * Math.min(8, 2 ** Math.max(0, failures.current - 1)))
    }
    void loop()
    const online = () => void poll()
    window.addEventListener('online', online)
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('online', online) }
  }, [poll])
  const watchKey = watchlist.join(',')
  useEffect(() => { void poll() }, [watchKey, settings.chartPair, poll])

  // Mark data stale when it stops updating
  useEffect(() => {
    const id = setInterval(() => {
      setFeed((f) => (f.status === 'live' && f.updatedAt && Date.now() - f.updatedAt > Math.max(45_000, settingsRef.current.refreshSec * 3000) ? { ...f, status: 'stale' } : f))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const trades = useLiveQuery(() => db.trades.orderBy('openedAt').reverse().toArray(), [], [] as Trade[])
  const alerts = useLiveQuery(() => db.alerts.toArray(), [], [] as Alert[])
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray(), [], [] as AppNotification[])

  // Alert engine (runs only while the app is open)
  const alertsRef = useRef(alerts)
  useEffect(() => { alertsRef.current = alerts }, [alerts])
  useEffect(() => {
    if (feed.status !== 'live') return
    void (async () => {
      const now = Date.now()
      for (const a of alertsRef.current) {
        if (!a.active) continue
        const price = feed.tickers.find((t) => t.symbol === a.pair)?.price ?? null
        let rsiVal: number | null = null
        if ((a.kind === 'rsi_above' || a.kind === 'rsi_below') && price != null) {
          try {
            const c = await fetchCandles(a.pair, a.timeframe ?? '5m', 120)
            rsiVal = last(rsi(c.data.map((x) => x.c), settingsRef.current.indicators.rsi))
          } catch { rsiVal = null }
        }
        const msg = evaluateAlert(a, { price, rsi: rsiVal }, now)
        if (msg) {
          await db.alerts.update(a.id, { triggeredAt: now, active: a.mode === 'once' ? false : true })
          await db.notifications.add({ id: uid(), alertId: a.id, message: msg, createdAt: now, read: false, dismissed: false })
          if (settingsRef.current.browserNotifications) showBrowserNotification('ScalprX alert', msg)
        }
      }
    })()
  }, [feed.updatedAt, feed.status, feed.tickers])

  const [demo, setDemoState] = useState<boolean>(() => sessionStorage.getItem('scalprx.demo') === '1')
  const setDemo = useCallback((on: boolean) => { setDemoState(on); try { if (on) sessionStorage.setItem('scalprx.demo', '1'); else sessionStorage.removeItem('scalprx.demo') } catch { /* ignore */ } }, [])
  const sample = useMemo(() => { const a = makeDemoAlerts(); return { trades: makeDemoTrades(), alerts: a.alerts, notifications: a.notifications } }, [])
  const tickerOf = useCallback((s: string) => feed.tickers.find((t) => t.symbol === s), [feed.tickers])
  const value = useMemo<Ctx>(() => ({ settings, setSettings, watchlist, setWatchlist, feed, refresh: () => void poll(), trades, alerts, notifications, tickerOf, demo, setDemo, sample }), [settings, setSettings, watchlist, setWatchlist, feed, poll, trades, alerts, notifications, tickerOf, demo, setDemo, sample])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

/** Journal-facing data. In sample-preview mode returns clearly separate sample records (read-only, never saved). */
export function useData() {
  const a = useApp()
  return a.demo
    ? { demo: true as const, trades: a.sample.trades, alerts: a.sample.alerts, notifications: a.sample.notifications }
    : { demo: false as const, trades: a.trades, alerts: a.alerts, notifications: a.notifications }
}
