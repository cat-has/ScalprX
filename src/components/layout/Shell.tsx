import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Activity, Bell, BookOpen, Calculator, CandlestickChart, Database, Download, HelpCircle, LayoutDashboard, LineChart, Moon, PanelLeft, ScanSearch, Settings as Cog, ShieldCheck, Sun, TrendingUp } from 'lucide-react'
import { Link, usePath } from '../../app/router'
import { useApp } from '../../app/store'
import { StatusPill } from './StatusPill'
import { useOnline } from '../../hooks/useOnline'
import { Banner } from '../ui'

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/chart', label: 'Chart', icon: CandlestickChart },
  { to: '/scanner', label: 'Scanner', icon: ScanSearch },
  { to: '/risk', label: 'Risk calculator', icon: Calculator },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/discipline', label: 'Discipline', icon: ShieldCheck },
  { to: '/data', label: 'Data & backup', icon: Database },
  { to: '/help', label: 'Help & methodology', icon: HelpCircle },
  { to: '/settings', label: 'Settings', icon: Cog },
]
const BOTTOM = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/scanner', label: 'Scanner', icon: ScanSearch },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Cog },
]
interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function Shell({ children, updateReady, applyUpdate }: { children: ReactNode; updateReady: boolean; applyUpdate: () => void }) {
  const path = usePath()
  const { settings, setSettings, notifications } = useApp()
  const online = useOnline()
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent) }
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])
  const unread = notifications.filter((n) => !n.read && !n.dismissed).length
  const dark = document.documentElement.dataset.theme !== 'light'
  const active = (to: string) => path === to || (to !== '/dashboard' && path.startsWith(to + '/'))
  const mainRef = useMainFocus(path)
  return (
    <div className={`shell ${settings.sidebarCollapsed ? 'collapsed' : ''}`}>
      <a className="skip" href="#main-content" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
      <header className="topbar">
        <button className="btn ghost icon-btn hide-mobile" aria-label={settings.sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}><PanelLeft size={18} /></button>
        <Link to="/dashboard" className="brand"><span className="logo"><Activity size={16} /></span>ScalprX <small>Precision for every trade.</small></Link>
        <span className="spacer" />
        {!online && <span className="chip down">Offline</span>}
        <StatusPill />
        {installEvt && <button className="btn sm hide-mobile" onClick={() => { void installEvt.prompt(); setInstallEvt(null) }}><Download size={14} /> Install</button>}
        <Link to="/alerts" className="btn ghost icon-btn" aria-label={`Alerts${unread ? `, ${unread} unread` : ''}`} style={{ position: 'relative' }}><Bell size={18} />{unread > 0 && <span className="chip down" style={{ position: 'absolute', top: -2, right: -4, padding: '0 5px', fontSize: 10 }}>{unread}</span>}</Link>
        <button className="btn ghost icon-btn" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setSettings({ theme: dark ? 'light' : 'dark' })}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </header>
      <nav className="sidebar" aria-label="Primary">
        {NAV.map((n) => <Link key={n.to} to={n.to} className="nav-item" aria-current={active(n.to) ? 'page' : undefined} title={n.label}><n.icon size={18} /><span>{n.label}</span></Link>)}
      </nav>
      <main className="main" id="main-content" tabIndex={-1} ref={mainRef}>
        {updateReady && <div style={{ marginBottom: 12 }}><Banner tone="info"><div style={{ flex: 1 }}><strong>Update available.</strong> A new version of ScalprX is ready. Your data is not affected.</div><button className="btn sm primary" onClick={applyUpdate}>Update now</button></Banner></div>}
        {children}
      </main>
      <nav className="bottomnav" aria-label="Primary mobile">
        {BOTTOM.map((n) => <Link key={n.to} to={n.to} aria-current={active(n.to) ? 'page' : undefined}><n.icon size={20} />{n.label}</Link>)}
      </nav>
    </div>
  )
}
function useMainFocus(path: string) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => { ref.current?.scrollTo?.({ top: 0 }) }, [path])
  return ref
}
