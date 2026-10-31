import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { Banner, Card, Field, Stat } from '../../components/ui'
import { DEFAULT_POST, DEFAULT_PRE, evaluateDiscipline, summarize } from '../../lib/discipline'
import { dayKey, fmtMoney } from '../../lib/format'
import { db } from '../../services/storage/db'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useNow } from '../../hooks/useNow'
import { useToast } from '../../app/toast'

export function DisciplinePage() {
  const { settings, setSettings, trades } = useApp()
  const now = useNow(30000)
  const toast = useToast()
  const r = settings.discipline
  const today = dayKey(now)
  const status = useMemo(() => evaluateDiscipline(trades, r, settings.accountEquity, now), [trades, r, settings.accountEquity, now])
  const [checks, setChecks] = useLocalStorage<{ date: string; pre: string[]; post: string[] }>('scalprx.checks.v1', { date: today, pre: [], post: [] })
  const [pre, setPre] = useLocalStorage<string[]>('scalprx.prelist.v1', DEFAULT_PRE)
  const [post, setPost] = useLocalStorage<string[]>('scalprx.postlist.v1', DEFAULT_POST)
  const [newPre, setNewPre] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const day = checks.date === today ? checks : { date: today, pre: [], post: [] }
  useEffect(() => { void db.notes.get(today).then((n) => setNote(n?.text ?? '')) }, [today])
  const setR = (p: Partial<typeof r>) => setSettings({ discipline: { ...r, ...p } })
  const num = (v: string) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0)
  const toggle = (k: 'pre' | 'post', item: string) => setChecks({ ...day, [k]: day[k].includes(item) ? day[k].filter((x) => x !== item) : [...day[k], item] })
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0)
  const wk = new Date(d0); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7))
  const dayS = summarize(trades, d0.getTime(), d0.getTime() + 86400000)
  const weekS = summarize(trades, wk.getTime(), wk.getTime() + 7 * 86400000)
  const cur = settings.currency
  const inCooldown = status.cooldownUntil != null && status.cooldownUntil > now
  return (
    <div className="page">
      <div className="page-head"><div><h1>Trading discipline</h1><p>Your own rules, checked against the trades you record.</p></div></div>
      <Banner tone="info"><span>These are educational safeguards. ScalprX cannot block orders on an exchange. They only warn you when your recorded trades exceed your own limits.</span></Banner>
      {status.breaches.length === 0 ? <Banner tone="info"><span>No rule breaches in today's recorded trades.</span></Banner> : status.breaches.map((b) => <Banner key={b.id} tone={b.severity === 'breach' ? 'down' : 'warn'}><span><strong>{b.severity === 'breach' ? 'Limit breached: ' : 'Heads up: '}</strong>{b.message}</span></Banner>)}
      {inCooldown && <Banner tone="warn"><span>Planned cooldown active until {new Date(status.cooldownUntil!).toLocaleTimeString()}. Step away and review before the next trade.</span></Banner>}
      <div className="grid g4">
        <Stat label="Trades today" value={`${status.todayTrades}${r.maxTradesPerDay ? ` / ${r.maxTradesPerDay}` : ''}`} />
        <Stat label="Net P&L today" value={fmtMoney(status.todayNet, cur)} tone={status.todayNet < 0 ? 'down' : status.todayNet > 0 ? 'up' : undefined} sub={r.dailyLossLimit ? `Limit -${r.dailyLossLimit} ${cur}` : undefined} />
        <Stat label="Consecutive losses" value={`${status.consecutiveLosses}${r.maxConsecLosses ? ` / ${r.maxConsecLosses}` : ''}`} tone={r.maxConsecLosses && status.consecutiveLosses >= r.maxConsecLosses ? 'down' : undefined} />
        <Stat label="This week" value={fmtMoney(weekS.net, cur)} sub={`${weekS.trades} trades${weekS.winRate != null ? `, ${weekS.winRate.toFixed(0)}% wins` : ''} | Today ${dayS.trades}`} />
      </div>
      <Card title="Your limits (0 turns a limit off)">
        <div className="formgrid">
          <Field label={`Daily loss limit (${cur})`} id="d-dl"><input id="d-dl" inputMode="decimal" value={r.dailyLossLimit} onChange={(e) => setR({ dailyLossLimit: num(e.target.value) })} /></Field>
          <Field label="Max risk per trade (%)" id="d-mr" hint="Compared with your account equity in Settings."><input id="d-mr" inputMode="decimal" value={r.maxRiskPct} onChange={(e) => setR({ maxRiskPct: num(e.target.value) })} /></Field>
          <Field label="Max consecutive losses" id="d-cl"><input id="d-cl" inputMode="numeric" value={r.maxConsecLosses} onChange={(e) => setR({ maxConsecLosses: Math.round(num(e.target.value)) })} /></Field>
          <Field label="Max trades per day" id="d-mt"><input id="d-mt" inputMode="numeric" value={r.maxTradesPerDay} onChange={(e) => setR({ maxTradesPerDay: Math.round(num(e.target.value)) })} /></Field>
          <Field label="Cooldown after streak (min)" id="d-cd"><input id="d-cd" inputMode="numeric" value={r.cooldownMin} onChange={(e) => setR({ cooldownMin: Math.round(num(e.target.value)) })} /></Field>
        </div>
      </Card>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title="Pre-trade checklist" actions={<button className="btn sm" onClick={() => setChecks({ ...day, pre: [] })}>Reset today</button>}>
          {pre.map((i) => <label key={i} className="cond" style={{ cursor: 'pointer' }}><input type="checkbox" checked={day.pre.includes(i)} onChange={() => toggle('pre', i)} /> <span>{i}</span></label>)}
          <div className="sbar lg" role="progressbar" aria-label="Pre-trade checklist progress" aria-valuemin={0} aria-valuemax={pre.length} aria-valuenow={day.pre.length} style={{ marginTop: 8 }}><i style={{ width: `${pre.length ? (day.pre.length / pre.length) * 100 : 0}%`, background: day.pre.length === pre.length && pre.length > 0 ? 'var(--up)' : 'var(--accent)' }} /></div>
          <p className="faint" style={{ marginTop: 4 }}>{day.pre.length} of {pre.length} confirmed{day.pre.length === pre.length && pre.length > 0 ? ' - ready to trade your plan' : ''}.</p>
          <div className="row"><input aria-label="Add checklist item" placeholder="Add your own item" value={newPre} onChange={(e) => setNewPre(e.target.value)} /><button className="btn" onClick={() => { if (newPre.trim()) { setPre([...pre, newPre.trim()]); setNewPre('') } }}>Add</button><button className="btn ghost" onClick={() => setPre(DEFAULT_PRE)}>Restore defaults</button></div>
        </Card>
        <Card title="Post-trade review" actions={<button className="btn sm" onClick={() => setChecks({ ...day, post: [] })}>Reset today</button>}>
          {post.map((i) => <label key={i} className="cond" style={{ cursor: 'pointer' }}><input type="checkbox" checked={day.post.includes(i)} onChange={() => toggle('post', i)} /> <span>{i}</span></label>)}
          <div className="sbar lg" role="progressbar" aria-label="Post-trade review progress" aria-valuemin={0} aria-valuemax={post.length} aria-valuenow={day.post.length} style={{ marginTop: 8 }}><i style={{ width: `${post.length ? (day.post.length / post.length) * 100 : 0}%`, background: day.post.length === post.length && post.length > 0 ? 'var(--up)' : 'var(--accent)' }} /></div>
          <p className="faint" style={{ marginTop: 4 }}>{day.post.length} of {post.length} done.</p>
          <button className="btn ghost" onClick={() => setPost(DEFAULT_POST)}>Restore defaults</button>
        </Card>
      </div>
      <Card title={`Session notes - ${today}`}>
        <textarea aria-label="Session notes" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false) }} placeholder="How was your focus? What went well? What will you change tomorrow?" style={{ minHeight: 110 }} />
        <div className="row" style={{ marginTop: 8 }}><button className="btn primary" onClick={() => void db.notes.put({ date: today, text: note }).then(() => { setSaved(true); toast('Session notes saved.') })}>Save notes</button>{saved && <span className="up" role="status">Saved</span>}</div>
      </Card>
    </div>
  )
}
