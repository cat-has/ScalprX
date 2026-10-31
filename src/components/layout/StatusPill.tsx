import { useApp, type FeedStatus } from '../../app/store'
import { fmtAge } from '../../lib/format'
import { useNow } from '../../hooks/useNow'

const MAP: Record<FeedStatus, { label: string; cls: string; help: string }> = {
  loading: { label: 'Connecting', cls: 'info', help: 'Waiting for the first market-data response.' },
  live: { label: 'Live', cls: 'up', help: 'Real prices from a public exchange API, refreshed on an interval.' },
  stale: { label: 'Stale', cls: 'warn', help: 'Showing the last real prices received; the latest refresh failed or is delayed.' },
  cached: { label: 'Cached', cls: 'warn', help: 'Showing a saved snapshot from an earlier session. Not live.' },
  offline: { label: 'Offline', cls: 'down', help: 'No network connection.' },
  rate_limited: { label: 'Rate limited', cls: 'warn', help: 'The data provider is limiting requests. The app backs off automatically.' },
  error: { label: 'No data', cls: 'down', help: 'The data provider could not be reached.' },
}
export function StatusPill({ compact = false }: { compact?: boolean }) {
  const { feed } = useApp()
  const now = useNow(5000)
  const m = MAP[feed.status]
  return (
    <span className={`chip ${m.cls}`} title={`${m.help}${feed.source ? ` Source: ${feed.source}.` : ''}`} role="status">
      <span className="dot" aria-hidden />
      {m.label}
      {!compact && feed.updatedAt && <span className="faint">{fmtAge(feed.updatedAt, now)}</span>}
    </span>
  )
}
