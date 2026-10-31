import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, NotebookPen } from 'lucide-react'
import { useApp } from '../../app/store'
import { calculateRisk } from '../../lib/risk'
import { Banner, Card, Disclaimer, Field, Seg } from '../../components/ui'
import { fmtNum, fmtPrice } from '../../lib/format'
import type { Direction } from '../../types'
import { readJson } from '../../hooks/useLocalStorage'
import { go } from '../../app/router'

const PRESETS = [0.25, 0.5, 1, 2]
interface Prefill { pair?: string; direction?: Direction; entry?: number; stop?: number; takeProfit?: number | null; setup?: string; timeframe?: string }
export function RiskPage() {
  const { settings, setSettings, tickerOf } = useApp()
  const pre = useMemo(() => readJson<Prefill | null>('scalprx.prefill', null), [])
  useEffect(() => { if (pre) localStorage.removeItem('scalprx.prefill') }, [pre])
  const [dir, setDir] = useState<Direction>(pre?.direction ?? 'long')
  const [equity, setEquity] = useState(String(settings.accountEquity))
  const [riskPct, setRiskPct] = useState(String(settings.riskPct))
  const [entry, setEntry] = useState(pre?.entry != null ? String(+pre.entry.toPrecision(8)) : '')
  const [stop, setStop] = useState(pre?.stop != null ? String(+pre.stop.toPrecision(8)) : '')
  const [tp, setTp] = useState(pre?.takeProfit != null ? String(+pre.takeProfit.toPrecision(8)) : '')
  const [fee, setFee] = useState(String(settings.feePct))
  const [lev, setLev] = useState(String(settings.leverage))
  const [mmr, setMmr] = useState(String(settings.maintenanceMarginPct))
  const [touched, setTouched] = useState(false)
  const pair = pre?.pair ?? settings.chartPair
  const live = tickerOf(pair)
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
  const res = useMemo(() => calculateRisk({ direction: dir, equity: num(equity), riskPct: num(riskPct), entry: num(entry), stop: num(stop), takeProfit: tp.trim() === '' ? null : num(tp), feePct: num(fee), leverage: num(lev), maintenanceMarginPct: num(mmr) || 0 }), [dir, equity, riskPct, entry, stop, tp, fee, lev, mmr])
  const cur = settings.currency
  const showErrors = touched && !res.valid
  const bad = (v: string) => touched && (v.trim() === '' || !(Number(v) > 0))
  const logTrade = () => {
    writeJson2({ pair, direction: dir, entry: num(entry), stop: num(stop), takeProfit: tp.trim() === '' ? null : num(tp), size: res.size, setup: pre?.setup, timeframe: pre?.timeframe })
    go('/journal/new')
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Risk calculator</h1><p>Position size from the risk you choose. Linear contracts only (spot or USDT-margined). Not for inverse contracts.</p></div></div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title="Inputs">
          <div className="stack">
            <div className="row"><Seg<Direction> label="Direction" value={dir} options={[{ v: 'long', label: 'Long', cls: 'long' }, { v: 'short', label: 'Short', cls: 'short' }]} onChange={(d) => { setDir(d); setTouched(true) }} />
              {live && <button className="btn sm" onClick={() => setEntry(String(live.price))}>Use live {pair.replace('USDT', '')} price</button>}</div>
            <div className="formgrid">
              <Field label={`Account equity (${cur})`} id="r-eq"><input id="r-eq" inputMode="decimal" className={bad(equity) ? 'invalid' : ''} value={equity} onChange={(e) => { setEquity(e.target.value); setTouched(true) }} onBlur={() => setSettings({ accountEquity: num(equity) > 0 ? num(equity) : settings.accountEquity })} /></Field>
              <Field label="Risk per trade (%)" id="r-rp" hint="Presets are examples, not advice."><input id="r-rp" inputMode="decimal" className={bad(riskPct) ? 'invalid' : ''} value={riskPct} onChange={(e) => { setRiskPct(e.target.value); setTouched(true) }} /></Field>
            </div>
            <div className="row" role="group" aria-label="Risk presets">{PRESETS.map((p) => <button key={p} className="btn sm" aria-pressed={num(riskPct) === p} onClick={() => { setRiskPct(String(p)); setTouched(true) }}>{p}%</button>)}</div>
            <div className="formgrid">
              <Field label="Entry price" id="r-en"><input id="r-en" inputMode="decimal" className={bad(entry) ? 'invalid' : ''} value={entry} onChange={(e) => { setEntry(e.target.value); setTouched(true) }} /></Field>
              <Field label="Stop-loss price" id="r-st"><input id="r-st" inputMode="decimal" className={bad(stop) ? 'invalid' : ''} value={stop} onChange={(e) => { setStop(e.target.value); setTouched(true) }} /></Field>
              <Field label="Take-profit (optional)" id="r-tp"><input id="r-tp" inputMode="decimal" value={tp} onChange={(e) => { setTp(e.target.value); setTouched(true) }} /></Field>
            </div>
            <div className="formgrid">
              <Field label="Fee per side (%)" id="r-fee" hint="Charged on entry and exit notional."><input id="r-fee" inputMode="decimal" value={fee} onChange={(e) => { setFee(e.target.value); setTouched(true) }} onBlur={() => setSettings({ feePct: num(fee) >= 0 ? num(fee) : settings.feePct })} /></Field>
              <Field label="Leverage (x)" id="r-lev"><input id="r-lev" inputMode="decimal" value={lev} onChange={(e) => { setLev(e.target.value); setTouched(true) }} /></Field>
              <Field label="Maintenance margin (%)" id="r-mm" hint="Exchange-specific. Default is a rough guess."><input id="r-mm" inputMode="decimal" value={mmr} onChange={(e) => { setMmr(e.target.value); setTouched(true) }} /></Field>
            </div>
          </div>
        </Card>
        <div className="stack">
          {showErrors && <Banner tone="down"><div role="alert"><strong>Check your inputs</strong><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{res.errors.map((e) => <li key={e}>{e}</li>)}</ul></div></Banner>}
          {!touched && !res.valid && <Banner tone="info"><span>Enter an entry and stop-loss to size the position.</span></Banner>}
          {res.valid && (
            <Card title="Results" actions={<button className="btn sm" onClick={logTrade}><NotebookPen size={14} /> Log as trade</button>}>
              <div className="grid g2" style={{ gap: 10 }}>
                <Res k="Position size" v={`${fmtNum(res.size, 6)} ${pair.replace('USDT', '') || 'units'}`} big />
                <Res k="Risk amount" v={`${fmtNum(res.riskAmount)} ${cur}`} big />
                <Res k="Loss at stop (incl. fees)" v={`-${fmtNum(res.totalLossAtStop)} ${cur}`} tone="down" sub={`Price loss ${fmtNum(res.grossLossAtStop)} + fees ${fmtNum(res.feesAtStop)}`} />
                <Res k="Gross profit at target" v={res.grossProfitAtTp != null ? `+${fmtNum(res.grossProfitAtTp)} ${cur}` : '-'} tone="up" />
                <Res k="Net profit at target" v={res.netProfitAtTp != null ? `${res.netProfitAtTp >= 0 ? '+' : '-'}${fmtNum(Math.abs(res.netProfitAtTp))} ${cur}` : '-'} tone={res.netProfitAtTp != null && res.netProfitAtTp < 0 ? 'down' : 'up'} sub={res.feesAtTp != null ? `After fees of ${fmtNum(res.feesAtTp)}` : 'Enter a take-profit'} />
                <Res k="Reward / risk" v={res.rewardRisk != null ? `1 : ${res.rewardRisk.toFixed(2)}` : '-'} sub={res.netRewardRisk != null ? `Net of fees 1 : ${res.netRewardRisk.toFixed(2)}` : undefined} />
                <Res k="Notional exposure" v={`${fmtNum(res.notional)} ${cur}`} />
                <Res k="Approx. margin required" v={`${fmtNum(res.margin)} ${cur}`} sub={`${res.marginPctOfEquity.toFixed(1)}% of equity at ${num(lev)}x`} />
                <Res k="Est. liquidation price" v={res.liquidationPrice != null ? fmtPrice(res.liquidationPrice) : 'n/a at 1x'} tone={res.liquidationPrice != null ? 'down' : undefined} />
              </div>
              {res.warnings.map((w) => <div key={w} className="banner warn" style={{ marginTop: 10 }}><AlertTriangle size={16} /><span>{w}</span></div>)}
            </Card>
          )}
          <Card title="How this is calculated">
            <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>Risk amount = equity x risk %. Size = risk amount / (|entry - stop| + fees per unit), so the total loss at the stop, fees included, equals your chosen risk.</li>
              <li>Long P&amp;L = (exit - entry) x size. Short P&amp;L = (entry - exit) x size. Fees = fee % x notional on entry and on exit.</li>
              <li>Margin = notional / leverage. Liquidation is an isolated-margin approximation: entry x (1 - 1/leverage + maintenance %) for longs, entry x (1 + 1/leverage - maintenance %) for shorts. Real liquidation depends on the exchange's tiers, funding, fees and margin mode.</li>
              <li>Results are shown rounded for display; calculations use full precision. This tool plans trades, it does not place them.</li>
            </ul>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
function writeJson2(v: unknown) { try { localStorage.setItem('scalprx.tradedraft', JSON.stringify(v)) } catch { /* ignore */ } }
function Res({ k, v, sub, tone, big }: { k: string; v: string; sub?: string; tone?: 'up' | 'down'; big?: boolean }) {
  return <div className="card stat" style={{ boxShadow: 'none' }}><div className="k">{k}</div><div className={`v ${tone ?? ''}`} style={{ fontSize: big ? 20 : 16 }}>{v}</div>{sub && <div className="s">{sub}</div>}</div>
}
