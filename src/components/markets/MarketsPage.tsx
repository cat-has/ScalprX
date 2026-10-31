import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useApp } from '../../app/store'
import { MarketTable } from './MarketTable'
import { PairPicker } from './PairPicker'
import { Card, Stat } from '../ui'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { fmtCompact, fmtPct, fmtPrice, prettyPair, fmtTime } from '../../lib/format'
import { go } from '../../app/router'
import { DEFAULT_PAIRS } from '../../lib/settings'
import { FeedBanner } from '../layout/FeedBanner'

export function MarketsPage() {
  const { feed, watchlist, setWatchlist, settings, setSettings, refresh, tickerOf } = useApp()
  const [favs, setFavs] = useLocalStorage<string[]>('scalprx.favorites.v1', [])
  const [picker, setPicker] = useState(false)
  const sel = tickerOf(settings.chartPair)
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Markets</h1><p>Watchlist of USDT spot pairs. Click a column to sort; star pairs to pin them.</p></div>
        <div className="row"><button className="btn" onClick={refresh}><RefreshCw size={16} /> Refresh</button><button className="btn primary" onClick={() => setPicker(true)}><Plus size={16} /> Add pair</button></div>
      </div>
      <FeedBanner />
      <Card pad={false} title="Watchlist" actions={<span className="faint" style={{ fontSize: 12 }}>{feed.updatedAt ? `Updated ${fmtTime(feed.updatedAt)}` : 'No data yet'}{feed.source ? ` - ${feed.source}` : ''}</span>}>
        <MarketTable tickers={feed.tickers} symbols={watchlist} selected={settings.chartPair} loading={feed.status === 'loading'} favorites={favs}
          onFav={(s) => setFavs((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]))}
          onSelect={(s) => { setSettings({ chartPair: s }); go('/chart') }}
          onRemove={(s) => setWatchlist(watchlist.filter((x) => x !== s))} />
      </Card>
      {sel && (
        <Card title={`${prettyPair(settings.chartPair)} detail`}>
          <div className="grid g4">
            <Stat label="Last price" value={fmtPrice(sel.price)} tone={sel.changePct >= 0 ? 'up' : 'down'} sub={`${fmtPct(sel.changePct)} in 24h`} />
            <Stat label="24h high / low" value={<span style={{ fontSize: 16 }}>{fmtPrice(sel.high)} / {fmtPrice(sel.low)}</span>} sub="Range of the last 24 hours" />
            <Stat label="24h volume (USDT)" value={fmtCompact(sel.quoteVolume)} sub="Market activity" />
            <Stat label="Spread" value={sel.spreadPct != null ? `${sel.spreadPct.toFixed(3)}%` : '-'} sub={sel.bid ? `Bid ${fmtPrice(sel.bid)} / Ask ${fmtPrice(sel.ask)}` : 'Not provided by the current source'} />
          </div>
          <div className="row" style={{ marginTop: 12 }}><button className="btn" onClick={() => go('/chart')}>Open chart</button><button className="btn" onClick={() => go('/scanner')}>Open scanner</button></div>
        </Card>
      )}
      <div className="row"><button className="btn sm ghost" onClick={() => setWatchlist(DEFAULT_PAIRS)}>Reset watchlist to defaults</button></div>
      {picker && <PairPicker exclude={watchlist} onPick={(s) => setWatchlist([...watchlist, s])} onClose={() => setPicker(false)} />}
    </div>
  )
}
