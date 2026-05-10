import { useState, useEffect } from 'react'
import { DOOR_STATUSES, STATUS_ORDER, normaliseStatus } from '../lib/constants'
import { pushToGHL } from '../lib/ghl'
import { generateProposal } from '../lib/proposal'
import { fetchDoorEvents } from '../lib/api'

export default function DoorModal({ door, mode, onSave, onClose }) {
  const [status, setStatus] = useState(normaliseStatus(door.status || 'no_answer'))
  const [notes, setNotes] = useState('')
  const [appointmentAt, setAppointmentAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [ghlPushing, setGhlPushing] = useState(false)
  const [ghlResult, setGhlResult] = useState(null)
  const [proposal, setProposal] = useState(door.proposal || null)
  const [showProposal, setShowProposal] = useState(!!door.proposal)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Load event log for existing doors
  useEffect(() => {
    if (mode === 'edit' && door.id) {
      setEventsLoading(true)
      fetchDoorEvents(door.id)
        .then(evs => { setEvents(evs); setEventsLoading(false) })
        .catch(() => setEventsLoading(false))
    }
  }, [mode, door.id])

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      status,
      notes,
      proposal,
      appointmentAt: status === 'appointment' && appointmentAt ? appointmentAt : null
    })
    setSaving(false)
  }

  const handleGenerateProposal = () => {
    const p = generateProposal({ solar: door.solar, address: door.address, owner_name: door.owner_name })
    setProposal(p)
    setShowProposal(true)
  }

  const handlePushToGHL = async () => {
    setGhlPushing(true)
    const result = await pushToGHL({ address: door.address, solar: door.solar, owner_name: door.owner_name, rep_name: door.rep_name, status, notes })
    setGhlResult(result)
    setGhlPushing(false)
  }

  const isWarmLead = status === 'interested' || status === 'appointment'
  const solar = door.solar
  const owner = door.owner_name

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', color: '#f1f5f9', maxHeight: '92dvh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#334155', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Address + Owner */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📍 Address</div>
          <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.4 }}>{door.address}</div>
          {owner ? (
            <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', borderRadius: 8, padding: '7px 10px' }}>
              <span>👤</span>
              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{owner}</div>
                <div style={{ fontSize: 10, color: '#475569' }}>Property owner · County records</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#334155', fontStyle: 'italic', marginTop: 4 }}>Owner name not found in county records</div>
          )}
          {mode === 'edit' && door.rep_name && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>
              Last knock: {door.rep_name} · {new Date(door.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Solar summary */}
        {solar && !showProposal && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: '1px solid #f59e0b33' }}>
            <div style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>☀️ Solar Potential</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
              <SolarStat label="Monthly Savings" value={`$${solar.monthlySavings}/mo`} highlight />
              <SolarStat label="Annual Savings" value={`$${solar.annualSavings}/yr`} highlight />
              <SolarStat label="System Size" value={`${solar.systemSizeKw} kW`} />
              <SolarStat label="Panels (~)" value={solar.panelCount} />
              <SolarStat label="Median Sun Hrs/Yr" value={solar.medianSunshineHours?.toLocaleString()} />
              <SolarStat label="Realistic kWh/Yr" value={solar.realisticKwh?.toLocaleString()} />
            </div>
            {solar.bestPitch != null && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Best roof face: {solar.bestPitch}° pitch · {getAzimuthLabel(solar.bestAzimuth)}
              </div>
            )}
            <button
              onClick={handleGenerateProposal}
              style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 9, background: '#1a2e1a', border: '1px solid #22c55e55', color: '#4ade80', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              📋 Generate Full Proposal
            </button>
          </div>
        )}

        {/* Full Proposal */}
        {showProposal && proposal && (
          <div style={{ background: '#0c1f0c', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #22c55e55' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1 }}>📋 Solar Proposal</div>
              <button onClick={() => setShowProposal(false)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                <span>Roof Solar Score</span>
                <span style={{ color: proposal.sunScore >= 70 ? '#4ade80' : proposal.sunScore >= 50 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>{proposal.sunScore}/100</span>
              </div>
              <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${proposal.sunScore}%`, background: proposal.sunScore >= 70 ? '#22c55e' : proposal.sunScore >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 12 }}>
              <SolarStat label="System Size" value={`${proposal.systemKw} kW`} />
              <SolarStat label="Panels" value={proposal.panelCount} />
              <SolarStat label="Annual Production" value={`${proposal.annualKwh?.toLocaleString()} kWh`} />
              <SolarStat label="Sun Hrs/Yr (median)" value={proposal.medianSunshineHours?.toLocaleString()} />
            </div>
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>💰 Financials</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                <SolarStat label="Monthly Savings" value={`$${proposal.monthlySavings}`} highlight />
                <SolarStat label="Annual Savings" value={`$${proposal.annualSavings}`} highlight />
                <SolarStat label="Gross System Cost" value={`$${proposal.grossCost?.toLocaleString()}`} />
                <SolarStat label="Fed Tax Credit (30%)" value={`-$${proposal.federalCredit?.toLocaleString()}`} />
                <SolarStat label="Net Cost to Owner" value={`$${proposal.netCost?.toLocaleString()}`} />
                <SolarStat label="Payback Period" value={`${proposal.paybackYears} yrs`} />
                <SolarStat label="25-Yr Savings" value={`$${proposal.cumulativeSavings25yr?.toLocaleString()}`} highlight />
                <SolarStat label="Net Lifetime Value" value={`$${proposal.netLifetimeSavings?.toLocaleString()}`} highlight />
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>🌿 Environmental Impact / Year</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {proposal.annualCo2Kg?.toLocaleString()} kg CO₂ offset · {proposal.treesEquivalent} trees equivalent
              </div>
            </div>
          </div>
        )}

        {/* Status Picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {STATUS_ORDER.map(key => {
              const s = DOOR_STATUSES[key]
              const active = status === key
              return (
                <button key={key} onClick={() => setStatus(key)} style={{
                  padding: '10px 14px', borderRadius: 10,
                  border: `2px solid ${active ? s.color : '#1e293b'}`,
                  background: active ? s.bg : '#1e293b',
                  color: active ? s.color : '#64748b',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 16 }}>{s.emoji}</span>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Appointment date picker — only shown when status = appointment */}
        {status === 'appointment' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>📅 Appointment Date & Time</div>
            <input
              type="datetime-local"
              value={appointmentAt}
              onChange={e => setAppointmentAt(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                background: '#1e293b', border: '1px solid #06b6d4',
                borderRadius: 10, color: '#f1f5f9', fontSize: 14,
                outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>
        )}

        {/* Notes for this interaction */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Notes {mode === 'edit' ? '(this interaction)' : ''}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Spoke with homeowner, callback Friday 2pm..."
            rows={2}
            style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Activity log — existing doors */}
        {mode === 'edit' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Activity Log</div>
            {eventsLoading && <div style={{ fontSize: 12, color: '#475569' }}>Loading…</div>}
            {!eventsLoading && events.length === 0 && (
              <div style={{ fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                {door.notes ? `📝 ${door.notes}` : 'No activity recorded yet'}
              </div>
            )}
            {events.map(ev => {
              const s = DOOR_STATUSES[normaliseStatus(ev.status)]
              return (
                <div key={ev.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s?.pinColor || '#475569', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: s?.color || '#94a3b8', fontWeight: 600 }}>
                        {s?.emoji} {s?.label}
                      </span>
                      {ev.rep_name && <span style={{ fontSize: 11, color: '#475569' }}>by {ev.rep_name}</span>}
                      <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>
                        {new Date(ev.created_at).toLocaleDateString()} {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {ev.appointment_at && (
                      <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 2 }}>
                        📅 {new Date(ev.appointment_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {ev.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ev.notes}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* GHL Push */}
        {isWarmLead && (
          <div style={{ marginBottom: 12 }}>
            {ghlResult ? (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: ghlResult.success ? '#052e16' : '#450a0a', border: `1px solid ${ghlResult.success ? '#22c55e' : '#ef4444'}`, fontSize: 13, color: ghlResult.success ? '#86efac' : '#fca5a5' }}>
                {ghlResult.success ? '✅ Pushed to GHL! Contact + opportunity created.' : `❌ GHL error: ${ghlResult.error}`}
              </div>
            ) : (
              <button onClick={handlePushToGHL} disabled={ghlPushing} style={{ width: '100%', padding: 11, borderRadius: 10, background: '#0f2d4a', border: '1px solid #0ea5e9', color: '#38bdf8', fontSize: 14, fontWeight: 600, cursor: ghlPushing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {ghlPushing ? 'Pushing...' : '⚡ Push to GoHighLevel'}
              </button>
            )}
          </div>
        )}

        {/* Save / Cancel */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 15, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: DOOR_STATUSES[status]?.color || '#6366f1', color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
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
      <div style={{ fontSize: highlight ? 15 : 13, fontWeight: highlight ? 700 : 500, color: highlight ? '#fbbf24' : '#e2e8f0' }}>
        {value ?? '—'}
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
  if (deg < 202) return '✅ S facing (best)'
  if (deg < 248) return 'SW facing'
  if (deg < 292) return 'W facing'
  return 'NW facing'
}
