import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; key?: string }> {
  state: { error: Error | null; key?: string } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  static getDerivedStateFromProps(p: { resetKey?: string }, s: { error: Error | null; key?: string }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null
  }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('ScalprX UI error', e, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page"><div className="banner down" role="alert"><div style={{ flex: 1 }}><strong>Something went wrong on this screen.</strong><p className="muted" style={{ margin: '4px 0 0' }}>Your saved data is safe. {this.state.error.message}</p></div>
        <button className="btn sm" onClick={() => this.setState({ error: null })}>Try again</button><a className="btn sm" href="#/dashboard">Go to dashboard</a></div></div>
    )
  }
}
