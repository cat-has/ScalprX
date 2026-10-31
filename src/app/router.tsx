import { useEffect, useState } from 'react'

/** Minimal hash router: works on GitHub Pages sub-paths with no server rewrites. */
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/dashboard'
}
export function usePath(): string {
  const [p, setP] = useState(currentPath())
  useEffect(() => {
    const f = () => setP(currentPath())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return p
}
export const go = (path: string) => { window.location.hash = path }
export function Link({ to, children, className, onClick, ...rest }: { to: string; children: React.ReactNode; className?: string; onClick?: () => void } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} className={className} onClick={onClick} {...rest}>{children}</a>
}
