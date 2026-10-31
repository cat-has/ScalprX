import { useMemo } from 'react'
import { useApp } from '../../app/store'
import { useCandles } from '../../hooks/useCandles'
import { useScanner } from '../../hooks/useScanner'
import { PriceChart } from '../charts/PriceChart'
import { MarketTable } from '../markets/MarketTable'
import { SetupCard } from '../scanner/SetupCard'
import { Card, Empty, Seg, Stat } from '../ui'
import { FeedBanner } from '../layout/FeedBanner'
import { TIMEFRAMES, type Timeframe } from '../../types'
import { fmtMoney, fmtPct, fmtPrice, prettyPair } from '../../lib/format'
import { closedResults, computeMetrics } from '../../lib/metrics'
import { evaluateDiscipline } from '../../lib/discipline'
import { Link, go } from '../../app/router'
import { useNow } from '../../hooks/useNow'

export function DashboardPage() {
  const { settings, setSettings, feed, watchlist, trades, tickerOf } = useApp()
  const now = useNow(10000)
  const pair = settings.chartPair
  const tf = settings.chartTimeframe
  const t = tickerOf(pair)
  const { candles, loading, error } = useCandles(pair, tf, settings.refreshSec)
  const spreads = useMemo(() => Object.fromEntries(feed.tickers.map((x) => [x.symbol, x.spreadPct])), [feed.tickers])
  const scan = useScanner(watchlist, settings.scanner.timeframe, settings.indicators, settings.scanner, spreads, Math.max(60, settings.refreshSec * 6))
  const top = scan.setups.filter((s) => s.bias === 'bullish' || s.bias === 'bearish').slice(0, 3)
  const m = useMemo(() => computeMetrics(closedResults(trades)), [trades])
  const disc = useMemo(() => evaluateDiscipline(trades, settings.discipline, settings.accountEquity, now), [trades, settings.discipline, settings.accountEquity, now])
  const theme = document.documentElement.dataset.theme ?? 'dark'
  const cur = settings.currency
  return (
    <div className="page">
      <FeedBanner />
      <div className="grid g4">
        <Stat label={prettyPair(pair)} value={t ? fmtPrice(t.price) : feed.status === 'loading' ? <span className="skeleton" style={{ display: 'block', width: 120, height: 24 }} /> : '-'} tone={t ? (t.changePct >= 0 ? 'up' : 'down') : undefined} sub={t ? `${fmtPct(t.changePct)} in 24h` : 'Waiting for data'} />
        <Stat label="Net P&L today" value={fmtMoney(disc.todayNet, cur)} tone={disc.todayNet < 0 ? 'down' : disc.todayNet > 0 ? 'up' : undefined} sub={`${disc.todayTrades} trades today`} />
        <Stat label="Win rate (all)" value={m.winRate != null ? `${m.winRate.toFixed(0)}%` : '-'} sub={`${m.total} closed trades`} />
        <Stat label="Discipline" value={disc.breaches.some((b) => b.severity === 'breach') ? 'Limit hit' : disc.breaches.length ? 'Caution' : 'On track'} tone={disc.breaches.some((b) => b.severity === 'breach') ? 'down' : disc.breaches.length ? 'warn' : 'up'} sub={disc.breaches[0]?.message ?? 'No breaches recorded today'} />
      </div>
      <div className="grid dash">
        <div className="stack">
          <Card pad={false} title={`${prettyPair(pair)} chart`} actions={<><Seg<Timeframe> label="Timeframe" value={tf} options={TIMEFRAMES.map((x) => ({ v: x, label: x }))} onChange={(v) => setSettings({ chartTimeframe: v })} /><Link to="/chart" className="btn sm">Full chart</Link></>}>
            <PriceChart candles={candles} loading={loading} error={error} ind={settings.indicators} showRsi={false} showMacd={false} resetKey={`${pair}|${tf}`} theme={theme} height="sm" />
          </Card>
          <Card title="Top setups" actions={<Link to="/scanner" className="btn sm">Scanner</Link>}>
            {scan.scanning && !scan.setups.length ? <div className="skeleton" style={{ height: 60 }} /> : top.length ? <div className="stack">{top.map((s) => <SetupCard key={s.pair} s={s} now={now} compact />)}</div>
              : <Empty title="No qualifying setups right now">{scan.setups.length ? 'Your rules are not met on any watchlist pair. That is normal; waiting is a valid decision.' : scan.error ?? 'Scan results appear once candles load.'}</Empty>}
          </Card>
        </div>
        <div className="stack">
          <Card pad={false} title="Watchlist" actions={<Link to="/markets" className="btn sm">Manage</Link>}>
            <MarketTable tickers={feed.tickers} symbols={watchlist} dense selected={pair} loading={feed.status === 'loading'} onSelect={(s) => setSettings({ chartPair: s })} />
          </Card>
          <Card title="Quick actions"><div className="grid g2">
            <button className="btn" onClick={() => go('/risk')}>Risk calculator</button><button className="btn" onClick={() => go('/journal/new')}>Log a trade</button>
            <button className="btn" onClick={() => go('/alerts')}>Set alert</button><button className="btn" onClick={() => go('/analytics')}>Analytics</button></div></Card>
        </div>
      </div>
    </div>
  )
}
