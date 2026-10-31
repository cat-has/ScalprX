# ScalprX - Precision for every trade

ScalprX is a local-first crypto scalping workspace that runs as a Progressive Web App: live market monitoring, a transparent setup scanner, a risk calculator, a trade journal with analytics, personal discipline rules and alerts. It places no trades, needs no account and sends your data nowhere.

> Educational decision support only. Not financial advice. Indicators describe the past and do not predict or guarantee results.

## Screenshots

No screenshots are committed yet. To add genuine ones: run `npm run dev`, capture each screen (dashboard, chart, scanner, risk calculator, journal) in desktop and mobile widths, save them in `docs/screenshots/`, and link them here.

## Features

Market terminal, chart workspace (1m, 3m, 5m, 15m, 1h), scanner, risk calculator, journal with CSV import/export, analytics, alerts and notification center, discipline dashboard, backup/restore, light and dark themes, installable offline-capable PWA. See `docs/FEATURES.md`.

## Technology

React 19, TypeScript, Vite, hand-written CSS design system, Lightweight Charts, Dexie (IndexedDB), Lucide icons, vite-plugin-pwa (Workbox), Vitest.

## Prerequisites

Node.js 20.19 or newer (22 recommended) and npm.

## Install and run

```
npm install
npm run dev
```

## Build, check and test

```
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run build       # production build in dist/
npm run preview     # serve dist/ locally
```

Test a sub-path deployment locally: `BASE_PATH=/scalprx/ npm run build && BASE_PATH=/scalprx/ npm run preview`, then open the printed URL plus `/scalprx/`.

## Deploy to GitHub Pages

1. Create a new empty repository on GitHub (any name; example `scalprx`). Do not add a README there.
2. Upload this project (do not commit `node_modules` or `dist`; `.gitignore` already excludes them). With git: `git init`, `git add .`, `git commit -m "Initial commit"`, `git branch -M main`, `git remote add origin <your repo URL>`, `git push -u origin main`.
3. In the repository go to Settings, Pages, and set Source to "GitHub Actions".
4. The workflow in `.github/workflows/deploy.yml` runs on every push to `main`, then lints, tests, builds with base path `/<repo-name>/` and deploys.
5. Open `https://<your-user>.github.io/<repo-name>/` after the Actions run turns green.

Custom domain or `<user>.github.io` repository: add a repository variable `BASE_PATH` with value `/` (Settings, Secrets and variables, Actions, Variables), then set your domain under Settings, Pages. See `docs/DEPLOYMENT.md`.

## Verify installation and offline use (after deploying over HTTPS)

1. Open the site, wait a few seconds, reload once.
2. Install: Chrome/Edge show an Install button; iOS Safari uses Share, Add to Home Screen.
3. Turn on airplane mode or use DevTools, Network, Offline. Reload: the app shell, calculator, journal and saved data still load; market data shows as cached or unavailable.

## Troubleshooting

- Blank page with 404 assets: base path mismatch. Check `BASE_PATH` matches the repository name, including slashes.
- "No data" on markets: the exchange API may be blocked in your region or by a VPN/ad-blocker. The app falls back to Bybit; if both fail it says so.
- Old version after deploy: the app shows "Update available"; press Update now.
- Lost data: browser storage was cleared. Restore a JSON backup from Data and backup.

## Data-source limitations

Prices are polled (not streamed) from public endpoints and can be delayed, rate-limited or blocked. See `docs/DATA_SOURCES.md`.

## Security and privacy

No server, account, analytics or secrets. Data stays in the browser. Never enter exchange API keys or seed phrases anywhere. See `docs/PRIVACY.md` and `docs/SECURITY.md`.

## Contributing

Open an issue before large changes. Keep calculations in `src/lib` pure and covered by tests in `tests/`. Run typecheck, lint and tests before a pull request.

## License

MIT. Replace the copyright placeholder in `LICENSE` with your own name.
