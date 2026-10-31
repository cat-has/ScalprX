import { useState } from 'react'
import { Bell, BellOff, Trash2 } from 'lucide-react'
import { useApp, useData } from '../../app/store'
import { useToast } from '../../app/toast'
import { Banner, Card, Confirm, DemoBanner, Empty, Field, SampleButton } from '../../components/ui'
import { db } from '../../services/storage/db'
import { describeAlert } from '../../lib/alerts'
import { fmtAge, fmtPrice, prettyPair, uid } from '../../lib/format'
import type { Alert, AlertKind, Timeframe } from '../../types'
import { TIMEFRAMES } from '../../types'
import { notificationPermission, requestNotificationPermission } from '../../services/notifications/browser'
import { useNow } from '../../hooks/useNow'

const KINDS: { v: AlertKind; label: string }[] = [
  { v: 'price_above', label: 'Price at or above' }, { v: 'price_below', label: 'Price at or below' }, { v: 'pct_move', label: 'Moves by % from now' },
  { v: 'rsi_above', label: 'RSI at or above' }, { v: 'rsi_below', label: 'RSI at or below' },
]
export function AlertsPage() {
  const { watchlist, settings, setSettings, tickerOf, setDemo } = useApp()
  const { alerts, notifications, demo } = useData()
  const toast = useToast()
  const now = useNow(10000)
  const [pair, setPair] = useState(settings.chartPair)
  const [kind, setKind] = useState<AlertKind>('price_above')
  const [value, setValue] = useState('')
  const [tf, setTf] = useState<Timeframe>('5m')
  const [cool, setCool] = useState('15')
  const [mode, setMode] = useState<'once' | 'repeat'>('once')
  const [err, setErr] = useState<string | null>(null)
  const [del, setDel] = useState<Alert | null>(null)
  const perm = notificationPermission()
  const pairs = Array.from(new Set([pair, ...watchlist]))
  const price = tickerOf(pair)?.price
  const add = async () => {
    if (demo) return
    const v = Number(value)
    if (!(v > 0)) { setErr('Enter a value greater than 0.'); return }
    if ((kind === 'rsi_above' || kind === 'rsi_below') && v > 100) { setErr('RSI must be between 0 and 100.'); return }
    if (kind === 'pct_move' && price == null) { setErr('A live price is needed to set the baseline for a percentage alert.'); return }
    setErr(null)
    const a: Alert = { id: uid(), pair, kind, value: v, baseline: kind === 'pct_move' ? price : undefined, timeframe: kind.startsWith('rsi') ? tf : undefined, cooldownMin: Math.max(0, Number(cool) || 0), mode, active: true, createdAt: Date.now() }
    await db.alerts.add(a); setValue(''); toast(`Alert created: ${describeAlert(a)}.`)
  }
  const enableBrowser = async () => { const p = await requestNotificationPermission(); setSettings({ browserNotifications: p === 'granted' }); toast(p === 'granted' ? 'Browser notifications enabled.' : 'Browser notifications were not allowed.', p === 'granted' ? 'success' : 'error') }
  const unreadList = notifications.filter((n) => !n.dismissed)
  return (
    <div className="page">
      <div className="page-head"><div><h1>Alerts and notifications</h1><p>Alerts are checked while ScalprX is open and receiving live data.</p></div></div>
      {demo && <DemoBanner onExit={() => setDemo(false)} />}
      <Banner tone="warn"><span><strong>Important:</strong> ScalprX has no server. Alerts cannot fire while the app is closed or the device is asleep, and browser notifications may be delayed or blocked by your OS. Do not rely on these alerts for risk management; use exchange-side stop orders and alerts for that.</span></Banner>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card title="New alert">
          <div className="stack">
            <div className="formgrid">
              <Field label="Pair" id="al-p"><select id="al-p" value={pair} onChange={(e) => setPair(e.target.value)}>{pairs.map((p) => <option key={p} value={p}>{prettyPair(p)}</option>)}</select></Field>
              <Field label="Condition" id="al-k"><select id="al-k" value={kind} onChange={(e) => setKind(e.target.value as AlertKind)}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}</select></Field>
              <Field label={kind === 'pct_move' ? 'Percent' : kind.startsWith('rsi') ? 'RSI level' : 'Price'} id="al-v" hint={price != null && kind.startsWith('price') ? `Current ${fmtPrice(price)}` : undefined}><input id="al-v" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
              {kind.startsWith('rsi') && <Field label="RSI timeframe" id="al-tf"><select id="al-tf" value={tf} onChange={(e) => setTf(e.target.value as Timeframe)}>{TIMEFRAMES.map((x) => <option key={x}>{x}</option>)}</select></Field>}
              <Field label="Cooldown (minutes)" id="al-c" hint="Minimum time between repeat triggers."><input id="al-c" inputMode="numeric" value={cool} onChange={(e) => setCool(e.target.value)} /></Field>
              <Field label="Mode" id="al-m"><select id="al-m" value={mode} onChange={(e) => setMode(e.target.value as 'once' | 'repeat')}><option value="once">Trigger once</option><option value="repeat">Repeat after cooldown</option></select></Field>
            </div>
            {err && <p className="down" role="alert">{err}</p>}
            <div className="row"><button className="btn primary" disabled={demo} onClick={() => void add()}>Create alert</button></div>
          </div>
        </Card>
        <Card title="Browser notifications">
          <p className="muted">Optional. After you allow them, triggered alerts also show a system notification while the app is open or running in the background.</p>
          {perm === 'unsupported' ? <p className="warn">This browser does not support notifications.</p> : perm === 'denied' ? <p className="warn">Notifications are blocked in your browser settings. Allow them for this site to enable this option.</p> : (
            <div className="row"><span className={`chip ${settings.browserNotifications && perm === 'granted' ? 'up' : ''}`}>{settings.browserNotifications && perm === 'granted' ? 'On' : 'Off'}</span>
              {settings.browserNotifications && perm === 'granted' ? <button className="btn" onClick={() => setSettings({ browserNotifications: false })}><BellOff size={16} /> Turn off</button> : <button className="btn" onClick={() => void enableBrowser()}><Bell size={16} /> Allow notifications</button>}</div>
          )}
        </Card>
      </div>
      <Card pad={false} title="Your alerts">
        {!alerts.length ? <Empty title="No alerts yet" action={<SampleButton onClick={() => { setDemo(true); toast('Showing sample data. Nothing is saved.', 'info') }} />}>Create a price, percentage or RSI alert above.</Empty> : (
          <div className="tablewrap"><table><thead><tr><th>Condition</th><th>Status</th><th>Last triggered</th><th>Cooldown</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {alerts.map((a) => (
              <tr key={a.id}><td>{describeAlert(a)}</td>
                <td><span className={`badge ${a.active ? 'bullish' : a.triggeredAt ? 'insufficient' : 'neutral'}`}>{a.active ? 'Active' : a.triggeredAt ? 'Triggered' : 'Paused'}</span></td>
                <td>{a.triggeredAt ? fmtAge(a.triggeredAt, now) : '-'}</td><td>{a.cooldownMin} min, {a.mode}</td>
                <td>{!demo && <div className="row" style={{ flexWrap: 'nowrap' }}><button className="btn sm" onClick={() => { void db.alerts.update(a.id, { active: !a.active, ...(a.active ? {} : { triggeredAt: undefined }) }); toast(a.active ? 'Alert paused.' : 'Alert re-armed.', 'info') }}>{a.active ? 'Pause' : 'Re-arm'}</button><button className="btn sm danger" aria-label={`Delete alert ${describeAlert(a)}`} onClick={() => setDel(a)}><Trash2 size={14} /></button></div>}</td></tr>
            ))}</tbody></table></div>
        )}
      </Card>
      <Card pad={false} title="Notification center" actions={unreadList.length > 0 && !demo && <><button className="btn sm" onClick={() => void db.notifications.bulkPut(notifications.map((n) => ({ ...n, read: true })))}>Mark all read</button><button className="btn sm" onClick={() => void db.notifications.bulkPut(notifications.map((n) => ({ ...n, dismissed: true })))}>Dismiss all</button></>}>
        {!unreadList.length ? <Empty title="No notifications">Triggered alerts appear here with their timestamp.</Empty> : unreadList.map((n) => (
          <div key={n.id} className="card-b" style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`dot ${n.read ? 'faint' : 'warn'}`} aria-label={n.read ? 'Read' : 'Unread'} /><div style={{ flex: 1 }}><div style={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</div><div className="faint" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</div></div>
            {!demo && !n.read && <button className="btn sm" onClick={() => void db.notifications.update(n.id, { read: true })}>Mark read</button>}{!demo && <button className="btn sm" onClick={() => void db.notifications.update(n.id, { dismissed: true })}>Dismiss</button>}
          </div>))}
      </Card>
      {del && <Confirm title="Delete alert?" confirmLabel="Delete" message={<p>{describeAlert(del)}</p>} onCancel={() => setDel(null)} onConfirm={() => { void db.alerts.delete(del.id); setDel(null); toast('Alert deleted.') }} />}
    </div>
  )
}
