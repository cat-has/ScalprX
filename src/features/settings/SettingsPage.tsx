import { useApp } from '../../app/store'
import { Card, Field, Seg } from '../../components/ui'
import { Link } from '../../app/router'
import { NAV } from '../../components/layout/Shell'

export function SettingsPage() {
  const { settings, setSettings } = useApp()
  const num = (v: string, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d)
  return (
    <div className="page">
      <div className="page-head"><div><h1>Settings</h1><p>Preferences are saved in this browser.</p></div></div>
      <Card title="Appearance and data refresh">
        <div className="stack">
          <div className="field"><span className="lbl">Theme</span><Seg<'dark' | 'light' | 'system'> label="Theme" value={settings.theme} options={[{ v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }, { v: 'system', label: 'System' }]} onChange={(theme) => setSettings({ theme })} /></div>
          <Field label="Market refresh interval" id="se-r" hint="Shorter intervals use more of the exchange's public rate limit."><select id="se-r" value={settings.refreshSec} onChange={(e) => setSettings({ refreshSec: Number(e.target.value) })}>{[5, 10, 15, 30, 60].map((s) => <option key={s} value={s}>{s} seconds</option>)}</select></Field>
        </div>
      </Card>
      <Card title="Account defaults used by the calculator and discipline rules">
        <div className="formgrid">
          <Field label="Account equity" id="se-eq"><input id="se-eq" inputMode="decimal" value={settings.accountEquity} onChange={(e) => setSettings({ accountEquity: num(e.target.value, settings.accountEquity) })} /></Field>
          <Field label="Currency label" id="se-cu"><input id="se-cu" maxLength={8} value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value.toUpperCase() || 'USDT' })} /></Field>
          <Field label="Default risk per trade (%)" id="se-rp"><input id="se-rp" inputMode="decimal" value={settings.riskPct} onChange={(e) => setSettings({ riskPct: num(e.target.value, settings.riskPct) })} /></Field>
          <Field label="Default fee per side (%)" id="se-fe"><input id="se-fe" inputMode="decimal" value={settings.feePct} onChange={(e) => setSettings({ feePct: num(e.target.value, settings.feePct) })} /></Field>
          <Field label="Default leverage (x)" id="se-lv"><input id="se-lv" inputMode="decimal" value={settings.leverage} onChange={(e) => setSettings({ leverage: Math.max(1, num(e.target.value, 1)) })} /></Field>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>Account currency is only a label. ScalprX does not convert currencies; all values are treated as USDT-equivalent quote amounts.</p>
      </Card>
      <Card title="Install the app">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Chrome, Edge (desktop and Android): use the Install button in the top bar when shown, or the install icon in the address bar.</li>
          <li>Safari on iPhone and iPad: tap Share, then Add to Home Screen.</li>
          <li>Safari on macOS: File, then Add to Dock. Firefox desktop does not install web apps.</li>
          <li>Installation requires HTTPS and is decided by your browser; it is not available on every browser or device.</li>
        </ul>
        <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={() => setSettings({ onboarded: false })}>Show welcome guide again</button></div>
      </Card>
      <Card title="All tools" className="show-mobile">
        <div className="grid g2">{NAV.filter((n) => n.to !== '/settings').map((n) => <Link key={n.to} to={n.to} className="btn" style={{ justifyContent: 'flex-start' }}><n.icon size={16} /> {n.label}</Link>)}</div>
      </Card>
    </div>
  )
}
