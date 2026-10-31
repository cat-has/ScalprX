import { useMemo, useState } from 'react'
import { useApp } from '../../app/store'
import { Banner, Card, Field, Seg } from '../../components/ui'
import { db } from '../../services/storage/db'
import { fmtNum, fromLocalInput, toLocalInput, uid } from '../../lib/format'
import { go } from '../../app/router'
import { EMOTIONS, MISTAKES, SETUPS } from './constants'
import { TIMEFRAMES, type Direction, type Trade } from '../../types'
import { pnl } from '../../lib/risk'
import { readJson } from '../../hooks/useLocalStorage'

type Draft = { pair?: string; direction?: Direction; entry?: number; stop?: number; takeProfit?: number | null; size?: number; setup?: string; timeframe?: string }
export function TradeEditor({ id }: { id?: string }) {
  const { trades, settings } = useApp()
  const existing = id ? trades.find((t) => t.id === id) : undefined
  if (id && !existing) return <div className="page"><Banner tone="warn"><span>{trades.length ? 'Trade not found.' : 'Loading trade...'}</span></Banner></div>
  return <EditorForm key={existing?.id ?? 'new'} existing={existing} fee={settings.feePct} />
}
function EditorForm({ existing, fee }: { existing?: Trade; fee: number }) {
  const draft = useMemo(() => (existing ? null : readJson<Draft | null>('scalprx.tradedraft', null)), [existing])
  const { settings } = useApp()
  const [pair, setPair] = useState(existing?.pair ?? draft?.pair ?? settings.chartPair)
  const [dir, setDir] = useState<Direction>(existing?.direction ?? draft?.direction ?? 'long')
  const [entry, setEntry] = useState(String(existing?.entry ?? (draft?.entry ? +draft.entry.toPrecision(8) : '')))
  const [exit, setExit] = useState(existing?.exit != null ? String(existing.exit) : '')
  const [stop, setStop] = useState(String(existing?.stop ?? (draft?.stop ? +draft.stop.toPrecision(8) : '')))
  const [tp, setTp] = useState(existing?.takeProfit != null ? String(existing.takeProfit) : draft?.takeProfit ? String(+draft.takeProfit.toPrecision(8)) : '')
  const [size, setSize] = useState(String(existing?.size ?? (draft?.size ? +draft.size.toPrecision(8) : '')))
  const [fees, setFees] = useState(String(existing?.fees ?? 0))
  const [opened, setOpened] = useState(toLocalInput(existing?.openedAt ?? Date.now()))
  const [closed, setClosed] = useState(toLocalInput(existing?.closedAt))
  const [setup, setSetup] = useState(existing?.setup ?? draft?.setup ?? '')
  const [tf, setTf] = useState(existing?.timeframe ?? draft?.timeframe ?? '5m')
  const [why, setWhy] = useState(existing?.rationale ?? '')
  const [emotion, setEmotion] = useState(existing?.emotion ?? '')
  const [quality, setQuality] = useState(existing?.executionQuality ?? 3)
  const [mistakes, setMistakes] = useState<string[]>(existing?.mistakes ?? [])
  const [pre, setPre] = useState(existing?.preNotes ?? '')
  const [post, setPost] = useState(existing?.postNotes ?? '')
  const [errs, setErrs] = useState<string[]>([])
  const n = (s: string) => (s.trim() === '' ? NaN : Number(s))
  const preview = useMemo(() => {
    const e = n(entry), x = n(exit), s = n(size), st = n(stop), f = n(fees) || 0
    if (!(e > 0 && x > 0 && s > 0)) return null
    const gross = pnl(dir, e, x, s)
    const risk = st > 0 ? Math.abs(e - st) * s : NaN
    return { gross, net: gross - f, r: risk > 0 ? (gross - f) / risk : null, risk }
  }, [entry, exit, size, stop, fees, dir])
  const save = async () => {
    const e = [] as string[]
    const E = n(entry), X = exit.trim() === '' ? null : n(exit), S = n(stop), Z = n(size), F = fees.trim() === '' ? 0 : n(fees), T = tp.trim() === '' ? null : n(tp)
    const o = fromLocalInput(opened), c = fromLocalInput(closed)
    if (!/^[A-Za-z0-9/]{3,20}$/.test(pair.trim())) e.push('Pair is required (for example BTCUSDT).')
    if (!(E > 0)) e.push('Entry must be greater than 0.')
    if (X !== null && !(X > 0)) e.push('Exit must be greater than 0.')
    if (!(S > 0)) e.push('Stop-loss must be greater than 0.')
    if (T !== null && !(T > 0)) e.push('Take-profit must be greater than 0.')
    if (!(Z > 0)) e.push('Position size must be greater than 0.')
    if (!(F >= 0)) e.push('Fees cannot be negative.')
    if (o == null) e.push('Open time is required.')
    if ((X === null) !== (c === null)) e.push('Set both exit price and close time, or leave both empty for an open trade.')
    if (o != null && c != null && c < o) e.push('Close time cannot be before open time.')
    if (E > 0 && S > 0) { if (dir === 'long' && S >= E) e.push('For a long, stop-loss must be below entry.'); if (dir === 'short' && S <= E) e.push('For a short, stop-loss must be above entry.') }
    setErrs(e)
    if (e.length) { window.scrollTo?.({ top: 0 }); return }
    const t: Trade = { id: existing?.id ?? uid(), pair: pair.trim().toUpperCase().replace('/', ''), direction: dir, entry: E, exit: X, stop: S, takeProfit: T, size: Z, fees: F, openedAt: o as number, closedAt: c, setup: setup.trim(), timeframe: tf, rationale: why, emotion, executionQuality: quality, mistakes, preNotes: pre, postNotes: post, createdAt: existing?.createdAt ?? Date.now() }
    await db.trades.put(t)
    localStorage.removeItem('scalprx.tradedraft')
    go(`/journal/${t.id}`)
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1>{existing ? 'Edit trade' : 'New trade'}</h1><p>Leave exit and close time empty to record an open trade.</p></div></div>
      {errs.length > 0 && <Banner tone="down"><div role="alert"><strong>Fix these before saving</strong><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{errs.map((x) => <li key={x}>{x}</li>)}</ul></div></Banner>}
      <Card title="Execution">
        <div className="stack">
          <Seg<Direction> label="Direction" value={dir} options={[{ v: 'long', label: 'Long', cls: 'long' }, { v: 'short', label: 'Short', cls: 'short' }]} onChange={setDir} />
          <div className="formgrid">
            <Field label="Pair" id="t-pair"><input id="t-pair" value={pair} onChange={(e) => setPair(e.target.value)} /></Field>
            <Field label="Entry" id="t-en"><input id="t-en" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} /></Field>
            <Field label="Exit" id="t-ex"><input id="t-ex" inputMode="decimal" value={exit} onChange={(e) => setExit(e.target.value)} /></Field>
            <Field label="Stop-loss" id="t-st"><input id="t-st" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} /></Field>
            <Field label="Take-profit" id="t-tp"><input id="t-tp" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} /></Field>
            <Field label="Position size (units)" id="t-sz"><input id="t-sz" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} /></Field>
            <Field label={`Total fees (${settings.currency})`} id="t-fe" hint="Entry plus exit fees paid."><div className="row" style={{ flexWrap: 'nowrap' }}><input id="t-fe" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} /><button type="button" className="btn sm" onClick={() => { const e = n(entry), x = n(exit), s = n(size); if (e > 0 && s > 0) setFees(String(+(((e + (x > 0 ? x : e)) * s * fee) / 100).toFixed(6))) }}>Estimate</button></div></Field>
            <Field label="Opened" id="t-op"><input id="t-op" type="datetime-local" value={opened} onChange={(e) => setOpened(e.target.value)} /></Field>
            <Field label="Closed" id="t-cl"><input id="t-cl" type="datetime-local" value={closed} onChange={(e) => setClosed(e.target.value)} /></Field>
          </div>
          {preview && <div className="banner info"><span>Result preview: gross {fmtNum(preview.gross)}, net {fmtNum(preview.net)} {settings.currency}{preview.r != null ? `, ${preview.r.toFixed(2)}R` : ''} (planned risk {fmtNum(preview.risk)}).</span></div>}
        </div>
      </Card>
      <Card title="Context">
        <div className="formgrid">
          <Field label="Setup type" id="t-su"><input id="t-su" list="setups" value={setup} onChange={(e) => setSetup(e.target.value)} /><datalist id="setups">{SETUPS.map((s) => <option key={s} value={s} />)}</datalist></Field>
          <Field label="Timeframe" id="t-tf"><select id="t-tf" value={tf} onChange={(e) => setTf(e.target.value)}>{TIMEFRAMES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Emotional state" id="t-em"><select id="t-em" value={emotion} onChange={(e) => setEmotion(e.target.value)}><option value="">Not recorded</option>{EMOTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Execution quality (1-5)" id="t-q"><select id="t-q" value={quality} onChange={(e) => setQuality(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: '12px 0 0' }}><legend className="lbl">Mistake tags</legend>
          <div className="row">{MISTAKES.map((m) => <label key={m} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" checked={mistakes.includes(m)} onChange={(e) => setMistakes(e.target.checked ? [...mistakes, m] : mistakes.filter((x) => x !== m))} /> {m}</label>)}</div></fieldset>
      </Card>
      <Card title="Notes">
        <div className="stack">
          <Field label="Rationale (why this trade?)" id="t-why"><textarea id="t-why" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
          <Field label="Before the trade" id="t-pre"><textarea id="t-pre" value={pre} onChange={(e) => setPre(e.target.value)} /></Field>
          <Field label="After the trade (review)" id="t-post"><textarea id="t-post" value={post} onChange={(e) => setPost(e.target.value)} /></Field>
        </div>
      </Card>
      <div className="row"><button className="btn primary" onClick={() => void save()}>Save trade</button><button className="btn" onClick={() => go(existing ? `/journal/${existing.id}` : '/journal')}>Cancel</button></div>
    </div>
  )
}
