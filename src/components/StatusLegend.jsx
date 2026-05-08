import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'

export default function StatusLegend({ doors }) {
  const counts = {}
  STATUS_ORDER.forEach(k => counts[k] = 0)
  doors.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++ })

  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 12,
      background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
      border: '1px solid #1e293b', borderRadius: 14,
      padding: '10px 12px', zIndex: 100
    }}>
      {STATUS_ORDER.map(key => {
        const s = DOOR_STATUSES[key]
        return (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 5, fontSize: 12
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: s.pinColor, flexShrink: 0
            }} />
            <span style={{ color: '#94a3b8' }}>{s.label}</span>
            <span style={{
              marginLeft: 'auto', paddingLeft: 10,
              color: counts[key] > 0 ? '#f1f5f9' : '#334155',
              fontWeight: counts[key] > 0 ? 600 : 400
            }}>
              {counts[key]}
            </span>
          </div>
        )
      })}
      <div style={{
        borderTop: '1px solid #1e293b', marginTop: 6, paddingTop: 6,
        fontSize: 11, color: '#475569', textAlign: 'center'
      }}>
        {doors.length} total doors
      </div>
    </div>
  )
}
