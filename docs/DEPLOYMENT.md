# Deployment

1. Push the repository to GitHub (branch `main`).
2. Settings, Pages, Source: GitHub Actions.
3. The workflow sets `BASE_PATH` to `/<repo-name>/` automatically and runs `npm ci`, lint, tests, build, then the official `configure-pages`, `upload-pages-artifact` and `deploy-pages` actions. Permissions: `contents: read`, `pages: write`, `id-token: write`.
4. Site URL: `https://<user>.github.io/<repo-name>/`.

## Base path
`vite.config.ts` reads `BASE_PATH` (default `/`). The manifest uses relative URLs (`start_url` and `scope` of `./`) so it works under any path. Hash routing avoids server rewrites.

## Custom domain or user site
Create the repository variable `BASE_PATH=/`, then add the domain in Settings, Pages and configure DNS as GitHub documents. Enable HTTPS.

## Troubleshooting
- 404 on assets: wrong `BASE_PATH`.
- Workflow fails at deploy: Pages source is not set to GitHub Actions.
- Stale app: open once online, then press Update now when prompted.
- Do not commit `dist/`.
