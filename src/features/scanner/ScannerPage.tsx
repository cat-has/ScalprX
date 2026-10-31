import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../../app/store'
import { useScanner } from '../../hooks/useScanner'
import { SetupCard } from '../../components/scanner/SetupCard'
import { Banner, Card, Disclaimer, Empty, Field, Seg } from '../../components/ui'
import { TIMEFRAMES, type Timeframe } from '../../types'
import { useNow } from '../../hooks/useNow'
import { FeedBanner } from '../../components/layout/FeedBanner'
import { fmtAge, prettyPair } from '../../lib/format'
import { readJson, writeJson } from '../../hooks/useLocalStorage'
import { useToast } from '../../app/toast'
import type { Setup } from '../../lib/scanner'

/** Soft two-note chime synthesised with the Web Audio API (no audio files). */
export function playChime(ctx: AudioContext): void {
  const t = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)
  ;([[880, 0], [1318.51, 0.13]] as const).forEach(([freq, dt]) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t + dt)
    g.gain.exponentialRampToValueAtTime(0.1, t + dt + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.75)
    o.connect(g).connect(master)
    o.start(t + dt)
    o.stop(t + dt + 0.8)
  })
}
/** Keys of setups with 5+ of 6 conditions on either side (pair|timeframe|side). */
export function qualifyingKeys(setups: Setup[]): Map<string, { pair: string; side: 'long' | 'short'; score: number }> {
  const out = new Map<string, { pair: string; side: 'long' | 'short'; score: number }>()
  for (const s of setups) {
    for (const side of ['long', 'short'] as const) {
      const sc = s[side]?.score ?? 0
      if (sc >= 5) out.set(`${s.pair}|${s.timeframe}|${side}`, { pair: s.pair, side, score: sc })
    }
  }
  return out
}

type Filter = 'all' | 'bullish' | 'bearish' | 'neutral' | 'insufficient'
export function ScannerPage() {
  const { settings, setSettings, watchlist, feed } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [cfgOpen, setCfgOpen] = useState(false)
  const now = useNow(5000)
  const toast = useToast()
  const [soundOn, setSoundOn] = useState<boolean>(() => readJson<boolean>('scalprx.scanner.sound', false))
  const audio = useRef<AudioContext | null>(null)
  const seen = useRef<Map<string, unknown> | null>(null)
  const seenTf = useRef(settings.scanner.timeframe)
  const getCtx = useCallback((): AudioContext | null => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audio.current ??= new Ctor()
      if (audio.current.state === 'suspended') void audio.current.resume()
      return audio.current
    } catch { return null }
  }, [])
  // Browsers only start audio after a user gesture; if sound was left on, unlock it on the first interaction.
  useEffect(() => {
    if (!soundOn) return
    const unlock = () => { getCtx() }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [soundOn, getCtx])
  useEffect(() => () => { void audio.current?.close(); audio.current = null }, [])
  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    writeJson('scalprx.scanner.sound', next)
    if (next) { const c = getCtx(); if (c) playChime(c); else toast('This browser does not support audio alerts.', 'error') }
  }
  const cfg = settings.scanner
  const spreads = useMemo(() => Object.fromEntries(feed.tickers.map((t) => [t.symbol, t.spreadPct])), [feed.tickers])
  const scan = useScanner(watchlist, cfg.timeframe, settings.indicators, cfg, spreads, Math.max(30, settings.refreshSec * 3))
  // Chime when a pair NEWLY reaches 5/6 or 6/6. The first scan (and a timeframe change) only sets the baseline, so opening the page is silent.
  useEffect(() => {
    if (!scan.finishedAt) return
    const current = qualifyingKeys(scan.setups)
    if (seenTf.current !== cfg.timeframe) { seenTf.current = cfg.timeframe; seen.current = null }
    const prev = seen.current
    seen.current = current
    if (!prev) return
    const fresh = [...current.entries()].filter(([k]) => !prev.has(k)).map(([, v]) => v)
    if (!fresh.length) return
    toast(`Scanner: ${fresh.map((f) => `${prettyPair(f.pair)} ${f.side} ${f.score}/6`).join(', ')}`, 'info')
    if (soundOn) { const c = getCtx(); if (c) playChime(c) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.finishedAt])
  const shown = scan.setups.filter((s) => filter === 'all' || s.bias === filter)
  const order = { bullish: 0, bearish: 1, neutral: 2, insufficient: 3 }
  shown.sort((a, b) => order[a.bias] - order[b.bias])
  const setC = (p: Partial<typeof cfg>) => setSettings({ scanner: { ...cfg, ...p } })
  const setI = (p: Partial<typeof settings.indicators>) => setSettings({ indicators: { ...settings.indicators, ...p } })
  const num = (v: string, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Setup scanner</h1><p>Transparent rules applied to real candles of your watchlist. Every condition is shown, met or not.</p></div>
        <div className="row">
          <Seg<Timeframe> label="Scanner timeframe" value={cfg.timeframe} options={TIMEFRAMES.map((x) => ({ v: x, label: x }))} onChange={(v) => setC({ timeframe: v })} />
          <button className="btn" onClick={() => setCfgOpen(!cfgOpen)} aria-expanded={cfgOpen}><SlidersHorizontal size={16} /> Configure</button>
          <button className="btn" onClick={scan.scanNow} disabled={scan.scanning}><RefreshCw size={16} /> {scan.scanning ? 'Scanning' : 'Scan now'}</button>
          <button className="btn" onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Chime on when a pair reaches 5/6 or 6/6 conditions' : 'Sound alerts are muted'}>{soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />} {soundOn ? 'Mute' : 'Unmute'}</button>
        </div>
      </div>
      <Banner tone="info"><span>These are rule-based, educational setups, not trade signals or advice. Indicators describe the past and do not guarantee outcomes.</span></Banner>
      <FeedBanner />
      {cfgOpen && (
        <Card title="Scanner and indicator settings">
          <div className="formgrid">
            <Field label="Minimum risk/reward" id="s-rr" hint="Target must offer at least this R:R."><input id="s-rr" type="number" step="0.1" min="0.5" value={cfg.minRR} onChange={(e) => setC({ minRR: num(e.target.value, 1.5) })} /></Field>
            <Field label="Stop distance (x ATR)" id="s-sl"><input id="s-sl" type="number" step="0.1" min="0.2" value={cfg.slAtr} onChange={(e) => setC({ slAtr: num(e.target.value, 1.5) })} /></Field>
            <Field label="Target distance (x ATR)" id="s-tp"><input id="s-tp" type="number" step="0.1" min="0.2" value={cfg.tpAtr} onChange={(e) => setC({ tpAtr: num(e.target.value, 2.5) })} /></Field>
            <Field label="Conditions required (of 6)" id="s-mc"><input id="s-mc" type="number" min="3" max="6" value={cfg.minConditions} onChange={(e) => setC({ minConditions: Math.min(6, Math.max(3, num(e.target.value, 5))) })} /></Field>
            <Field label="Min volume ratio" id="s-vr"><input id="s-vr" type="number" step="0.1" min="0.1" value={cfg.minVolRatio} onChange={(e) => setC({ minVolRatio: num(e.target.value, 1) })} /></Field>
            <Field label="EMA fast" id="i-ef"><input id="i-ef" type="number" min="2" value={settings.indicators.emaFast} onChange={(e) => setI({ emaFast: Math.round(num(e.target.value, 9)) })} /></Field>
            <Field label="EMA slow" id="i-es"><input id="i-es" type="number" min="3" value={settings.indicators.emaSlow} onChange={(e) => setI({ emaSlow: Math.round(num(e.target.value, 21)) })} /></Field>
            <Field label="RSI period" id="i-rsi"><input id="i-rsi" type="number" min="2" value={settings.indicators.rsi} onChange={(e) => setI({ rsi: Math.round(num(e.target.value, 14)) })} /></Field>
            <Field label="ATR period" id="i-atr"><input id="i-atr" type="number" min="2" value={settings.indicators.atr} onChange={(e) => setI({ atr: Math.round(num(e.target.value, 14)) })} /></Field>
            <Field label="VWAP window (candles)" id="i-vw"><input id="i-vw" type="number" min="10" value={settings.indicators.vwapWindow} onChange={(e) => setI({ vwapWindow: Math.round(num(e.target.value, 60)) })} /></Field>
            <Field label="MACD fast / slow / signal"><div className="row" style={{ flexWrap: 'nowrap' }}>
              <input aria-label="MACD fast" type="number" min="2" value={settings.indicators.macdFast} onChange={(e) => setI({ macdFast: Math.round(num(e.target.value, 12)) })} />
              <input aria-label="MACD slow" type="number" min="3" value={settings.indicators.macdSlow} onChange={(e) => setI({ macdSlow: Math.round(num(e.target.value, 26)) })} />
              <input aria-label="MACD signal" type="number" min="2" value={settings.indicators.macdSignal} onChange={(e) => setI({ macdSignal: Math.round(num(e.target.value, 9)) })} /></div></Field>
          </div>
        </Card>
      )}
      <div className="row">
        <Seg<Filter> label="Filter by bias" value={filter} options={(['all', 'bullish', 'bearish', 'neutral', 'insufficient'] as Filter[]).map((v) => ({ v, label: v === 'insufficient' ? 'No data' : v[0].toUpperCase() + v.slice(1) }))} onChange={setFilter} />
        <span className="faint" style={{ fontSize: 12 }}>{scan.finishedAt ? `Last scan ${fmtAge(scan.finishedAt, now)}` : scan.scanning ? 'First scan running...' : ''}</span>
      </div>
      {scan.error && <Banner tone="warn"><span>{scan.error}</span></Banner>}
      {scan.scanning && !scan.setups.length && <div className="grid g2">{[0, 1].map((i) => <div key={i} className="card card-b"><div className="skeleton" style={{ width: '60%' }} /><div className="skeleton" style={{ width: '90%', marginTop: 10 }} /><div className="skeleton" style={{ width: '75%', marginTop: 10 }} /></div>)}</div>}
      {!scan.scanning && !scan.setups.length && <Card><Empty title="No scan results yet">{watchlist.length ? 'The scan needs live candle data. Retry when the exchange API is reachable.' : 'Add pairs to your watchlist first.'}</Empty></Card>}
      <div className="stack">{shown.map((s) => <SetupCard key={`${s.pair}-${s.timeframe}`} s={s} now={now} compact={shown.length > 3} />)}</div>
      {scan.setups.length > 0 && !shown.length && <Card><Empty title="Nothing matches this filter" /></Card>}
      <Disclaimer />
    </div>
  )
}
