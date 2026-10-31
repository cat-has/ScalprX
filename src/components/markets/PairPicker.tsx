import { useEffect, useMemo, useState } from 'react'
import { Dialog, Empty } from '../ui'
import { fetchSymbols } from '../../services/market-data'
import { prettyPair } from '../../lib/format'

let cache: string[] | null = null
export function PairPicker({ onPick, onClose, exclude = [] }: { onPick: (s: string) => void; onClose: () => void; exclude?: string[] }) {
  const [list, setList] = useState<string[]>(cache ?? [])
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(!cache)
  useEffect(() => {
    if (cache) return
    fetchSymbols().then((r) => { cache = r.data; setList(r.data) }).catch(() => setErr('Could not load the pair list. Check your connection and try again.')).finally(() => setLoading(false))
  }, [])
  const shown = useMemo(() => list.filter((s) => !exclude.includes(s) && s.includes(q.trim().toUpperCase().replace('/', ''))).slice(0, 60), [list, q, exclude])
  return (
    <Dialog title="Add a trading pair" onClose={onClose}>
      <input aria-label="Search pairs" placeholder="Search, for example DOGE" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading && <div className="skeleton" style={{ height: 100 }} />}
      {err && <p className="down">{err}</p>}
      {!loading && !err && !shown.length && <Empty title="No matching pairs">Only USDT spot pairs are listed.</Empty>}
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {shown.map((s) => <button key={s} className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { onPick(s); onClose() }}>{prettyPair(s)}</button>)}
      </div>
    </Dialog>
  )
}
