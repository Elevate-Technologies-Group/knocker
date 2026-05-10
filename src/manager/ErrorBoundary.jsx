import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Manager portal crashed:', error, info)
    this.setState({ info })
  }

  render() {
    if (!this.state.error) return this.props.children
    const e = this.state.error
    return (
      <div style={{
        minHeight: '100dvh', background: '#0f172a', color: '#fca5a5',
        fontFamily: 'system-ui, sans-serif', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Manager portal crashed</div>
        <div style={{ fontSize: 14, color: '#fca5a5' }}>{e.name}: {e.message}</div>
        <pre style={{
          fontSize: 11, color: '#cbd5e1', background: '#1e293b',
          padding: 12, borderRadius: 8, overflow: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0
        }}>{e.stack || ''}</pre>
        {this.state.info?.componentStack && (
          <pre style={{
            fontSize: 11, color: '#94a3b8', background: '#1e293b',
            padding: 12, borderRadius: 8, overflow: 'auto',
            whiteSpace: 'pre-wrap', margin: 0
          }}>{this.state.info.componentStack}</pre>
        )}
        <button
          onClick={() => location.reload()}
          style={{
            padding: '10px 20px', background: '#1e293b',
            border: '1px solid #334155', borderRadius: 10,
            color: '#f1f5f9', fontSize: 14, cursor: 'pointer',
            alignSelf: 'flex-start'
          }}
        >Reload</button>
      </div>
    )
  }
}
