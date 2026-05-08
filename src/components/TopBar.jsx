import { useState } from 'react'
import { geocodeAddress } from '../lib/api'

export default function TopBar({ repName, sessionId, doorCount, onTeamToggle }) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    const result = await geocodeAddress(search)
    if (result) {
      // Emit custom event to pan map
      window.dispatchEvent(new CustomEvent('knocker:panTo', { detail: result }))
    }
    setSearching(false)
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      zIndex: 200, padding: '10px 12px',
      background: 'linear-gradient(to bottom, rgba(15,23,42,0.97) 60%, transparent)',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 18, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.5px'
          }}>
            🚪 Knocker
          </div>
          <div style={{
            background: '#1e293b', borderRadius: 8,
            padding: '3px 10px', fontSize: 12, color: '#64748b'
          }}>
            {repName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onTeamToggle}
            style={{
              background: '#1e293b', border: '1px solid #334155',
              color: '#94a3b8', padding: '6px 12px', borderRadius: 8,
              fontSize: 12, cursor: 'pointer'
            }}
          >
            👥 Team
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search address..."
          style={{
            flex: 1, padding: '9px 14px',
            background: 'rgba(30,41,59,0.95)', border: '1px solid #334155',
            borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: '#6366f1', border: 'none', color: '#fff',
            fontSize: 14, cursor: 'pointer'
          }}
        >
          {searching ? '...' : 'Go'}
        </button>
      </form>

      {/* Hint */}
      <div style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>
        Tap any house to log a door
      </div>
    </div>
  )
}
