import { useState, useEffect } from 'react'
import { getRepHistory } from '../lib/api'
import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'

export default function HistoryScreen({ repName, onClose, onSelectDoor }) {
  const [doors, setDoors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getRepHistory(repName).then(d => {
      setDoors(d)
      setLoading(false)
    })
  }, [repName])

  const filtered = filter === 'all' ? doors : doors.filter(d => d.status === filter)

  const stats = STATUS_ORDER.reduce((acc, k) => {
    acc[k] = doors.filter(d => d.status === k).length
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: '#0f172a', color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0',
        background: 'rgba(15,23,42,0.98)',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onClose} style={{
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', padding: '6px 12px', borderRadius: 8,
            fontSize: 14, cursor: 'pointer'
          }}>← Map</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>📋 My History</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{repName} · {doors.length} doors knocked</div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          <StatChip label="All" count={doors.length} active={filter === 'all'} color="#6366f1" onClick={() => setFilter('all')} />
          {STATUS_ORDER.map(k => (
            <StatChip
              key={k}
              label={DOOR_STATUSES[k].emoji}
              count={stats[k]}
              active={filter === k}
              color={DOOR_STATUSES[k].pinColor}
              onClick={() => setFilter(k)}
            />
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#475569', marginTop: 40 }}>Loading...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#334155', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <div>No doors logged yet</div>
          </div>
        )}
        {filtered.map(door => {
          const s = DOOR_STATUSES[door.status]
          const date = new Date(door.updated_at)
          return (
            <div
              key={door.id}
              onClick={() => onSelectDoor(door)}
              style={{
                background: '#1e293b', borderRadius: 12,
                padding: '12px 14px', marginBottom: 8,
                border: `1px solid ${s?.pinColor}33`,
                cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start'
              }}
            >
              {/* Status dot */}
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: s?.pinColor, marginTop: 3, flexShrink: 0
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Address */}
                <div style={{
                  fontSize: 14, color: '#e2e8f0', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {door.address?.split(',')[0]}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {door.address?.split(',').slice(1).join(',').trim()}
                </div>

                {/* Owner if available */}
                {door.owner_name && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    👤 {door.owner_name}
                  </div>
                )}

                {/* Bottom row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11, color: s?.color, background: s?.bg,
                    padding: '2px 7px', borderRadius: 6, fontWeight: 500
                  }}>
                    {s?.emoji} {s?.label}
                  </span>
                  {door.proposal && (
                    <span style={{ fontSize: 11, color: '#22c55e', background: '#052e16', padding: '2px 7px', borderRadius: 6 }}>
                      📋 Proposal
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {door.notes && (
                  <div style={{
                    fontSize: 11, color: '#64748b', marginTop: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    📝 {door.notes}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatChip({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '5px 12px',
        borderRadius: 20, border: `1.5px solid ${active ? color : '#1e293b'}`,
        background: active ? `${color}22` : '#1e293b',
        color: active ? color : '#64748b',
        fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: 5
      }}
    >
      {label} <span style={{ fontSize: 12 }}>{count}</span>
    </button>
  )
}
