import { useEffect, useState } from 'react'
import { AppProvider } from './store'
import { usePath } from './router'
import { Shell } from '../components/layout/Shell'
import { ErrorBoundary } from './ErrorBoundary'
import { DashboardPage } from '../components/dashboard/DashboardPage'
import { MarketsPage } from '../components/markets/MarketsPage'
import { ChartPage } from '../components/charts/ChartPage'
import { ScannerPage } from '../features/scanner/ScannerPage'
import { RiskPage } from '../features/risk/RiskPage'
import { JournalPage } from '../features/journal/JournalPage'
import { TradeEditor } from '../features/journal/TradeEditor'
import { TradeDetail } from '../features/journal/TradeDetail'
import { AnalyticsPage } from '../components/analytics/AnalyticsPage'
import { AlertsPage } from '../features/alerts/AlertsPage'
import { DisciplinePage } from '../features/settings/DisciplinePage'
import { DataPage } from '../features/settings/DataPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { HelpPage } from '../features/settings/HelpPage'
import { Onboarding } from '../features/settings/Onboarding'
import { Empty } from '../components/ui'
import { registerPwa } from './pwa'
import { ToastProvider } from './toast'

function Routes() {
  const path = usePath()
  const seg = path.split('/').filter(Boolean)
  switch (seg[0]) {
    case 'dashboard': return <DashboardPage />
    case 'markets': return <MarketsPage />
    case 'chart': return <ChartPage />
    case 'scanner': return <ScannerPage />
    case 'risk': return <RiskPage />
    case 'journal':
      if (!seg[1]) return <JournalPage />
      if (seg[1] === 'new') return <TradeEditor />
      if (seg[2] === 'edit') return <TradeEditor id={seg[1]} />
      return <TradeDetail id={seg[1]} />
    case 'analytics': return <AnalyticsPage />
    case 'alerts': return <AlertsPage />
    case 'discipline': return <DisciplinePage />
    case 'data': return <DataPage />
    case 'settings': return <SettingsPage />
    case 'help': return <HelpPage />
    default: return <div className="page"><Empty title="Page not found" action={<a className="btn primary" href="#/dashboard">Go to dashboard</a>}>That address does not exist in ScalprX.</Empty></div>
  }
}

export default function App() {
  const [updateReady, setUpdateReady] = useState(false)
  const [apply, setApply] = useState<() => void>(() => () => undefined)
  useEffect(() => { registerPwa(() => setUpdateReady(true)).then((fn) => setApply(() => fn)).catch(() => undefined) }, [])
  const path = usePath()
  useEffect(() => { if (!window.location.hash) window.location.hash = '/dashboard' }, [])
  return (
    <AppProvider>
     <ToastProvider>
      <Shell updateReady={updateReady} applyUpdate={apply}>
        <ErrorBoundary resetKey={path}><Routes /></ErrorBoundary>
      </Shell>
      <Onboarding />
     </ToastProvider>
    </AppProvider>
  )
}
