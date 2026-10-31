import type { Trade, Direction } from '../types'
import { uid } from './format'

export const CSV_COLUMNS = [
  'id', 'pair', 'direction', 'entry', 'exit', 'stop', 'takeProfit', 'size', 'fees', 'openedAt', 'closedAt',
  'setup', 'timeframe', 'rationale', 'emotion', 'executionQuality', 'mistakes', 'preNotes', 'postNotes',
] as const

function esc(v: string): string {
  // Neutralise spreadsheet formula injection on export while keeping numbers intact.
  const s = /^[=+@]/.test(v) || (/^-/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) ? `'${v}` : v
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const iso = (ms: number | null) => (ms == null ? '' : new Date(ms).toISOString())

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((t) =>
    [
      t.id, t.pair, t.direction, t.entry, t.exit ?? '', t.stop, t.takeProfit ?? '', t.size, t.fees, iso(t.openedAt),
      iso(t.closedAt), t.setup, t.timeframe, t.rationale, t.emotion, t.executionQuality, t.mistakes.join('|'),
      t.preNotes, t.postNotes,
    ].map((v) => esc(String(v))).join(','),
  )
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}

/** RFC 4180-style parser supporting quoted fields, escaped quotes and embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((c) => c !== '')) rows.push(row) }
  return rows
}

export interface ImportResult { trades: Trade[]; errors: string[]; skipped: number }

function num(v: string): number { return v.trim() === '' ? NaN : Number(v) }
function time(v: string): number | null {
  if (!v.trim()) return null
  const t = /^\d+$/.test(v.trim()) ? Number(v) : Date.parse(v)
  return Number.isFinite(t) ? t : NaN
}

export function csvToTrades(text: string, existingIds: Set<string> = new Set()): ImportResult {
  const rows = parseCsv(text)
  const errors: string[] = []
  const trades: Trade[] = []
  let skipped = 0
  if (rows.length < 2) return { trades, errors: ['File has no data rows.'], skipped }
  const header = rows[0].map((h) => h.trim())
  const missing = ['pair', 'direction', 'entry', 'stop', 'size', 'openedAt'].filter((c) => !header.includes(c))
  if (missing.length) return { trades, errors: [`Missing required column(s): ${missing.join(', ')}.`], skipped }
  const seen = new Set(existingIds)
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2
    const get = (c: string) => (r[header.indexOf(c)] ?? '').replace(/^'(?=[=+@-])/, '')
    const problems: string[] = []
    const pair = get('pair').trim().toUpperCase().replace('/', '')
    const direction = get('direction').trim().toLowerCase() as Direction
    const entry = num(get('entry'))
    const exit = get('exit').trim() === '' ? null : num(get('exit'))
    const stop = num(get('stop'))
    const tpRaw = get('takeProfit')
    const takeProfit = tpRaw.trim() === '' ? null : num(tpRaw)
    const size = num(get('size'))
    const fees = get('fees').trim() === '' ? 0 : num(get('fees'))
    const openedAt = time(get('openedAt'))
    const closedAt = time(get('closedAt'))
    if (!/^[A-Z0-9]{3,20}$/.test(pair)) problems.push('invalid pair')
    if (direction !== 'long' && direction !== 'short') problems.push('direction must be long or short')
    if (!(entry > 0)) problems.push('entry must be > 0')
    if (exit !== null && !(exit > 0)) problems.push('exit must be > 0')
    if (!(stop > 0)) problems.push('stop must be > 0')
    if (takeProfit !== null && !(takeProfit > 0)) problems.push('takeProfit must be > 0')
    if (!(size > 0)) problems.push('size must be > 0')
    if (!(fees >= 0)) problems.push('fees must be >= 0')
    if (openedAt == null || Number.isNaN(openedAt)) problems.push('openedAt is not a valid date')
    if (Number.isNaN(closedAt as number)) problems.push('closedAt is not a valid date')
    if ((exit === null) !== (closedAt === null)) problems.push('exit and closedAt must both be set or both empty')
    if (direction === 'long' && stop >= entry) problems.push('long stop must be below entry')
    if (direction === 'short' && stop <= entry) problems.push('short stop must be above entry')
    const q = Number(get('executionQuality'))
    if (problems.length) { errors.push(`Row ${line}: ${problems.join('; ')}.`); return }
    let id = get('id').trim() || uid()
    if (seen.has(id)) {
      if (existingIds.has(id)) { skipped++; return }
      id = uid()
    }
    seen.add(id)
    trades.push({
      id, pair, direction, entry, exit, stop, takeProfit, size, fees, openedAt: openedAt as number, closedAt,
      setup: get('setup').trim(), timeframe: get('timeframe').trim(), rationale: get('rationale'),
      emotion: get('emotion').trim(), executionQuality: q >= 1 && q <= 5 ? Math.round(q) : 3,
      mistakes: get('mistakes').split('|').map((x) => x.trim()).filter(Boolean),
      preNotes: get('preNotes'), postNotes: get('postNotes'), createdAt: Date.now(),
    })
  })
  return { trades, errors, skipped }
}
