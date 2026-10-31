import { Card } from '../../components/ui'

export function HelpPage() {
  return (
    <div className="page">
      <div className="page-head"><div><h1>Help, methodology and privacy</h1><p>Works offline once the app has loaded.</p></div></div>
      <Card title="Using ScalprX"><div className="prose">
        <ul>
          <li><strong>Markets</strong> shows real 24h prices for your watchlist. <strong>Chart</strong> shows real candles with EMA, RSI and MACD.</li>
          <li><strong>Scanner</strong> applies fixed rules to real candles and lists which conditions are met or not. It never generates a setup without enough data.</li>
          <li><strong>Risk calculator</strong> turns your stop distance and risk percent into a position size. <strong>Journal</strong> records outcomes; <strong>Analytics</strong> summarises them.</li>
          <li><strong>Discipline</strong> compares your recorded trades with your own limits. It cannot block exchange orders.</li>
        </ul></div></Card>
      <Card title="Methodology"><div className="prose">
        <h3>Indicators</h3>
        <ul>
          <li>EMA: seeded with the SMA of the first N closes, then k = 2/(N+1). Defaults 9 and 21.</li>
          <li>RSI: Wilder smoothing, period 14. MACD: EMA12 - EMA26 with a 9-period EMA signal; histogram = MACD - signal.</li>
          <li>ATR: Wilder smoothing of true range, period 14. VWAP: rolling over the last 60 candles using typical price (high+low+close)/3, not session-anchored.</li>
          <li>Volume ratio: latest candle volume / average of the previous 20. Support/resistance: nearest fractal swing pivots (3 candles each side) in the last 150 candles.</li>
        </ul>
        <h3>Scanner conditions (6 per side)</h3>
        <ul>
          <li>Long: fast EMA above slow EMA with slow EMA rising; RSI in the long band; MACD histogram positive and rising; price above VWAP; volume at or above the minimum ratio; room to resistance of at least the minimum R:R.</li>
          <li>Short mirrors these. A setup is bullish or bearish only when at least the configured number of conditions are met and that side leads. Otherwise it is neutral. Fewer than the required candles gives "insufficient data".</li>
          <li>Entry reference is the last close. Stop = entry -/+ stop-ATR multiple x ATR. Target = entry +/- target-ATR multiple x ATR. These are reference levels, not orders.</li>
        </ul>
        <h3>Risk and P&amp;L</h3>
        <ul>
          <li>Assumes linear contracts (spot or USDT-margined). Inverse contracts are not supported.</li>
          <li>Position size is fee-inclusive; liquidation is an isolated-margin approximation that ignores funding, tiered maintenance margin and fees.</li>
          <li>See the Analytics page for how win rate, profit factor, expectancy, R-multiple and drawdown are computed.</li>
        </ul></div></Card>
      <Card title="Data sources and limits"><div className="prose">
        <ul>
          <li>Prices and candles come from public, key-free exchange endpoints: Binance spot (with its data mirror), then Bybit spot as a fallback. Updates are polled on your chosen interval, not streamed.</li>
          <li>Some regions or networks cannot reach these APIs. When that happens the app says so and shows a saved snapshot labelled "Cached" or "Stale". It never invents prices or candles.</li>
          <li>Rate limits can pause updates; the app backs off automatically.</li>
        </ul></div></Card>
      <Card title="Privacy and security"><div className="prose">
        <ul>
          <li>Journal, alerts, notes and settings are stored only in this browser (IndexedDB and localStorage). There is no account, server or analytics.</li>
          <li>The only network requests are to the public market-data APIs, which receive your IP address and the pair symbols you request.</li>
          <li>ScalprX never asks for exchange API keys, private keys or seed phrases. Never enter them anywhere in this app.</li>
          <li>Clearing site data deletes your records. Use Data and backup to export regularly.</li>
        </ul></div></Card>
      <Card title="Important limitations"><div className="prose">
        <ul>
          <li>ScalprX does not place trades. Calculations are simulations of your plan, not executed exchange orders.</li>
          <li>Alerts only run while the app is open. Browser notifications may be delayed, blocked or unavailable when the app is closed.</li>
          <li>Nothing here is financial advice or a promise of profit. Leverage can liquidate positions quickly. Indicators describe the past.</li>
        </ul></div></Card>
    </div>
  )
}
