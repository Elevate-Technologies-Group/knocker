import { useState } from 'react'
import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'

export default function DoorModal({ door, mode, onSave, onClose }) {
  const [status, setStatus] = useState(door.status || 'no_answer')
  const [notes, setNotes] = useState(door.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({ status, notes })
    setSaving(false)
  }

  const solar = door.solar
  const owner = door.owner_name
  const proposal = door.proposal

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 36px',
        color: '#f1f5f9',
        maxHeight: '90dvh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{
          width: 40, height: 4, background: '#334155',
          borderRadius: 2, margin: '0 auto 16px'
        }} />

        {/* Address + Owner */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            📍 Address
          </div>
          <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.4 }}>
            {door.address}
          </div>

          {/* Owner name from county records */}
          {owner ? (
            <div style={{
              marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
              background: '#1e293b', borderRadius: 8, padding: '6px 10px'
            }}>
              <span style={{ fontSize: 13 }}>👤</span>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{owner}</div>
                <div style={{ fontSize: 10, color: '#475569' }}>Property owner · County records</div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 11, color: '#334155', fontStyle: 'italic' }}>
              Owner name not found in county records
            </div>
          )}

          {mode === 'edit' && door.rep_name && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              Last knock: {door.rep_name} · {new Date(door.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Solar Data */}
        {solar && (
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: '12px 14px',
            marginBottom: 14, border: '1px solid #f59e0b33'
          }}>
            <div style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              ☀️ Solar Potential
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
              <SolarStat label="Monthly Savings" value={`$${solar.monthlySavings}/mo`} highlight />
              <SolarStat label="Annual Savings" value={`$${solar.annualSavings}/yr`} highlight />
              <SolarStat label="System Size" value={`${solar.systemSizeKw} kW`} />
              <SolarStat label="Panels (~)" value={solar.panelCount} />
              <SolarStat label="Median Sun Hrs/Yr" value={solar.medianSunshineHours?.toLocaleString()} />
              <SolarStat label="Roof Segments" value={solar.roofSegments} />
            </div>
            {solar.bestPitch != null && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Best roof face: {solar.bestPitch}° pitch · {getAzimuthLabel(solar.bestAzimuth)}
              </div>
            )}
          </div>
        )}

        {/* Previous proposal */}
        {proposal && (
          <div style={{
            background: '#0f2a1e', borderRadius: 12, padding: '12px 14px',
            marginBottom: 14, border: '1px solid #22c55e44'
          }}>
            <div style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              📋 Solar Proposal
            </div>
            <div style={{ fontSize: 13, color: '#86efac' }}>{proposal.systemKw} kW system</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Est. ${proposal.annualSavings}/yr savings · Generated {new Date(proposal.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Status Picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {STATUS_ORDER.map(key => {
              const s = DOOR_STATUSES[key]
              const active = status === key
              return (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `2px solid ${active ? s.color : '#1e293b'}`,
                    background: active ? s.bg : '#1e293b',
                    color: active ? s.color : '#64748b',
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}
                >
                  <span style={{ fontSize: 16 }}>{s.emoji}</span>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Spoke with homeowner, callback Friday 2pm..."
            rows={2}
            style={{
              width: '100%', padding: '10px 12px',
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 10, color: '#f1f5f9', fontSize: 13,
              resize: 'none', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '13px', borderRadius: 12,
              border: '1px solid #334155', background: '#1e293b',
              color: '#94a3b8', fontSize: 15, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '13px', borderRadius: 12,
              border: 'none',
              background: DOOR_STATUSES[status]?.color || '#6366f1',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Log Door' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SolarStat({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: highlight ? 15 : 13,
        fontWeight: highlight ? 700 : 500,
        color: highlight ? '#fbbf24' : '#e2e8f0'
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

function getAzimuthLabel(deg) {
  if (deg == null) return ''
  if (deg <= 22 || deg >= 338) return 'N facing'
  if (deg < 68) return 'NE facing'
  if (deg < 112) return 'E facing'
  if (deg < 158) return 'SE facing'
  if (deg < 202) return '✅ S facing'
  if (deg < 248) return 'SW facing'
  if (deg < 292) return 'W facing'
  return 'NW facing'
}
