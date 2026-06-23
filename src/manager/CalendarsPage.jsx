import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const monoFamily = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const AVATAR_COLORS = ['#F59E0B', '#06b6d4', '#22c55e', '#475569', '#a855f7', '#ef4444']

export default function CalendarsPage({ session, team, role }) {
  const [calendars, setCalendars] = useState([])
  const [members, setMembers] = useState([])
  const [calendarMembers, setCalendarMembers] = useState({}) // {calendar_id: [user_id...]}
  const [memberNames, setMemberNames] = useState({})         // {user_id: display_name}
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: cals }, { data: tm }, { data: cm }] = await Promise.all([
        supabase.from('shared_calendars').select('id, name, created_at, created_by_user_id').eq('team_id', team.id).order('created_at', { ascending: true }),
        supabase.from('team_members').select('user_id, role, rep_type').eq('team_id', team.id),
        supabase.from('shared_calendar_members').select('calendar_id, user_id'),
      ])
      setCalendars(cals || [])
      setMembers(tm || [])

      // calendarMembers index
      const byCal = {}
      for (const row of cm || []) {
        if (!byCal[row.calendar_id]) byCal[row.calendar_id] = []
        byCal[row.calendar_id].push(row.user_id)
      }
      setCalendarMembers(byCal)

      // Harvest display names: query door_events rep_name for each user once
      const names = {}
      await Promise.all((tm || []).map(async (m) => {
        const { data: rows } = await supabase
          .from('door_events')
          .select('rep_name')
          .eq('user_id', m.user_id)
          .not('rep_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
        const found = rows?.[0]?.rep_name
        names[m.user_id] = found || `Rep ${m.user_id.slice(-4)}`
      }))
      setMemberNames(names)
    } catch (e) {
      console.error('Calendars load error:', e)
      setError(e.message || 'Failed to load calendars.')
    } finally {
      setLoading(false)
    }
  }, [team.id])

  useEffect(() => { loadAll() }, [loadAll])

  async function createCalendar(name, memberUserIds) {
    setError(null)
    try {
      const { data: created, error: cErr } = await supabase
        .from('shared_calendars')
        .insert({ team_id: team.id, name, created_by_user_id: session.user.id })
        .select()
        .single()
      if (cErr) throw cErr
      if (memberUserIds.length > 0) {
        const { error: mErr } = await supabase
          .from('shared_calendar_members')
          .insert(memberUserIds.map(uid => ({ calendar_id: created.id, user_id: uid })))
        if (mErr) throw mErr
      }
      await loadAll()
      setShowCreate(false)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not create calendar.')
    }
  }

  async function deleteCalendar(calId) {
    if (!confirm('Delete this calendar? Appointments stay assigned to closers; they just stop being grouped under this calendar.')) return
    setError(null)
    try {
      const { error: dErr } = await supabase.from('shared_calendars').delete().eq('id', calId)
      if (dErr) throw dErr
      await loadAll()
    } catch (e) {
      setError(e.message || 'Could not delete.')
    }
  }

  async function setMembersOnCalendar(calId, nextUserIds) {
    setError(null)
    try {
      const current = new Set(calendarMembers[calId] || [])
      const next = new Set(nextUserIds)
      const toAdd = [...next].filter(u => !current.has(u))
      const toRemove = [...current].filter(u => !next.has(u))
      if (toAdd.length > 0) {
        const { error: aErr } = await supabase
          .from('shared_calendar_members')
          .insert(toAdd.map(uid => ({ calendar_id: calId, user_id: uid })))
        if (aErr) throw aErr
      }
      for (const uid of toRemove) {
        const { error: rErr } = await supabase
          .from('shared_calendar_members')
          .delete()
          .eq('calendar_id', calId)
          .eq('user_id', uid)
        if (rErr) throw rErr
      }
      await loadAll()
      setEditingCalendar(null)
    } catch (e) {
      setError(e.message || 'Could not update members.')
    }
  }

  return (
    <div style={pageStyle}>
      <div style={topRow}>
        <div>
          <div style={crumbs}>
            <Link to="/manager" style={crumbLink}>{team.name}</Link> / Calendars
          </div>
          <h1 style={h1Style}>Shared calendars</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={primaryBtn}>+ New calendar</button>
        </div>
      </div>

      <p style={leadCopy}>
        A shared calendar groups setters with one or more closers. When a setter books an appointment in the iOS app, they can select this calendar and the appointment shows up on every member's pipeline calendar.
      </p>

      {error && <div style={errorBanner}>{error}</div>}
      {loading && calendars.length === 0 && (
        <div style={emptyMsg}>Loading…</div>
      )}

      {!loading && calendars.length === 0 && (
        <div style={panel}>
          <div style={{ padding: 24, textAlign: 'center', color: '#475569' }}>
            No calendars yet. Click <strong>+ New calendar</strong> to create the first one for {team.name}.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {calendars.map(cal => (
          <CalendarCard
            key={cal.id}
            calendar={cal}
            memberIds={calendarMembers[cal.id] || []}
            roster={members}
            memberNames={memberNames}
            onEdit={() => setEditingCalendar(cal)}
            onDelete={() => deleteCalendar(cal.id)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateOrEditModal
          mode="create"
          roster={members}
          memberNames={memberNames}
          initialName=""
          initialMemberIds={[]}
          onCancel={() => setShowCreate(false)}
          onSave={(name, mIds) => createCalendar(name, mIds)}
        />
      )}

      {editingCalendar && (
        <CreateOrEditModal
          mode="edit"
          roster={members}
          memberNames={memberNames}
          initialName={editingCalendar.name}
          initialMemberIds={calendarMembers[editingCalendar.id] || []}
          onCancel={() => setEditingCalendar(null)}
          onSave={(_, mIds) => setMembersOnCalendar(editingCalendar.id, mIds)}
        />
      )}
    </div>
  )
}

function CalendarCard({ calendar, memberIds, roster, memberNames, onEdit, onDelete }) {
  const memberRows = memberIds.map(uid => {
    const m = roster.find(r => r.user_id === uid)
    return { uid, name: memberNames[uid] || `Rep ${uid.slice(-4)}`, repType: m?.rep_type || null }
  })
  const closers = memberRows.filter(r => r.repType === 'closer' || r.repType === 'both')
  const setters = memberRows.filter(r => r.repType !== 'closer' && r.repType !== 'both')

  return (
    <div style={panel}>
      <div style={panelHeader}>
        <h3 style={panelHeading}>{calendar.name}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={ghostBtn}>Edit members</button>
          <button onClick={onDelete} style={{ ...ghostBtn, color: '#b91c1c', borderColor: '#fca5a5' }}>Delete</button>
        </div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {memberRows.length === 0 ? (
          <div style={emptyMsg}>No members yet. Tap Edit members to add reps.</div>
        ) : (
          <>
            <Group title="Closers" rows={closers} accent="#0F172A" />
            <Group title="Setters" rows={setters} accent="#475569" />
          </>
        )}
      </div>
    </div>
  )
}

function Group({ title, rows, accent }) {
  if (rows.length === 0) return null
  return (
    <div>
      <div style={groupLabel}>{title} ({rows.length})</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {rows.map((r, i) => (
          <span key={r.uid} style={{
            ...chip,
            background: i === 0 ? `${accent}11` : '#fff',
            border: `1px solid ${accent}33`,
            color: accent
          }}>
            <span style={{ ...miniAvatar, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initialsOf(r.name)}</span>
            {r.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function CreateOrEditModal({ mode, roster, memberNames, initialName, initialMemberIds, onCancel, onSave }) {
  const [name, setName] = useState(initialName)
  const [selected, setSelected] = useState(new Set(initialMemberIds))
  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      const an = memberNames[a.user_id] || ''
      const bn = memberNames[b.user_id] || ''
      return an.toLowerCase().localeCompare(bn.toLowerCase())
    })
  }, [roster, memberNames])

  function toggle(uid) {
    const next = new Set(selected)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    setSelected(next)
  }

  const canSave = mode === 'edit' || (name.trim().length > 0)

  return (
    <div style={modalBackdrop} onClick={onCancel}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h2 style={modalTitle}>{mode === 'create' ? 'New shared calendar' : `Edit "${initialName}"`}</h2>

        {mode === 'create' && (
          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Maryland Blitz"
              style={input}
            />
          </div>
        )}

        <div>
          <label style={fieldLabel}>Members ({selected.size})</label>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            {sortedRoster.map(m => {
              const name = memberNames[m.user_id] || `Rep ${m.user_id.slice(-4)}`
              const checked = selected.has(m.user_id)
              const repType = m.rep_type
              return (
                <button
                  key={m.user_id}
                  onClick={() => toggle(m.user_id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: 0, background: checked ? '#F1F5F9' : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid #F1F5F9'
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(m.user_id)} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{name}</span>
                  {repType && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 999,
                      background: repType === 'closer' || repType === 'both' ? '#cffafe' : '#f1f5f9',
                      color: repType === 'closer' || repType === 'both' ? '#0e7490' : '#475569',
                      textTransform: 'capitalize'
                    }}>{repType}</span>
                  )}
                </button>
              )
            })}
            {sortedRoster.length === 0 && (
              <div style={emptyMsg}>No team members yet.</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button
            onClick={() => onSave(name.trim(), Array.from(selected))}
            disabled={!canSave}
            style={{ ...primaryBtn, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            {mode === 'create' ? 'Create calendar' : 'Save members'}
          </button>
        </div>
      </div>
    </div>
  )
}

function initialsOf(name) {
  if (!name) return '?'
  const parts = name.split(/[\s.@]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const pageStyle = { padding: '24px 32px 64px', minWidth: 0 }
const topRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16, flexWrap: 'wrap' }
const crumbs = { fontSize: 13, color: '#64748B', marginBottom: 4 }
const crumbLink = { color: '#64748B', textDecoration: 'none' }
const h1Style = { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }
const leadCopy = { fontSize: 14, color: '#475569', marginBottom: 24, maxWidth: 720 }

const primaryBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: '1px solid #0F172A', background: '#0F172A', color: '#fff', cursor: 'pointer'
}
const ghostBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#1E293B'
}

const panel = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }
const panelHeader = {
  padding: '14px 18px', borderBottom: '1px solid #E2E8F0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap'
}
const panelHeading = { margin: 0, fontSize: 15, fontWeight: 600, color: '#0F172A' }

const groupLabel = { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }
const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px 4px 4px', borderRadius: 999, fontSize: 13, fontWeight: 600
}
const miniAvatar = {
  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontSize: 10, fontWeight: 700
}

const emptyMsg = { color: '#94A3B8', fontSize: 13, padding: 16, textAlign: 'center' }
const errorBanner = {
  padding: 12, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FCA5A5',
  borderRadius: 8, color: '#b91c1c', fontSize: 13
}

const modalBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  padding: 16
}
const modal = {
  background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
  boxShadow: '0 24px 80px rgba(15,23,42,0.18)'
}
const modalTitle = { fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }
const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B', marginBottom: 6 }
const input = {
  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
  border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A',
  boxSizing: 'border-box', fontFamily: 'inherit'
}
