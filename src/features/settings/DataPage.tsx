import { useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { useApp } from '../../app/store'
import { Banner, Card, Confirm, Stat } from '../../components/ui'
import { db, exportBackup, resetAll, restoreBackup, validateBackup } from '../../services/storage/db'
import { download } from '../journal/JournalPage'
import { tradesToCsv } from '../../lib/csv'
import { dayKey, fmtTime } from '../../lib/format'
import { StatusPill } from '../../components/layout/StatusPill'

export function DataPage() {
  const { settings, watchlist, trades, alerts, feed } = useApp()
  const [msg, setMsg] = useState<{ tone: 'info' | 'down' | 'warn'; text: string } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [persist, setPersist] = useState<string>('unknown')
  const file = useRef<HTMLInputElement>(null)
  const backup = async () => { const b = await exportBackup(settings, watchlist); download(`scalprx-backup-${dayKey(Date.now())}.json`, JSON.stringify(b, null, 2), 'application/json'); setMsg({ tone: 'info', text: 'Backup downloaded. Store it somewhere safe; clearing browser data deletes everything else.' }) }
  const restore = async (f?: File) => {
    if (!f) return
    if (f.size > 20_000_000) { setMsg({ tone: 'down', text: 'File is larger than 20 MB.' }); return }
    try {
      const v = validateBackup(JSON.parse(await f.text()))
      if (!v.ok) { setMsg({ tone: 'down', text: v.error }); return }
      await restoreBackup(v.backup)
      setMsg({ tone: 'info', text: `Restored ${v.backup.trades.length} trades, ${v.backup.alerts.length} alerts and ${v.backup.notes.length} notes. Existing records with the same id were overwritten; app settings were not changed.` })
    } catch { setMsg({ tone: 'down', text: 'That file is not valid JSON.' }) }
    if (file.current) file.current.value = ''
  }
  const askPersist = async () => { try { setPersist((await navigator.storage?.persist?.()) ? 'granted' : 'not granted') } catch { setPersist('unsupported') } }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Data and backup</h1><p>Everything lives in this browser. You are responsible for backups.</p></div></div>
      {msg && <Banner tone={msg.tone}><span style={{ flex: 1 }}>{msg.text}</span><button className="btn sm" onClick={() => setMsg(null)}>Dismiss</button></Banner>}
      <div className="grid g3">
        <Stat label="Journal trades" value={trades.length} /><Stat label="Alerts" value={alerts.length} /><Stat label="Watchlist pairs" value={watchlist.length} />
      </div>
      <Card title="Market data source status">
        <div className="row"><StatusPill /><span className="muted">{feed.source ?? 'No source connected yet'}{feed.updatedAt ? ` - last real update ${fmtTime(feed.updatedAt)}` : ''}</span></div>
        {feed.error && <p className="warn" style={{ marginTop: 8 }}>{feed.error}</p>}
        <p className="faint" style={{ marginTop: 8 }}>Prices come from public exchange endpoints (Binance, then Bybit as fallback). Cached snapshots are labelled and never presented as live.</p>
      </Card>
      <Card title="Export and backup">
        <div className="row">
          <button className="btn primary" onClick={() => void backup()}><Download size={16} /> Download full backup (JSON)</button>
          <button className="btn" disabled={!trades.length} onClick={() => download(`scalprx-journal-${dayKey(Date.now())}.csv`, tradesToCsv(trades))}><Download size={16} /> Export journal (CSV)</button>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>The backup contains trades, alerts, session notes, settings and watchlist. It never contains API keys because ScalprX never asks for any.</p>
      </Card>
      <Card title="Restore from backup">
        <input ref={file} type="file" accept="application/json,.json" hidden aria-label="Choose backup file" onChange={(e) => void restore(e.target.files?.[0])} />
        <button className="btn" onClick={() => file.current?.click()}><Upload size={16} /> Choose backup file</button>
        <p className="faint" style={{ marginTop: 8 }}>The file is validated before anything is written. To import journal CSVs, use the Journal page.</p>
      </Card>
      <Card title="Storage protection">
        <p className="muted">Browsers may clear site data under storage pressure or when you clear history. Asking for persistent storage lowers that risk but does not remove it.</p>
        <div className="row"><button className="btn" onClick={() => void askPersist()}>Request persistent storage</button><span className="chip">{persist}</span></div>
      </Card>
      <Card title="Reset all data"><p className="muted">Deletes trades, alerts, notifications, notes, cached prices, checklists, watchlist and settings from this browser.</p>
        <button className="btn danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Reset everything</button></Card>
      {confirm && <Confirm title="Reset all ScalprX data?" confirmLabel="Delete everything" message={<p>This permanently deletes {trades.length} trades and all settings on this device. Download a backup first if you might need it. This cannot be undone.</p>} onCancel={() => setConfirm(false)} onConfirm={() => { void resetAll().then(async () => { await db.delete().catch(() => undefined); location.hash = '/dashboard'; location.reload() }) }} />}
    </div>
  )
}
