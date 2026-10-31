import { FeedError } from './types'

export async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: 'omit' })
    if (res.status === 429 || res.status === 418) throw new FeedError('rate_limit', 'The data provider is rate limiting requests.', res.status)
    if (res.status === 451 || res.status === 403) throw new FeedError('blocked', 'The data provider blocked access from this region or network.', res.status)
    if (!res.ok) throw new FeedError('http', `Provider returned HTTP ${res.status}.`, res.status)
    try {
      return (await res.json()) as T
    } catch {
      throw new FeedError('parse', 'Provider returned an unreadable response.')
    }
  } catch (e) {
    if (e instanceof FeedError) throw e
    throw new FeedError('network', ctl.signal.aborted ? 'Request timed out.' : 'Network request failed (offline, blocked, or CORS).')
  } finally {
    clearTimeout(timer)
  }
}
