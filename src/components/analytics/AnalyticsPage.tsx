import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { Card, Empty, Stat } from '../ui'
import { byPair, bySession, bySetup, byTimeframe, closedResults, computeMetrics, equityCurve, type GroupRow, type Metrics } from '../../lib/metrics'
import { fmtMoney, fmtNum, fmtPct, fmtR, dayKey } from '../../lib/format'
import { go } from '../../app/router'

function EquityChart({ points }: { points: { t: number; v: number }[] }) {
  if (points.length < 2) return <p className="faint">At least two closed trades are needed to draw the equity curve.</p>
  const W = 700, H = 180, P = 8
  const vs = [0, ...points.map((p) => p.v)]
  const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P)
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const last = points[points.length - 1].v
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={`Cumulative net P&L curve over ${points.length} trades, ending at ${fmtNum(last)}`}>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--border2)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke={last >= 0 ? 'var(--up)' : 'var(--down)'} strokeWidth="2" />
    </svg>
  )
}
function Breakdown({ title, rows, cur }: { title: string; rows: GroupRow[]; cur: string }) {
  return (
    <Card pad={false} title={title}>
      {!rows.length ? <Empty title="No data">Close some trades to see this breakdown.</Empty> : (
        <div className="tablewrap"><table>
          <thead><tr><th>Group</th><th className="r">Trades</th><th className="r">Win rate</th><th className="r">Net ({cur})</th><th className="r">Avg R</th><th className="r">Expectancy</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.key}><td>{r.key}</td><td className="r num">{r.metrics.total}</td><td className="r num">{fmtNum(r.metrics.winRate, 0)}%</td><td className={`r num ${r.metrics.netPnl >= 0 ? 'up' : 'down'}`}>{fmtNum(r.metrics.netPnl)}</td><td className="r num">{fmtR(r.metrics.avgR)}</td><td className="r num">{fmtNum(r.metrics.expectancy)}</td></tr>)}</tbody>
        </table></div>
      )}
    </Card>
  )
}
const pf = (m: Metrics) => (m.profitFactorInfinite ? 'Infinite' : m.profitFactor != null ? m.profitFactor.toFixed(2) : '-')
export function AnalyticsPage() {
  const { trades, settings } = useApp()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const cur = settings.currency
  const results = useMemo(() => closedResults(trades).filter((r) => { const k = dayKey(r.trade.closedAt ?? 0); return (!from || k >= from) && (!to || k <= to) }), [trades, from, to])
  const m = useMemo(() => computeMetrics(results), [results])
  const curve = useMemo(() => equityCurve(results), [results])
  return (
    <div className="page">
      <div className="page-head"><div><h1>Performance analytics</h1><p>Computed only from the closed trades you recorded. Nothing is simulated.</p></div>
        <div className="row"><label className="lbl" htmlFor="a-f">From</label><input id="a-f" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} /><label className="lbl" htmlFor="a-t">To</label><input id="a-t" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} /></div></div>
      {!m.total ? <Card><Empty title="No closed trades to analyse" action={<button className="btn primary" onClick={() => go('/journal/new')}>Record a trade</button>}>Analytics appear once you have closed trades in the journal.</Empty></Card> : (
        <>
          <div className="grid g4">
            <Stat label="Total trades" value={m.total} sub={`${m.wins} wins, ${m.losses} losses, ${m.breakeven} flat`} />
            <Stat label="Win rate" value={m.winRate != null ? `${m.winRate.toFixed(1)}%` : '-'} />
            <Stat label="Net P&L" value={fmtMoney(m.netPnl, cur)} tone={m.netPnl >= 0 ? 'up' : 'down'} sub={`Fees paid ${fmtNum(m.fees)}`} />
            <Stat label="Profit factor" value={pf(m)} sub="Gross wins / gross losses (net of fees)" />
            <Stat label="Expectancy / trade" value={fmtMoney(m.expectancy, cur)} tone={m.expectancy != null && m.expectancy >= 0 ? 'up' : 'down'} />
            <Stat label="Average R" value={fmtR(m.avgR)} />
            <Stat label="Average win / loss" value={<span style={{ fontSize: 16 }}>{fmtNum(m.avgWin)} / {fmtNum(m.avgLoss)}</span>} />
            <Stat label="Max drawdown" value={`${fmtNum(m.maxDrawdown)} ${cur}`} tone={m.maxDrawdown > 0 ? 'down' : undefined} sub="Peak-to-trough of cumulative net P&L" />
          </div>
          <Card title="Equity curve (cumulative net P&L)"><EquityChart points={curve} /></Card>
          <div className="grid g2"><Breakdown title="By pair" rows={byPair(results)} cur={cur} /><Breakdown title="By timeframe" rows={byTimeframe(results)} cur={cur} /><Breakdown title="By setup" rows={bySetup(results)} cur={cur} /><Breakdown title="By session (UTC)" rows={bySession(results)} cur={cur} /></div>
        </>
      )}
      <Card title="How each metric is calculated">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          <li>Only closed trades count. Net P&amp;L = gross P&amp;L - fees. Win = net above 0; loss = net below 0.</li>
          <li>Win rate = wins / closed trades. Average win and loss use net P&amp;L of winning and losing trades.</li>
          <li>Profit factor = sum of winning net P&amp;L / absolute sum of losing net P&amp;L. Shown as "-" with no losses and no wins, "Infinite" with wins but no losses.</li>
          <li>Expectancy = net P&amp;L / number of closed trades. R-multiple = net P&amp;L / planned risk (|entry - stop| x size); average R ignores trades with zero planned risk.</li>
          <li>Max drawdown = largest drop from a running peak of the cumulative net P&amp;L curve (starting at 0), ordered by close time. It is based on recorded trades only, not your account balance.</li>
          <li>Sessions use UTC close time: Asia 00-07, Europe 07-13, US 13-21, off-hours 21-24.</li>
          <li>Win rate shown: {fmtPct(m.winRate, 1).replace('+', '')}. Small samples are noisy; avoid drawing conclusions from a few trades.</li>
        </ul>
      </Card>
    </div>
  )
}
