import { useState } from 'react'
import { useApp } from '../../app/store'
import { Banner, Card, Confirm, Stat } from '../../components/ui'
import { resultOf } from '../../lib/metrics'
import { fmtMoney, fmtNum, fmtR, fmtTime, prettyPair } from '../../lib/format'
import { Link, go } from '../../app/router'
import { db } from '../../services/storage/db'
import { sessionOf } from '../../lib/session'

export function TradeDetail({ id }: { id: string }) {
  const { trades, settings } = useApp()
  const [del, setDel] = useState(false)
  const t = trades.find((x) => x.id === id)
  if (!t) return <div className="page"><Banner tone="warn"><span>Trade not found. <Link to="/journal">Back to journal</Link></span></Banner></div>
  const r = resultOf(t)
  const cur = settings.currency
  const planned = Math.abs(t.entry - t.stop) * t.size
  const plannedRR = t.takeProfit ? Math.abs(t.takeProfit - t.entry) / Math.abs(t.entry - t.stop) : null
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{prettyPair(t.pair)} <span className={`chip ${t.direction === 'long' ? 'up' : 'down'}`}>{t.direction}</span> {!r && <span className="chip warn">open</span>}</h1><p>Opened {fmtTime(t.openedAt)}{t.closedAt ? `, closed ${fmtTime(t.closedAt)}` : ''} - {sessionOf(t.openedAt)} session</p></div>
        <div className="row"><Link to="/journal" className="btn">Back</Link><Link to={`/journal/${t.id}/edit`} className="btn">Edit</Link><button className="btn danger" onClick={() => setDel(true)}>Delete</button></div>
      </div>
      <div className="grid g4">
        <Stat label="Net P&L" value={r ? fmtMoney(r.net, cur) : '-'} tone={r ? (r.net >= 0 ? 'up' : 'down') : undefined} sub={r ? `Gross ${fmtNum(r.gross)} minus fees ${fmtNum(t.fees)}` : 'Trade still open'} />
        <Stat label="R-multiple" value={fmtR(r?.r)} tone={r?.r != null ? (r.r >= 0 ? 'up' : 'down') : undefined} sub="Net P&L / planned risk" />
        <Stat label="Planned risk" value={`${fmtNum(planned)} ${cur}`} sub={plannedRR ? `Planned R:R 1 : ${plannedRR.toFixed(2)}` : 'No take-profit set'} />
        <Stat label="Actual vs planned" value={r ? `${fmtNum(Math.abs(Math.min(0, r.net)))} / ${fmtNum(planned)}` : '-'} sub="Loss realised / loss planned" />
      </div>
      <Card title="Execution"><div className="tablewrap"><table><tbody>
        <tr><td>Entry</td><td className="num">{t.entry}</td><td>Exit</td><td className="num">{t.exit ?? '-'}</td></tr>
        <tr><td>Stop-loss</td><td className="num">{t.stop}</td><td>Take-profit</td><td className="num">{t.takeProfit ?? '-'}</td></tr>
        <tr><td>Size</td><td className="num">{t.size}</td><td>Fees</td><td className="num">{t.fees}</td></tr>
        <tr><td>Setup</td><td>{t.setup || '-'}</td><td>Timeframe</td><td>{t.timeframe || '-'}</td></tr>
        <tr><td>Emotion</td><td>{t.emotion || '-'}</td><td>Execution quality</td><td>{t.executionQuality} / 5</td></tr>
        <tr><td>Mistakes</td><td colSpan={3}>{t.mistakes.length ? t.mistakes.map((m) => <span key={m} className="chip warn" style={{ marginRight: 4 }}>{m}</span>) : 'None tagged'}</td></tr>
      </tbody></table></div></Card>
      <div className="grid g3">
        <Card title="Rationale"><p style={{ whiteSpace: 'pre-wrap' }}>{t.rationale || <span className="faint">No rationale recorded.</span>}</p></Card>
        <Card title="Before the trade"><p style={{ whiteSpace: 'pre-wrap' }}>{t.preNotes || <span className="faint">Nothing recorded.</span>}</p></Card>
        <Card title="After the trade"><p style={{ whiteSpace: 'pre-wrap' }}>{t.postNotes || <span className="faint">Nothing recorded.</span>}</p></Card>
      </div>
      {del && <Confirm title="Delete this trade?" confirmLabel="Delete trade" message={<p>This permanently removes the trade from this browser.</p>} onCancel={() => setDel(false)} onConfirm={() => { void db.trades.delete(t.id); go('/journal') }} />}
    </div>
  )
}
