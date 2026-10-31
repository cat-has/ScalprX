import { useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, Upload } from 'lucide-react'
import { useApp, useData } from '../../app/store'
import { useToast } from '../../app/toast'
import { Banner, Card, Confirm, DemoBanner, Empty, SampleButton, Stat } from '../../components/ui'
import { closedResults, computeMetrics, resultOf } from '../../lib/metrics'
import { csvToTrades, tradesToCsv } from '../../lib/csv'
import { db } from '../../services/storage/db'
import { dayKey, fmtMoney, fmtPct, fmtR, fmtTime, prettyPair } from '../../lib/format'
import { Link, go } from '../../app/router'
import type { Trade } from '../../types'

export function download(name: string, text: string, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function JournalPage() {
  const { settings, setDemo } = useApp()
  const { trades, demo } = useData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [pair, setPair] = useState('')
  const [dir, setDir] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [del, setDel] = useState<Trade | null>(null)
  const [msg, setMsg] = useState<{ tone: 'info' | 'warn' | 'down'; text: string; errors?: string[] } | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const cur = settings.currency
  const pairs = useMemo(() => Array.from(new Set(trades.map((t) => t.pair))).sort(), [trades])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return trades.filter((t) => {
      if (pair && t.pair !== pair) return false
      if (dir && t.direction !== dir) return false
      if (status === 'open' && t.exit != null) return false
      if (status === 'closed' && t.exit == null) return false
      const k = dayKey(t.openedAt)
      if (from && k < from) return false
      if (to && k > to) return false
      if (s && ![t.pair, t.setup, t.rationale, t.postNotes, t.preNotes, t.emotion, t.mistakes.join(' ')].join(' ').toLowerCase().includes(s)) return false
      return true
    })
  }, [trades, q, pair, dir, status, from, to])
  const m = computeMetrics(closedResults(filtered))
  const onImport = async (f: File | undefined) => {
    if (!f) return
    if (demo) return
    if (f.size > 5_000_000) { setMsg({ tone: 'down', text: 'File is larger than 5 MB.' }); toast('Import failed: file is larger than 5 MB.', 'error'); return }
    const text = await f.text()
    const r = csvToTrades(text, new Set(trades.map((t) => t.id)))
    if (r.trades.length) await db.trades.bulkPut(r.trades)
    toast(`Imported ${r.trades.length} trade(s)${r.errors.length ? `, ${r.errors.length} rejected` : ''}.`, r.trades.length ? 'success' : 'error')
    setMsg({ tone: r.errors.length ? 'warn' : 'info', text: `Imported ${r.trades.length} trade(s). Skipped ${r.skipped} duplicate(s). ${r.errors.length} row(s) rejected.`, errors: r.errors.slice(0, 12) })
    if (file.current) file.current.value = ''
  }
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Trade journal</h1><p>Record what you planned, what happened and what you learned. Stored only in this browser.</p></div>
        <div className="row">
          <input ref={file} type="file" accept=".csv,text/csv" hidden aria-label="Import CSV file" onChange={(e) => void onImport(e.target.files?.[0])} />
          <button className="btn" disabled={demo} onClick={() => file.current?.click()}><Upload size={16} /> Import CSV</button>
          <button className="btn" disabled={!trades.length || demo} onClick={() => { download(`scalprx-journal-${dayKey(Date.now())}.csv`, tradesToCsv(trades)); toast(`Exported ${trades.length} trades to CSV.`) }}><Download size={16} /> Export CSV</button>
          <button className="btn primary" disabled={demo} onClick={() => go('/journal/new')}><Plus size={16} /> New trade</button>
        </div>
      </div>
      {demo && <DemoBanner onExit={() => setDemo(false)} />}
      {msg && <Banner tone={msg.tone}><div style={{ flex: 1 }}>{msg.text}{msg.errors && msg.errors.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{msg.errors.map((e) => <li key={e}>{e}</li>)}</ul>}</div><button className="btn sm" onClick={() => setMsg(null)}>Dismiss</button></Banner>}
      <div className="grid g4">
        <Stat label="Trades (closed)" value={m.total} sub={`${filtered.length - m.total} open or filtered`} />
        <Stat label="Win rate" value={m.winRate != null ? fmtPct(m.winRate, 1).replace('+', '') : '-'} />
        <Stat label="Net P&L" value={fmtMoney(m.netPnl, cur)} tone={m.netPnl > 0 ? 'up' : m.netPnl < 0 ? 'down' : undefined} />
        <Stat label="Average R" value={fmtR(m.avgR)} tone={m.avgR != null ? (m.avgR >= 0 ? 'up' : 'down') : undefined} />
      </div>
      <Card pad={false} title="Trades" actions={<span className="faint">{filtered.length} shown</span>}>
        <div className="card-b" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="formgrid">
            <div className="field"><label htmlFor="j-q">Search</label><div style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--faint)' }} /><input id="j-q" style={{ paddingLeft: 30 }} placeholder="Pair, setup, notes, tags" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
            <div className="field"><label htmlFor="j-p">Pair</label><select id="j-p" value={pair} onChange={(e) => setPair(e.target.value)}><option value="">All</option>{pairs.map((p) => <option key={p} value={p}>{prettyPair(p)}</option>)}</select></div>
            <div className="field"><label htmlFor="j-d">Direction</label><select id="j-d" value={dir} onChange={(e) => setDir(e.target.value)}><option value="">All</option><option value="long">Long</option><option value="short">Short</option></select></div>
            <div className="field"><label htmlFor="j-s">Status</label><select id="j-s" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="closed">Closed</option><option value="open">Open</option></select></div>
            <div className="field"><label htmlFor="j-f">From</label><input id="j-f" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field"><label htmlFor="j-t">To</label><input id="j-t" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        </div>
        {!trades.length ? <Empty title="Your journal is empty" action={<div className="row" style={{ justifyContent: 'center' }}><button className="btn primary" onClick={() => go('/journal/new')}>Record your first trade</button><SampleButton onClick={() => { setDemo(true); toast('Showing sample data. Nothing is saved.', 'info') }} /></div>}>Trades you record here stay on this device. Nothing is pre-filled or simulated.</Empty>
          : !filtered.length ? <Empty title="No trades match these filters" />
          : (
            <div className="tablewrap"><table>
              <thead><tr><th>Opened</th><th>Pair</th><th>Side</th><th className="r">Entry</th><th className="r">Exit</th><th className="r">Net P&amp;L</th><th className="r">R</th><th>Setup</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{filtered.map((t) => {
                const r = resultOf(t)
                return (
                  <tr key={t.id}>
                    <td>{fmtTime(t.openedAt)}</td><td><Link to={`/journal/${t.id}`} style={{ fontWeight: 600 }}>{prettyPair(t.pair)}</Link></td>
                    <td><span className={`badge ${t.direction}`}>{t.direction}</span></td>
                    <td className="r num">{t.entry}</td><td className="r num">{t.exit ?? <span className="badge open">open</span>}</td>
                    <td className={`r num ${r ? (r.net >= 0 ? 'up' : 'down') : ''}`}>{r ? fmtMoney(r.net, '').trim() : '-'}</td>
                    <td className={`r num ${r?.r != null ? (r.r >= 0 ? 'up' : 'down') : ''}`}>{r?.r != null ? fmtR(r.r) : '-'}</td>
                    <td>{t.setup || '-'}</td>
                    <td><div className="row" style={{ flexWrap: 'nowrap' }}>{!demo && <><Link to={`/journal/${t.id}/edit`} className="btn sm">Edit</Link><button className="btn sm danger" onClick={() => setDel(t)}>Delete</button></>}</div></td>
                  </tr>
                )
              })}</tbody></table></div>
          )}
      </Card>
      {del && <Confirm title="Delete this trade?" confirmLabel="Delete trade" message={<p>{prettyPair(del.pair)} {del.direction} opened {fmtTime(del.openedAt)} will be permanently removed from this browser. Export a backup first if unsure.</p>} onCancel={() => setDel(null)} onConfirm={() => { void db.trades.delete(del.id); setDel(null); toast('Trade deleted.') }} />}
    </div>
  )
}
