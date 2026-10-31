import { RefreshCw } from 'lucide-react'
import { useApp } from '../../app/store'
import { Banner } from '../ui'
import { fmtTime } from '../../lib/format'

export function FeedBanner() {
  const { feed, refresh } = useApp()
  if (feed.status === 'live' || feed.status === 'loading') return null
  const text: Record<string, string> = {
    stale: 'Market data is stale. Prices shown are the last real values received.',
    cached: 'Showing a saved snapshot from a previous session. These prices are not live.',
    offline: 'You are offline. Journal, calculator and saved data still work.',
    rate_limited: 'The data provider is rate limiting requests. Updates will resume automatically.',
    error: 'Market data is unavailable right now. Check your connection, VPN or regional access to the exchange API.',
  }
  return (
    <Banner tone={feed.status === 'error' || feed.status === 'offline' ? 'down' : 'warn'}>
      <div style={{ flex: 1 }}>
        <strong>{text[feed.status]}</strong>
        <div className="muted" style={{ fontSize: 12 }}>
          {feed.error && <>{feed.error} </>}{feed.updatedAt && <>Last real update: {fmtTime(feed.updatedAt)}{feed.source ? ` (${feed.source})` : ''}.</>}
        </div>
      </div>
      <button className="btn sm" onClick={refresh}><RefreshCw size={14} /> Retry</button>
    </Banner>
  )
}
