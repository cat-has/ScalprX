import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Setup } from '../../lib/scanner'
import { setupFreshness } from '../../lib/scanner'
import { fmtAge, fmtPrice, prettyPair } from '../../lib/format'
import { Check } from '../ui'
import { go } from '../../app/router'
import { writeJson } from '../../hooks/useLocalStorage'
import { useApp } from '../../app/store'
import { useToast } from '../../app/toast'
import { CandlestickChart, Calculator } from 'lucide-react'

export function SetupCard({ s, now, compact = false }: { s: Setup; now: number; compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const { setSettings } = useApp()
  const toast = useToast()
  const fresh = setupFreshness(s, now)
  const v = s.values
  const dir = s.bias === 'bearish' ? 'short' : 'long'
  const side = s.bias === 'bearish' ? s.short : s.long
  const openChart = () => { writeJson('scalprx.chartlines', { pair: s.pair, entry: s.entry, stop: s.stop, takeProfit: s.takeProfit }); setSettings({ chartPair: s.pair, chartTimeframe: s.timeframe }); go('/chart') }
  const sendRisk = () => { writeJson('scalprx.prefill', { pair: s.pair, direction: dir, entry: s.entry, stop: s.stop, takeProfit: s.takeProfit, setup: 'Scanner', timeframe: s.timeframe, from: 'Scanner' }); toast(`Sent ${s.pair.replace('USDT', '')} ${dir} levels to the risk calculator.`, 'info'); go('/risk') }
  const unmet = side?.conditions.filter((c) => !c.met) ?? []
  const met = side?.conditions.filter((c) => c.met) ?? []
  return (
    <article className="card" aria-label={`${prettyPair(s.pair)} ${s.bias} setup`}>
      <div className="card-h">
        <div className="row"><strong>{prettyPair(s.pair)}</strong><span className="chip">{s.timeframe}</span><span className={`badge ${s.bias}`}>{s.bias === 'insufficient' ? 'no data' : s.bias}</span>{s.bias !== 'insufficient' && side && <span className="faint">{side.score}/6 {dir}</span>}</div>
        <div className="row">{s.entry != null && <><button className="btn sm" onClick={() => openChart()}><CandlestickChart size={14} /> Open in Chart</button><button className="btn sm" onClick={() => sendRisk()}><Calculator size={14} /> Send to Risk</button></>}<span className={`chip ${fresh === 'fresh' ? 'up' : 'warn'}`}>{fresh}</span><span className="faint" style={{ fontSize: 12 }}>{fmtAge(s.generatedAt, now)}</span>
          <button className="btn ghost icon-btn sm" aria-expanded={open} aria-label={open ? 'Collapse details' : 'Expand details'} onClick={() => setOpen(!open)}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></div>
      </div>
      <div className="card-b">
        <p className="muted" style={{ marginBottom: open ? 12 : 0 }}>{s.explanation}</p>
        {open && v && side && (
          <>
            <div className="grid g4" style={{ marginBottom: 12 }}>
              <div><div className="lbl">Entry reference</div><div className="num">{fmtPrice(s.entry)}</div></div>
              <div><div className="lbl">Stop-loss reference</div><div className="num down">{fmtPrice(s.stop)}</div></div>
              <div><div className="lbl">Take-profit reference</div><div className="num up">{fmtPrice(s.takeProfit)}</div></div>
              <div><div className="lbl">Risk / reward</div><div className="num">1 : {s.rewardRisk?.toFixed(2)}</div></div>
            </div>
            <div className="tablewrap" style={{ marginBottom: 12 }}>
              <table><tbody>
                <tr><td>EMA fast / slow</td><td className="num">{fmtPrice(v.emaFast)} / {fmtPrice(v.emaSlow)}</td><td>RSI</td><td className="num">{v.rsi.toFixed(1)}</td></tr>
                <tr><td>MACD / signal / hist</td><td className="num">{v.macd.toPrecision(3)} / {v.macdSignal.toPrecision(3)} / {v.macdHist.toPrecision(3)}</td><td>VWAP (rolling)</td><td className="num">{v.vwap != null ? fmtPrice(v.vwap) : '-'}</td></tr>
                <tr><td>Volume vs average</td><td className="num">{v.volRatio != null ? `${v.volRatio.toFixed(2)}x` : '-'}</td><td>ATR (% of price)</td><td className="num">{fmtPrice(v.atr)} ({v.atrPct.toFixed(2)}%)</td></tr>
                <tr><td>Support / resistance</td><td className="num">{v.support != null ? fmtPrice(v.support) : '-'} / {v.resistance != null ? fmtPrice(v.resistance) : '-'}</td><td>Trend / momentum</td><td>{s.trend} / {s.momentum}</td></tr>
                <tr><td>Spread</td><td className="num">{s.spreadPct != null ? `${s.spreadPct.toFixed(3)}%` : 'n/a'}</td><td>Last candle</td><td>{new Date(s.candleTime).toLocaleTimeString()}</td></tr>
              </tbody></table>
            </div>
            <div className="grid g2">
              <div><h3 className="up" style={{ marginBottom: 4 }}>Conditions satisfied ({met.length})</h3>{met.length ? met.map((c) => <div className="cond" key={c.id}><Check ok /><div><div>{c.label}</div><div className="faint" style={{ fontSize: 12 }}>{c.detail}</div></div></div>) : <p className="faint">None.</p>}</div>
              <div><h3 className="down" style={{ marginBottom: 4 }}>Not satisfied ({unmet.length})</h3>{unmet.length ? unmet.map((c) => <div className="cond" key={c.id}><Check ok={false} /><div><div>{c.label}</div><div className="faint" style={{ fontSize: 12 }}>{c.detail}</div></div></div>) : <p className="faint">None.</p>}</div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={sendRisk}>Send to Risk Calculator</button>
              <button className="btn" onClick={openChart}>Open in Chart</button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
