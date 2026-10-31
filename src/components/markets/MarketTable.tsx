import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Star, X } from 'lucide-react'
import type { Ticker } from '../../types'
import { fmtCompact, fmtPct, fmtPrice, prettyPair } from '../../lib/format'
import { Empty } from '../ui'

type Key = 'symbol' | 'price' | 'changePct' | 'quoteVolume' | 'spreadPct'
export function MarketTable({ tickers, symbols, selected, onSelect, onRemove, loading, favorites, onFav, dense = false }: { tickers: Ticker[]; symbols: string[]; selected?: string; onSelect?: (s: string) => void; onRemove?: (s: string) => void; loading?: boolean; favorites?: string[]; onFav?: (s: string) => void; dense?: boolean }) {
  const [key, setKey] = useState<Key>('quoteVolume')
  const [dir, setDir] = useState<1 | -1>(-1)
  const rows = useMemo(() => {
    const map = new Map(tickers.map((t) => [t.symbol, t]))
    const arr = symbols.map((s) => ({ s, t: map.get(s) }))
    const val = (r: { s: string; t?: Ticker }) => (key === 'symbol' ? r.s : (r.t?.[key] ?? -Infinity))
    return arr.sort((a, b) => {
      const fa = favorites?.includes(a.s) ? 1 : 0, fb = favorites?.includes(b.s) ? 1 : 0
      if (fa !== fb) return fb - fa
      const x = val(a), y = val(b)
      return (x > y ? 1 : x < y ? -1 : 0) * dir
    })
  }, [tickers, symbols, key, dir, favorites])
  const th = (k: Key, label: string, r = true) => (
    <th className={r ? 'r' : ''} aria-sort={key === k ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => { if (key === k) setDir((d) => (d === 1 ? -1 : 1)); else { setKey(k); setDir(k === 'symbol' ? 1 : -1) } }}>{label}{key === k && (dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button>
    </th>
  )
  if (!symbols.length) return <Empty title="Your watchlist is empty">Add a pair to start tracking prices.</Empty>
  return (
    <div className="tablewrap">
      <table>
        <thead><tr>{onFav && <th><span className="sr-only">Favorite</span></th>}{th('symbol', 'Pair', false)}{th('price', 'Price')}{th('changePct', '24h')}{!dense && <><th className="r">High</th><th className="r">Low</th></>}{th('quoteVolume', 'Volume')}{!dense && th('spreadPct', 'Spread')}{onRemove && <th><span className="sr-only">Remove</span></th>}</tr></thead>
        <tbody>
          {rows.map(({ s, t }) => (
            <tr key={s} className={selected === s ? 'sel' : ''}>
              {onFav && <td><button className="btn ghost icon-btn sm" aria-pressed={favorites?.includes(s)} aria-label={`${favorites?.includes(s) ? 'Unfavorite' : 'Favorite'} ${prettyPair(s)}`} onClick={() => onFav(s)}><Star size={15} fill={favorites?.includes(s) ? 'currentColor' : 'none'} /></button></td>}
              <td><button className="btn ghost sm" style={{ fontWeight: 600 }} onClick={() => onSelect?.(s)} aria-label={`Select ${prettyPair(s)}`}>{prettyPair(s)}</button></td>
              {t ? (
                <>
                  <td className="r num">{fmtPrice(t.price)}</td>
                  <td className={`r num ${t.changePct >= 0 ? 'up' : 'down'}`}>{fmtPct(t.changePct)}</td>
                  {!dense && <><td className="r num">{fmtPrice(t.high)}</td><td className="r num">{fmtPrice(t.low)}</td></>}
                  <td className="r num">{fmtCompact(t.quoteVolume)}</td>
                  {!dense && <td className="r num">{t.spreadPct != null ? `${t.spreadPct.toFixed(3)}%` : '-'}</td>}
                </>
              ) : <td colSpan={dense ? 3 : 6} className="muted">{loading ? <span className="skeleton" style={{ display: 'block', width: 140 }} /> : 'No data for this pair yet'}</td>}
              {onRemove && <td><button className="btn ghost icon-btn sm" aria-label={`Remove ${prettyPair(s)}`} onClick={() => onRemove(s)}><X size={14} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
