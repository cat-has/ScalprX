# Testing

`npm test` runs Vitest unit tests for indicators, risk, metrics, CSV, scanner, discipline, alerts and storage (fake IndexedDB). `npm run typecheck` and `npm run lint` cover types and style.

Manual checks after deployment:
1. Responsive: resize from 360 px to 1920 px; no horizontal page scroll; bottom nav under 860 px.
2. Keyboard: Tab through nav, dialogs trap focus, Esc closes them.
3. Install: use the browser install prompt over HTTPS.
4. Offline: DevTools, Network, Offline; reload; journal and calculator still work, market data is labelled cached or unavailable.
5. Updates: deploy a change, reopen, confirm the Update available banner.
6. Live data: confirm the status pill reads Live and prices match the exchange.
