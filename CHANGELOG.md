# Changelog

Versioning follows Semantic Versioning. Add new entries at the top under a version heading and date.

## 1.1.0 - 2026-10-31

- Denser layout: tighter card, table and form spacing; much taller chart areas on Dashboard and Chart.
- Themed scrollbars for tables and panels.
- Sample-data preview on Journal, Analytics and Alerts (read-only, never saved or exported) plus an R-multiple distribution chart.
- Scanner cards: Open in Chart and Send to Risk Calculator; chart and risk pre-fill fixed and labelled.
- Progress bars on the pre- and post-trade checklists.
- Richer Bullish/Bearish/Neutral/No-data badges.
- Toasts for alerts, trades, exports, imports, restore, watchlist and notes.
- Backup restore can now also restore settings and watchlist; tests for the Data page.

## 1.0.0 - 2026-10-31

Initial release.

- Markets: Binance public data with Bybit fallback, watchlist, sortable table, pair search, live/stale/cached/offline status.
- Chart workspace: Lightweight Charts candles, volume, EMA overlays, RSI and MACD panes, entry/stop/target lines.
- Scanner: EMA, RSI, MACD, rolling VWAP, volume ratio, ATR, swing support/resistance, explained conditions.
- Risk calculator: long/short, fee-inclusive sizing, leverage, margin, liquidation approximation.
- Journal: IndexedDB (Dexie) storage, CRUD, CSV import/export with validation, filters.
- Analytics: win rate, net P&L, profit factor, expectancy, R-multiple, max drawdown, breakdowns.
- Alerts: price, percent-move and RSI alerts with cooldowns, notification center, optional browser notifications.
- Discipline: personal limits, checklists, session notes, daily/weekly summaries.
- PWA: manifest, icons, service worker, offline page, update prompt, GitHub Pages workflow.
