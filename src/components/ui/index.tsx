import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Card({ title, actions, children, className = '', pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && <div className="card-h"><h2>{title}</h2><div className="row">{actions}</div></div>}
      {pad ? <div className="card-b">{children}</div> : children}
    </section>
  )
}
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'up' | 'down' | 'warn' }) {
  return <div className="card stat"><div className="k">{label}</div><div className={`v ${tone ?? ''}`}>{value}</div>{sub && <div className="s">{sub}</div>}</div>
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}
export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'down'; children: ReactNode }) {
  return <div className={`banner ${tone}`} role={tone === 'down' ? 'alert' : 'status'}>{children}</div>
}
export function Field({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id?: string }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>
}
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string; cls?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.v} type="button" className={o.cls} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  )
}
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    el?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input,select,textarea')]
        if (!f.length) return
        const first = f[0], lastEl = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); prev?.focus() }
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="card-h"><h2>{title}</h2><button className="btn ghost icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
        <div className="card-b">{children}</div>
      </div>
    </div>
  )
}
export function Confirm({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <div>{message}</div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Dialog>
  )
}
export function Disclaimer() {
  return <p className="faint" style={{ fontSize: 12 }}>Educational decision support only. Not financial advice. Indicators describe past prices and do not predict future results. Trading leveraged crypto can lose more than you expect.</p>
}
export function Check({ ok }: { ok: boolean }) {
  return <span className={ok ? 'up' : 'down'} aria-label={ok ? 'met' : 'not met'}>{ok ? '✓' : '✗'}</span>
}
