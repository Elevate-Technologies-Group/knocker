import { useState } from 'react'
import { geocodeAddress } from '../lib/api'

export default function TopBar({ repName, sessionId, doorCount, onTeamToggle, onHistoryOpen }) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    const result = await geocodeAddress(search)
    if (result) {
      window.dispatchEvent(new CustomEvent('knocker:panTo', { detail: result }))
    }
    setSearching(false)
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      zIndex: 500,
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '10px 12px 8px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Row 1: Brand + rep + team button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
          🚪 Knocker
        </span>
        <span style={{
          background: '#1e293b', borderRadius: 6,
          padding: '2px 8px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap'
        }}>
          {repName}
        </span>
        <span style={{
          background: '#1e293b', borderRadius: 6,
          padding: '2px 8px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap', marginLeft: 'auto'
        }}>
          {doorCount} doors
        </span>
        <button
          onClick={onHistoryOpen}
          style={{
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', padding: '5px 12px', borderRadius: 8,
            fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          📋 History
        </button>
        <button
          onClick={onTeamToggle}
          style={{
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', padding: '5px 12px', borderRadius: 8,
            fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          👥 Team
        </button>
      </div>

      {/* Row 2: Search — always visible */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search address or neighborhood..."
          style={{
            flex: 1, padding: '9px 12px',
            background: 'rgba(30,41,59,0.9)', border: '1px solid #334155',
            borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: '#6366f1', border: 'none', color: '#fff',
            fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          {searching ? '...' : 'Go'}
        </button>
      </form>

      {/* Row 3: hint */}
      <div style={{ fontSize: 10, color: '#334155', textAlign: 'center', letterSpacing: 0.3 }}>
        Tap any house to log · Zoom in to see address dots
      </div>
    </div>
  )
}
