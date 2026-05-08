import { DOOR_STATUSES } from '../lib/constants'

export default function TeamPanel({ doors, onClose }) {
  // Group by rep
  const byRep = {}
  doors.forEach(d => {
    const rep = d.rep_name || 'Unknown'
    if (!byRep[rep]) byRep[rep] = { total: 0, hot: 0, interested: 0 }
    byRep[rep].total++
    if (d.status === 'hot_lead') byRep[rep].hot++
    if (d.status === 'interested') byRep[rep].interested++
  })

  const reps = Object.entries(byRep).sort((a, b) => b[1].total - a[1].total)

  // Recent activity
  const recent = [...doors]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 10)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 300, background: 'rgba(15,23,42,0.97)',
      backdropFilter: 'blur(12px)', border: '1px solid #1e293b',
      borderRadius: '0 0 0 16px', zIndex: 300,
      overflowY: 'auto', padding: 16, color: '#f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>👥 Team Activity</div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#64748b',
          fontSize: 20, cursor: 'pointer', lineHeight: 1
        }}>×</button>
      </div>

      {/* Rep scoreboard */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Scoreboard
        </div>
        {reps.length === 0 && <div style={{ color: '#475569', fontSize: 13 }}>No activity yet</div>}
        {reps.map(([name, stats]) => (
          <div key={name} style={{
            background: '#1e293b', borderRadius: 10, padding: '10px 12px', marginBottom: 8
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{name}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' }}>
              <span>🚪 {stats.total} doors</span>
              <span style={{ color: '#22c55e' }}>✅ {stats.interested}</span>
              <span style={{ color: '#ff6b35' }}>🔥 {stats.hot}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity feed */}
      <div>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Recent Doors
        </div>
        {recent.map(d => {
          const s = DOOR_STATUSES[d.status]
          const time = new Date(d.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0', borderBottom: '1px solid #1e293b', fontSize: 12
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: s?.pinColor, flexShrink: 0
              }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.address?.split(',')[0]}
                </div>
                <div style={{ color: '#475569' }}>{d.rep_name} · {time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
