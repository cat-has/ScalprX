import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useApp } from '../../app/store'
import { useCandles } from '../../hooks/useCandles'
import { PriceChart } from './PriceChart'
import { Card, Field, Seg } from '../ui'
import { TIMEFRAMES, type Timeframe } from '../../types'
import { PairPicker } from '../markets/PairPicker'
import { prettyPair, fmtPrice, fmtPct, fmtAge } from '../../lib/format'
import { go } from '../../app/router'
import { writeJson } from '../../hooks/useLocalStorage'
import { useNow } from '../../hooks/useNow'

export function ChartPage() {
  const { settings, setSettings, watchlist, tickerOf } = useApp()
  const [rsiOn, setRsiOn] = useState(true)
  const [macdOn, setMacdOn] = useState(false)
  const [picker, setPicker] = useState(false)
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [tp, setTp] = useState('')
  const now = useNow(5000)
  const pair = settings.chartPair
  const tf = settings.chartTimeframe
  const { candles, loading, error, source, updatedAt, reload } = useCandles(pair, tf, settings.refreshSec)
  const t = tickerOf(pair)
  const pairs = Array.from(new Set([pair, ...watchlist]))
  const n = (s: string) => (s.trim() === '' ? null : Number(s))
  const theme = document.documentElement.dataset.theme ?? 'dark'
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Chart workspace</h1><p>Real exchange candles with EMA overlays, RSI and MACD. Add reference levels to plan a trade.</p></div>
        <div className="row">
          <select aria-label="Trading pair" value={pair} onChange={(e) => setSettings({ chartPair: e.target.value })} style={{ width: 150 }}>{pairs.map((p) => <option key={p} value={p}>{prettyPair(p)}</option>)}</select>
          <button className="btn" onClick={() => setPicker(true)}><Plus size={16} /> Other pair</button>
          <Seg<Timeframe> label="Timeframe" value={tf} options={TIMEFRAMES.map((x) => ({ v: x, label: x }))} onChange={(v) => setSettings({ chartTimeframe: v })} />
        </div>
      </div>
      <Card pad={false} title={<span>{prettyPair(pair)} {t && <><span className="num">{fmtPrice(t.price)}</span> <span className={t.changePct >= 0 ? 'up' : 'down'}>{fmtPct(t.changePct)}</span></>}</span>}
        actions={<>
          <label className="chip"><input type="checkbox" checked={rsiOn} onChange={(e) => setRsiOn(e.target.checked)} /> RSI</label>
          <label className="chip"><input type="checkbox" checked={macdOn} onChange={(e) => setMacdOn(e.target.checked)} /> MACD</label>
          <span className="faint" style={{ fontSize: 12 }}>{updatedAt ? `Candles ${fmtAge(updatedAt, now)}${source ? ` via ${source}` : ''}` : ''}</span>
          <button className="btn sm" onClick={reload} aria-label="Refresh candles"><RefreshCw size={14} /></button>
        </>}>
        <PriceChart candles={candles} loading={loading} error={error} ind={settings.indicators} lines={{ entry: n(entry), stop: n(stop), takeProfit: n(tp) }} showRsi={rsiOn} showMacd={macdOn} resetKey={`${pair}|${tf}`} theme={theme} />
      </Card>
      <Card title="Reference levels">
        <div className="formgrid">
          <Field label="Entry" id="c-entry"><input id="c-entry" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder={t ? fmtPrice(t.price) : ''} /></Field>
          <Field label="Stop-loss" id="c-stop"><input id="c-stop" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} /></Field>
          <Field label="Take-profit" id="c-tp"><input id="c-tp" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} /></Field>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={!n(entry) || !n(stop)} onClick={() => { const e = n(entry)!, s = n(stop)!; writeJson('scalprx.prefill', { pair, direction: s < e ? 'long' : 'short', entry: e, stop: s, takeProfit: n(tp) }); go('/risk') }}>Size this trade</button>
          <span className="faint">Lines are visual aids only. Zoom with the wheel or pinch, drag to pan, hover for OHLC.</span>
        </div>
      </Card>
      {picker && <PairPicker exclude={[]} onPick={(s) => setSettings({ chartPair: s })} onClose={() => setPicker(false)} />}
    </div>
  )
}
