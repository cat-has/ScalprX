import { useMemo, useState } from 'react'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useApp } from '../../app/store'
import { useScanner } from '../../hooks/useScanner'
import { SetupCard } from '../../components/scanner/SetupCard'
import { Banner, Card, Disclaimer, Empty, Field, Seg } from '../../components/ui'
import { TIMEFRAMES, type Timeframe } from '../../types'
import { useNow } from '../../hooks/useNow'
import { FeedBanner } from '../../components/layout/FeedBanner'
import { fmtAge } from '../../lib/format'

type Filter = 'all' | 'bullish' | 'bearish' | 'neutral' | 'insufficient'
export function ScannerPage() {
  const { settings, setSettings, watchlist, feed } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [cfgOpen, setCfgOpen] = useState(false)
  const now = useNow(5000)
  const cfg = settings.scanner
  const spreads = useMemo(() => Object.fromEntries(feed.tickers.map((t) => [t.symbol, t.spreadPct])), [feed.tickers])
  const scan = useScanner(watchlist, cfg.timeframe, settings.indicators, cfg, spreads, Math.max(30, settings.refreshSec * 3))
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
