import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type ToastTone = 'success' | 'error' | 'info'
interface T { id: number; text: string; tone: ToastTone }
const Ctx = createContext<(text: string, tone?: ToastTone) => void>(() => undefined)
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([])
  const seq = useRef(0)
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((x) => x.id !== id)), [])
  const push = useCallback((text: string, tone: ToastTone = 'success') => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-3), { id, text, tone }])
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
  }, [dismiss])
  const value = useMemo(() => push, [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toastitem ${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>x</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
