# Security

Threat model: a static site with no backend and no secrets. Main risks are browser-storage exposure (anyone with access to your browser profile can read journal data), data loss, third-party API tampering, and supply-chain issues in dependencies.

- Never enter API keys, private keys or seed phrases. The app has no field for them.
- Imports are validated and size-limited; CSV export neutralises formula-injection prefixes.
- React escapes rendered text; no `dangerouslySetInnerHTML` is used.
- Service worker does not cache market-data or authenticated responses.
- Maintain dependencies: run `npm audit` and update regularly; the lockfile is committed.
- Responsible disclosure: report vulnerabilities privately to the repository owner (add a contact in your fork) before public disclosure.
