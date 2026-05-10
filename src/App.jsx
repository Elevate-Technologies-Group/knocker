import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import KnockerMap from './components/KnockerMap'
import ManagerApp from './manager/ManagerApp'
import Landing from './marketing/Landing'
import Privacy from './marketing/Privacy'
import Support from './marketing/Support'

const SESSION_ID = 'elevate-' + new Date().toISOString().split('T')[0]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/support" element={<Support />} />
      <Route path="/app" element={<RepView />} />
      <Route path="/manager/*" element={<ManagerApp />} />
    </Routes>
  )
}

function RepView() {
  const [repName, setRepName] = useState(() => localStorage.getItem('knocker_rep') || '')
  const [nameInput, setNameInput] = useState('')
  const [sessionInput, setSessionInput] = useState(SESSION_ID)

  if (!repName) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '100%', maxWidth: 380,
          background: '#1e293b', borderRadius: 20,
          padding: 28, color: '#f1f5f9'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🚪</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Knocker</div>
            <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Elevate Solar — Door Knocking Tool
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Your Name
            </label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nameInput.trim() && (
                localStorage.setItem('knocker_rep', nameInput.trim()),
                setRepName(nameInput.trim())
              )}
              placeholder="e.g. Jake, Sarah..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', marginTop: 8,
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 12, color: '#f1f5f9', fontSize: 15,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Session / Territory
            </label>
            <input
              value={sessionInput}
              onChange={e => setSessionInput(e.target.value)}
              placeholder="e.g. gilbert-north-2025-05-08"
              style={{
                width: '100%', padding: '12px 14px', marginTop: 8,
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 12, color: '#f1f5f9', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              All reps on the same session see each other's pins in real time
            </div>
          </div>

          <button
            onClick={() => {
              if (!nameInput.trim()) return
              localStorage.setItem('knocker_rep', nameInput.trim())
              setRepName(nameInput.trim())
            }}
            disabled={!nameInput.trim()}
            style={{
              width: '100%', padding: '14px',
              background: nameInput.trim() ? '#6366f1' : '#1e293b',
              border: 'none', borderRadius: 14,
              color: nameInput.trim() ? '#fff' : '#475569',
              fontSize: 16, fontWeight: 700, cursor: nameInput.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s'
            }}
          >
            Start Knocking →
          </button>

          <div style={{
            marginTop: 20, paddingTop: 16, borderTop: '1px solid #334155',
            textAlign: 'center'
          }}>
            <a href="/manager" style={{
              fontSize: 12, color: '#64748b', textDecoration: 'none'
            }}>
              Manager Portal →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <KnockerMap repName={repName} sessionId={sessionInput || SESSION_ID} />
}
