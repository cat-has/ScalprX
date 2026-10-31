# Data sources

All endpoints are public and key-free. Calls are made from the browser (CORS must be allowed by the provider).

| Provider | Host | Used for |
|---|---|---|
| Binance spot | api.binance.com, then data-api.binance.vision | `/api/v3/ticker/24hr`, `/api/v3/ticker/bookTicker`, `/api/v3/klines`, `/api/v3/ticker/price` |
| Bybit spot (fallback) | api.bybit.com | `/v5/market/tickers`, `/v5/market/kline` |

Fields: last price, 24h change percent, high, low, quote volume, bid/ask (spread), OHLCV candles.

Freshness: tickers poll at the chosen interval (5-60 s) while the tab is visible; candles poll at the same interval. Status becomes Stale when updates stop for about 45 s or three intervals.

Failure handling: HTTP 429/418 is treated as rate limiting and polling backs off up to 8x; 451/403 as regional block; timeouts after 8 s. The last real snapshot is kept and labelled. No data is ever fabricated.

Limits and licensing: providers set their own rate limits and terms; review them before heavy use. Some regions cannot reach Binance. This release has not been verified against the live endpoints from the build environment, which had no access to them; verify in your browser after deploying.
