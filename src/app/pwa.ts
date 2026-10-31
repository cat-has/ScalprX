import { registerSW } from 'virtual:pwa-register'

/** Registers the service worker (production only). Returns a function that activates a waiting update and reloads. */
export async function registerPwa(onNeedRefresh: () => void): Promise<() => void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return () => undefined
  const update = registerSW({ immediate: true, onNeedRefresh, onRegisterError: (e) => console.warn('Service worker registration failed', e) })
  return () => { void update(true) }
}
