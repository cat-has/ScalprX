# Features

## Implemented
- Markets: watchlist, favorites, sorting, searchable pair picker, 24h change/high/low/volume, spread (bid/ask), configurable refresh, status labels.
- Chart: candlesticks, volume, EMA overlays, RSI and MACD panes, crosshair legend, zoom/pan, entry/stop/target lines, 1m/3m/5m/15m/1h.
- Scanner: six explained conditions per side, configurable periods and thresholds, insufficient-data handling, freshness label.
- Risk calculator: long/short, fee-inclusive sizing, margin, leverage warnings, liquidation approximation, validation.
- Journal: manual entry and edit, filters, search, date range, CSV import/export, detail view, delete confirmation.
- Analytics: core metrics, equity curve, breakdowns by pair, timeframe, setup, session.
- Alerts: price above/below, percent move, RSI above/below, cooldowns, once/repeat, notification center, optional browser notifications.
- Discipline: daily loss, risk per trade, consecutive losses, trades per day, cooldown, checklists, session notes, summaries.
- Data: JSON backup/restore with validation, CSV export, persistent-storage request, full reset.
- PWA: manifest, PNG icons, service worker, offline page, update prompt, install button.

## Not implemented (see ROADMAP)
WebSocket streaming, order-book depth, backend push notifications, exchange order execution (intentionally excluded), end-to-end browser tests.
