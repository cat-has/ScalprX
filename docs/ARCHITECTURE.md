# Architecture

- `src/lib`: pure business logic (indicators, risk, metrics, scanner, discipline, alerts, CSV). No React, no I/O. All unit tested.
- `src/services/market-data`: `MarketProvider` interface with Binance and Bybit implementations. `index.ts` tries providers in order and reports which one answered. Add an exchange by implementing the interface and appending it to `PROVIDERS`.
- `src/services/storage`: Dexie database (`trades`, `alerts`, `notifications`, `notes`, `snapshots`, `kv`), backup export/validate/restore, reset.
- `src/services/notifications`: permission request and guarded browser notifications.
- `src/app`: `AppProvider` (settings, watchlist, polling feed, live Dexie queries, alert engine), hash router, error boundary, PWA registration.
- `src/components` and `src/features`: presentational screens and hooks (`useCandles`, `useScanner`).

## State and data flow

Small preferences (settings, watchlist, favorites, checklists) live in localStorage. Structured records live in IndexedDB and are read with live queries, so every screen updates when data changes. The feed polls tickers on the chosen interval, backs off on failures, saves the last good snapshot to IndexedDB and labels it live, stale or cached.

## Routing

Hash routes (`#/journal`) need no server rewrites, so GitHub Pages sub-paths work.

## PWA caching

Workbox precaches the built app shell, icons, manifest and `offline.html`. Navigations fall back to the precached `index.html`. Market-data requests are not cached by the service worker; the app keeps its own labelled snapshot. Updates use a prompt flow: a new worker waits until the user presses Update now.
