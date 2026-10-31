export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
/** Price with adaptive precision (more decimals for small prices). */
export function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '-'
  const a = Math.abs(n)
  const d = a >= 1000 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 5 : 8
  return fmtNum(n, d)
}
export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}
export function fmtMoney(n: number | null | undefined, cur = 'USDT'): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNum(Math.abs(n), 2)} ${cur}`
}
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(n)
}
export function fmtR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}R`
}
export function fmtTime(ms: number | null | undefined): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
export function fmtAge(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
export const baseOf = (pair: string) => pair.replace(/USDT$/, '')
export const prettyPair = (pair: string) => (pair.endsWith('USDT') ? `${baseOf(pair)}/USDT` : pair)
const p2 = (x: number) => String(x).padStart(2, '0')
export function toLocalInput(ms: number | null | undefined): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export function fromLocalInput(s: string): number | null {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : null
}
export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
