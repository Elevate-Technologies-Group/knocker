import { useState, useMemo } from 'react'
import { DOOR_STATUSES, STATUS_ORDER, normaliseStatus } from '../lib/constants'

/**
 * Pipeline screen — three tabs mirroring iOS PipelineView.swift:
 *   Pipeline  — Kanban columns by status
 *   Calendar  — week strip + appointment agenda
 *   History   — flat chronological list (event-aware)
 */
export default function PipelineView({ doors, onClose, onSelectDoor }) {
  const [tab, setTab] = useState('pipeline') // 'pipeline' | 'calendar' | 'history'
  const [calendarDate, setCalendarDate] = useState(new Date())

  // Normalise legacy hot_lead → appointment
  const normDoors = useMemo(() =>
    doors.map(d => ({ ...d, status: normaliseStatus(d.status) })),
  [doors])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#0f172a', color: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={onClose}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            ← Map
          </button>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {tab === 'pipeline' ? '📋 Pipeline' : tab === 'calendar' ? '📅 Calendar' : '📜 History'}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: -1 }}>
          {['pipeline', 'calendar', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0',
                background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? '#6366f1' : 'transparent'}`,
                color: tab === t ? '#a5b4fc' : '#64748b',
                fontSize: 14, fontWeight: tab === t ? 700 : 400,
                cursor: 'pointer', textTransform: 'capitalize'
              }}
            >
              {t === 'pipeline' ? '📋 Pipeline' : t === 'calendar' ? '📅 Calendar' : '📜 History'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: tab === 'pipeline' ? 'auto' : 'hidden' }}>
        {tab === 'pipeline' && <KanbanPanel doors={normDoors} onSelectDoor={onSelectDoor} />}
        {tab === 'calendar' && <CalendarPanel doors={normDoors} date={calendarDate} onDateChange={setCalendarDate} onSelectDoor={onSelectDoor} />}
        {tab === 'history' && <HistoryPanel doors={normDoors} onSelectDoor={onSelectDoor} />}
      </div>
    </div>
  )
}

// ─── Kanban ────────────────────────────────────────────────────────────────

function KanbanPanel({ doors, onSelectDoor }) {
  const byStatus = useMemo(() => {
    const map = {}
    STATUS_ORDER.forEach(k => { map[k] = [] })
    doors.forEach(d => {
      const s = normaliseStatus(d.status)
      if (map[s]) map[s].push(d)
    })
    return map
  }, [doors])

  return (
    <div style={{ display: 'flex', gap: 12, padding: 16, minWidth: 'max-content', height: '100%', alignItems: 'flex-start' }}>
      {STATUS_ORDER.map(key => {
        const s = DOOR_STATUSES[key]
        const col = byStatus[key] || []
        return (
          <div key={key} style={{ width: 220, flexShrink: 0 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.pinColor }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
              <span style={{ fontSize: 12, color: '#475569', marginLeft: 'auto', background: '#1e293b', padding: '2px 8px', borderRadius: 10 }}>{col.length}</span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.length === 0 && (
                <div style={{ fontSize: 12, color: '#334155', textAlign: 'center', padding: '24px 0', border: '1px dashed #1e293b', borderRadius: 10 }}>
                  Empty
                </div>
              )}
              {col.map(door => (
                <DoorCard key={door.id} door={door} status={key} onSelect={() => onSelectDoor(door)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DoorCard({ door, status, onSelect }) {
  const s = DOOR_STATUSES[status]
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: '#1e293b', border: `1px solid ${s.pinColor}33`,
        borderRadius: 10, padding: '10px 12px',
        color: '#f1f5f9',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {door.address?.split(',')[0]}
      </div>
      {door.owner_name && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>👤 {door.owner_name}</div>
      )}
      <div style={{ fontSize: 11, color: '#475569' }}>
        {new Date(door.updated_at).toLocaleDateString()}
        {door.rep_name ? ` · ${door.rep_name}` : ''}
      </div>
    </button>
  )
}

// ─── Calendar ──────────────────────────────────────────────────────────────

function CalendarPanel({ doors, date, onDateChange, onSelectDoor }) {
  // Build a week strip centred on `date`
  const week = useMemo(() => {
    const days = []
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay()) // Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [date])

  // Doors with appointment status — use updated_at as proxy for appointment date
  // (In production: would use door_events.appointment_at from the event log)
  const appointments = useMemo(() =>
    doors.filter(d => d.status === 'appointment'),
  [doors])

  const apptsByDay = useMemo(() => {
    const map = {}
    appointments.forEach(d => {
      const key = new Date(d.updated_at).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [appointments])

  const selectedKey = date.toDateString()
  const selectedAppts = apptsByDay[selectedKey] || []

  return (
    <div style={{ padding: 16 }}>
      {/* Week strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {week.map(d => {
          const key = d.toDateString()
          const count = apptsByDay[key]?.length || 0
          const isSelected = key === selectedKey
          const isToday = key === new Date().toDateString()
          return (
            <button
              key={key}
              onClick={() => onDateChange(d)}
              style={{
                flex: '0 0 auto', width: 48, padding: '8px 0',
                borderRadius: 12, border: `2px solid ${isSelected ? '#6366f1' : '#1e293b'}`,
                background: isSelected ? '#1e1e5c' : '#1e293b',
                color: isSelected ? '#a5b4fc' : isToday ? '#f1f5f9' : '#64748b',
                cursor: 'pointer', textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 10, marginBottom: 4 }}>
                {d.toLocaleDateString([], { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{d.getDate()}</div>
              {count > 0 && (
                <div style={{ marginTop: 4, width: 18, height: 18, borderRadius: '50%', background: '#06b6d4', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0' }}>
                  {count}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Agenda for selected day */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      {selectedAppts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div>No appointments this day</div>
        </div>
      ) : (
        selectedAppts.map(door => (
          <button
            key={door.id}
            onClick={() => onSelectDoor(door)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: '#083344', border: '1px solid #06b6d455',
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              color: '#f1f5f9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#06b6d4' }}>Appointment</span>
              <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
                {new Date(door.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#e2e8f0' }}>{door.address?.split(',')[0]}</div>
            {door.owner_name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>👤 {door.owner_name}</div>}
            {door.rep_name && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Rep: {door.rep_name}</div>}
          </button>
        ))
      )}
    </div>
  )
}

// ─── History ───────────────────────────────────────────────────────────────

function HistoryPanel({ doors, onSelectDoor }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? doors : doors.filter(d => d.status === filter)

  const stats = STATUS_ORDER.reduce((acc, k) => {
    acc[k] = doors.filter(d => d.status === k).length
    return acc
  }, {})

  return (
    <>
      {/* Filter chips */}
      <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
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

      <div style={{ padding: '8px 12px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#334155', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <div>No doors logged yet</div>
          </div>
        )}
        {filtered.map(door => {
          const s = DOOR_STATUSES[door.status] || DOOR_STATUSES.no_answer
          const date = new Date(door.updated_at)
          return (
            <div
              key={door.id}
              onClick={() => onSelectDoor(door)}
              style={{ background: '#1e293b', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${s?.pinColor}33`, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: s?.pinColor, marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {door.address?.split(',')[0]}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {door.address?.split(',').slice(1).join(',').trim()}
                </div>
                {door.owner_name && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>👤 {door.owner_name}</div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: s?.color, background: s?.bg, padding: '2px 7px', borderRadius: 6, fontWeight: 500 }}>
                    {s?.emoji} {s?.label}
                  </span>
                  {door.proposal && (
                    <span style={{ fontSize: 11, color: '#22c55e', background: '#052e16', padding: '2px 7px', borderRadius: 6 }}>📋 Proposal</span>
                  )}
                  <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {door.notes && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📝 {door.notes}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function StatChip({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '5px 12px', borderRadius: 20,
        border: `1.5px solid ${active ? color : '#1e293b'}`,
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
