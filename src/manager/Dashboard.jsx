import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_META = {
  appointment:    { emoji: '📅', label: 'Appointment',    color: '#06b6d4' },
  interested:     { emoji: '👍', label: 'Interested',     color: '#22c55e' },
  callback:       { emoji: '📞', label: 'Callback',       color: '#f59e0b' },
  not_interested: { emoji: '❌', label: 'Not Interested', color: '#ef4444' },
  no_answer:      { emoji: '🔘', label: 'No Answer',      color: '#94a3b8' },
  dq:             { emoji: '⛔️', label: 'DQ',              color: '#475569' }
}

const PIPELINE_ORDER = ['appointment', 'interested', 'callback', 'not_interested', 'dq']

export default function Dashboard({ session, team, role }) {
  const [members, setMembers] = useState([])
  const [doors, setDoors] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: m }, { data: d }] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id, role, joined_at')
          .eq('team_id', team.id)
          .order('joined_at', { ascending: true }),
        supabase
          .from('doors')
          .select('id, status, address, owner_name, user_id, rep_name, created_at, updated_at')
          .eq('team_id', team.id)
      ])

      setMembers(m || [])
      setDoors(d || [])

      const doorIds = (d || []).map(x => x.id)
      if (doorIds.length === 0) {
        setRecentEvents([])
      } else {
        const { data: events } = await supabase
          .from('door_events')
          .select('id, door_id, user_id, rep_name, status, notes, appointment_at, created_at')
          .in('door_id', doorIds)
          .order('created_at', { ascending: false })
          .limit(40)
        setRecentEvents(events || [])
      }
    } catch (e) {
      console.error('Dashboard load error:', e)
      setError(e.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [team.id])

  // user_id → display name (from latest event or door rep_name)
  const repNameMap = {}
  for (const e of recentEvents) {
    if (e.user_id && e.rep_name && !repNameMap[e.user_id]) {
      repNameMap[e.user_id] = e.rep_name
    }
  }
  for (const dr of doors) {
    if (dr.user_id && dr.rep_name && !repNameMap[dr.user_id]) {
      repNameMap[dr.user_id] = dr.rep_name
    }
  }

  const pipelineCounts = PIPELINE_ORDER.reduce((acc, status) => {
    acc[status] = doors.filter(d => d.status === status).length
    return acc
  }, {})

  const repStats = members.map(m => {
    const myDoors = doors.filter(d => d.user_id === m.user_id)
    return {
      user_id: m.user_id,
      role: m.role,
      name: repNameMap[m.user_id] || m.user_id.slice(0, 8) + '…',
      total: myDoors.length,
      conversations: myDoors.filter(d => d.status !== 'no_answer').length,
      appointments: myDoors.filter(d => d.status === 'appointment').length,
      lastActivity: myDoors.reduce((latest, d) => {
        const t = d.updated_at || d.created_at
        return (!latest || (t && t > latest)) ? t : latest
      }, null)
    }
  })

  return (
    <div style={pageStyle}>
      <Header team={team} session={session} role={role} onRefresh={loadData} />
      <main style={mainStyle}>
        {error && (
          <div style={errorBanner}>{error}</div>
        )}

        {loading && doors.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 64 }}>
            Loading team data…
          </div>
        ) : (
          <>
            <PipelineSummary counts={pipelineCounts} totalDoors={doors.length} />

            <div style={twoColGrid}>
              <RosterSection stats={repStats} />
              <ActivitySection events={recentEvents} repNameMap={repNameMap} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Header({ team, session, role, onRefresh }) {
  return (
    <header style={headerStyle}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🚪</span>
          <span>{team.name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#a5f3fc',
            background: '#164e63', padding: '2px 8px', borderRadius: 6,
            textTransform: 'uppercase', letterSpacing: 1
          }}>
            {role}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          Manager Portal · {session.user.email}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRefresh} style={ghostBtnStyle}>
          ↻ Refresh
        </button>
        <button onClick={() => supabase.auth.signOut()} style={ghostBtnStyle}>
          Sign Out
        </button>
      </div>
    </header>
  )
}

function PipelineSummary({ counts, totalDoors }) {
  return (
    <section style={{ ...cardStyle, marginBottom: 16 }}>
      <h2 style={sectionHeaderStyle}>Team Pipeline ({totalDoors} doors)</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 8
      }}>
        {PIPELINE_ORDER.map(status => {
          const meta = STATUS_META[status]
          const count = counts[status]
          return (
            <div key={status} style={{
              padding: 12,
              background: '#0f172a',
              border: `1px solid ${meta.color}33`,
              borderRadius: 10
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                {meta.emoji} {meta.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: meta.color }}>
                {count}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RosterSection({ stats }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionHeaderStyle}>Roster ({stats.length})</h2>
      {stats.length === 0 ? (
        <div style={emptyMsgStyle}>No team members yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.map(s => (
            <div key={s.user_id} style={memberRowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                  {s.role !== 'rep' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#a5f3fc',
                      background: '#164e63', padding: '1px 6px', borderRadius: 4,
                      textTransform: 'uppercase', letterSpacing: 0.5
                    }}>
                      {s.role}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>🚪 {s.total} doors</span>
                  <span style={{ color: '#22c55e' }}>💬 {s.conversations}</span>
                  <span style={{ color: '#06b6d4' }}>📅 {s.appointments}</span>
                </div>
                {s.lastActivity && (
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                    Last activity: {formatRelative(s.lastActivity)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivitySection({ events, repNameMap }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionHeaderStyle}>Recent Activity</h2>
      {events.length === 0 ? (
        <div style={emptyMsgStyle}>No activity yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map(e => {
            const meta = STATUS_META[e.status] || STATUS_META.no_answer
            const repName = e.rep_name || repNameMap[e.user_id] || 'Someone'
            return (
              <div key={e.id} style={eventRowStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                    {meta.emoji} Marked {meta.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatRelative(e.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  by {repName}
                </div>
                {e.appointment_at && (
                  <div style={{ fontSize: 11, color: meta.color, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🗓️</span>
                    <span>Scheduled: {new Date(e.appointment_at).toLocaleString()}</span>
                  </div>
                )}
                {e.notes && (
                  <div style={{
                    fontSize: 12, color: '#cbd5e1', marginTop: 6,
                    padding: 8, background: '#0a0f1c', borderRadius: 6,
                    lineHeight: 1.4
                  }}>
                    {e.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function formatRelative(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.floor((now - t) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

const pageStyle = {
  minHeight: '100dvh', background: '#0f172a', color: '#f1f5f9',
  fontFamily: 'system-ui, sans-serif',
  overflow: 'auto'
}
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 24px', borderBottom: '1px solid #1e293b',
  background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
  position: 'sticky', top: 0, zIndex: 10, gap: 12, flexWrap: 'wrap'
}
const ghostBtnStyle = {
  padding: '8px 14px', background: '#1e293b',
  border: '1px solid #334155', borderRadius: 10,
  color: '#cbd5e1', fontSize: 13, cursor: 'pointer'
}
const mainStyle = { padding: 24, maxWidth: 1200, margin: '0 auto' }
const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16
}
const cardStyle = {
  background: '#1e293b', borderRadius: 16, padding: 20,
  border: '1px solid #334155'
}
const sectionHeaderStyle = {
  fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: 1, color: '#94a3b8', margin: '0 0 16px'
}
const memberRowStyle = {
  display: 'flex', alignItems: 'center',
  padding: '12px 14px', background: '#0f172a', borderRadius: 10,
  border: '1px solid #1e293b'
}
const eventRowStyle = {
  padding: 12, background: '#0f172a', borderRadius: 10,
  border: '1px solid #1e293b'
}
const emptyMsgStyle = {
  color: '#475569', fontSize: 13, padding: 24, textAlign: 'center'
}
const errorBanner = {
  padding: 12, marginBottom: 16,
  background: '#450a0a', border: '1px solid #ef4444',
  borderRadius: 10, color: '#fca5a5', fontSize: 13
}
