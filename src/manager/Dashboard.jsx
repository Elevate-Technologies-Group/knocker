import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_META = {
  appointment:    { emoji: '📅', label: 'Appointment',    bg: 'rgba(6,182,212,0.15)',   fg: '#0e7490' },
  interested:     { emoji: '👍', label: 'Interested',     bg: 'rgba(34,197,94,0.15)',   fg: '#15803d' },
  callback:       { emoji: '📞', label: 'Callback',       bg: 'rgba(245,158,11,0.18)',  fg: '#b45309' },
  not_interested: { emoji: '❌', label: 'Not Interested', bg: 'rgba(239,68,68,0.12)',   fg: '#b91c1c' },
  no_answer:      { emoji: '🔘', label: 'No Answer',      bg: 'rgba(148,163,184,0.18)', fg: '#475569' },
  dq:             { emoji: '⛔️', label: 'DQ',             bg: 'rgba(71,85,105,0.18)',   fg: '#334155' }
}

const REP_AVATAR_COLORS = ['#F59E0B', '#06b6d4', '#22c55e', '#475569', '#a855f7', '#ef4444']

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

  const repNameMap = {}
  for (const e of recentEvents) {
    if (e.user_id && e.rep_name && !repNameMap[e.user_id]) repNameMap[e.user_id] = e.rep_name
  }
  for (const dr of doors) {
    if (dr.user_id && dr.rep_name && !repNameMap[dr.user_id]) repNameMap[dr.user_id] = dr.rep_name
  }

  const kpis = {
    doors: doors.length,
    appointments: doors.filter(d => d.status === 'appointment').length,
    interested: doors.filter(d => d.status === 'interested').length,
    activeReps: new Set(recentEvents.map(e => e.user_id).filter(Boolean)).size,
    totalReps: members.length
  }

  const repStats = members
    .map((m, i) => {
      const myDoors = doors.filter(d => d.user_id === m.user_id)
      const fullName = repNameMap[m.user_id] || m.user_id.slice(0, 8) + '…'
      return {
        user_id: m.user_id,
        role: m.role,
        name: fullName,
        initials: initialsOf(fullName),
        color: REP_AVATAR_COLORS[i % REP_AVATAR_COLORS.length],
        doors: myDoors.length,
        appointments: myDoors.filter(d => d.status === 'appointment').length,
        interested: myDoors.filter(d => d.status === 'interested').length
      }
    })
    .sort((a, b) => b.doors - a.doors)

  const maxDoors = Math.max(1, ...repStats.map(r => r.doors))

  return (
    <div style={appStyle}>
      <Sidebar team={team} role={role} session={session} />
      <main style={mainStyle}>
        <div style={topRow}>
          <div>
            <div style={crumbs}>{team.name} / Dashboard</div>
            <h1 style={h1Style}>{formatToday()}</h1>
          </div>
          <div style={toolbar}>
            <button style={ghostBtn} onClick={loadData}>↻ Refresh</button>
          </div>
        </div>

        {error && <div style={errorBanner}>{error}</div>}

        {loading && doors.length === 0 ? (
          <div style={emptyMsg}>Loading team data…</div>
        ) : (
          <>
            <KpiRow kpis={kpis} />
            <div style={twoColGrid}>
              <ActivityPanel events={recentEvents} repNameMap={repNameMap} doorAddrMap={Object.fromEntries(doors.map(d => [d.id, d.address]))} />
              <LeaderboardPanel reps={repStats} maxDoors={maxDoors} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Sidebar({ team, role, session }) {
  const myInitials = initialsOf(session.user.email || '?')
  return (
    <aside style={asideStyle}>
      <div style={brandBlock}>
        <div style={brandIcon}>🚪</div>
        <div style={brandName}>knocker</div>
        <div style={brandTag}>{role.toUpperCase()}</div>
      </div>

      <div style={teamSwitch}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{team.name}</div>
          <div style={{ fontFamily: monoFamily, fontSize: 12, color: '#475569', marginTop: 2 }}>{team.slug}</div>
        </div>
      </div>

      <nav style={sideNav}>
        <NavItem icon="▦" label="Dashboard" active />
        <NavItem icon="👥" label="Reps" disabled />
        <NavItem icon="📍" label="Territories" disabled />
        <NavItem icon="📊" label="Pipeline" disabled />
        <NavItem icon="📅" label="Appointments" disabled />
        <div style={navGroup}>Settings</div>
        <NavItem icon="⚙️" label="Team" disabled />
        <NavItem icon="🔌" label="Integrations" disabled />
      </nav>

      <div style={meBlock}>
        <div style={{ ...avatar, background: '#F59E0B', color: '#0A0A0A' }}>{myInitials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.user.email}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{role}</div>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={signOutBtn} title="Sign out">↪</button>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, disabled }) {
  return (
    <a style={{
      ...sideLink,
      ...(active ? sideLinkActive : null),
      ...(disabled ? sideLinkDisabled : null)
    }}>
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
      {disabled && <span style={soonChip}>soon</span>}
    </a>
  )
}

function KpiRow({ kpis }) {
  return (
    <div style={kpisGrid}>
      <Kpi label="Doors knocked" value={kpis.doors} />
      <Kpi label="Appointments" value={kpis.appointments} />
      <Kpi label="Interested" value={kpis.interested} />
      <Kpi label="Active reps" value={`${kpis.activeReps} / ${kpis.totalReps}`} />
    </div>
  )
}

function Kpi({ label, value }) {
  return (
    <div style={kpiCard}>
      <div style={kpiLabel}>{label}</div>
      <div style={kpiNum}>{value}</div>
    </div>
  )
}

function ActivityPanel({ events, repNameMap, doorAddrMap }) {
  return (
    <div style={panel}>
      <div style={panelHeader}>
        <h3 style={panelHeading}>Recent activity</h3>
        <div style={panelMeta}>Last 40</div>
      </div>
      {events.length === 0 ? (
        <div style={emptyMsg}>No activity yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Rep</th>
                <th style={thStyle}>Disposition</th>
                <th style={thStyle}>Address</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const meta = STATUS_META[e.status] || STATUS_META.no_answer
                const repName = e.rep_name || repNameMap[e.user_id] || '—'
                return (
                  <tr key={e.id}>
                    <td style={{ ...tdStyle, ...tdMono }}>{formatTime(e.created_at)}</td>
                    <td style={tdStyle}>{shortName(repName)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...chipStyle, background: meta.bg, color: meta.fg }}>
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#475569' }}>{doorAddrMap[e.door_id] || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LeaderboardPanel({ reps, maxDoors }) {
  return (
    <div style={panel}>
      <div style={panelHeader}>
        <h3 style={panelHeading}>Leaderboard</h3>
        <div style={panelMeta}>By doors</div>
      </div>
      {reps.length === 0 ? (
        <div style={emptyMsg}>No team members yet.</div>
      ) : (
        <div>
          {reps.map(r => (
            <div key={r.user_id} style={lbRow}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0, flex: 1 }}>
                <div style={{ ...avatar, background: r.color, color: '#fff' }}>{r.initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shortName(r.name)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    {r.appointments} appts · {r.interested} interested
                  </div>
                </div>
              </div>
              <div style={{ width: 96, flexShrink: 0 }}>
                <div style={{ fontFamily: monoFamily, fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{r.doors}</div>
                <div style={lbBar}>
                  <div style={{ ...lbBarFill, width: `${(r.doors / maxDoors) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

function shortName(name) {
  if (!name) return '—'
  const at = name.indexOf('@')
  return at > 0 ? name.slice(0, at) : name
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const monoFamily = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

const appStyle = {
  display: 'grid', gridTemplateColumns: '240px 1fr',
  minHeight: '100dvh', background: '#F8FAFC', color: '#1E293B',
  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14
}

const asideStyle = {
  background: '#fff', borderRight: '1px solid #E2E8F0',
  display: 'flex', flexDirection: 'column',
  position: 'sticky', top: 0, height: '100dvh', overflow: 'auto'
}

const brandBlock = {
  padding: '18px 18px 14px', display: 'flex', gap: 10, alignItems: 'center',
  borderBottom: '1px solid #E2E8F0'
}
const brandIcon = {
  width: 30, height: 30, background: '#0A0A0A', borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
}
const brandName = { fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }
const brandTag = {
  marginLeft: 'auto', fontSize: 10, padding: '2px 6px',
  background: '#F1F5F9', color: '#64748B', borderRadius: 4, fontWeight: 600
}

const teamSwitch = {
  margin: '14px 12px 6px', padding: '10px 12px',
  background: '#F1F5F9', borderRadius: 8
}

const sideNav = {
  padding: 8, display: 'flex', flexDirection: 'column', gap: 2,
  flex: 1, overflow: 'auto'
}
const sideLink = {
  display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px',
  textDecoration: 'none', color: '#475569', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer'
}
const sideLinkActive = { background: '#0F172A', color: '#fff' }
const sideLinkDisabled = { color: '#94A3B8', cursor: 'not-allowed' }
const navGroup = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: '#94A3B8', padding: '12px 12px 4px'
}
const soonChip = {
  marginLeft: 'auto', fontSize: 9, padding: '1px 6px',
  background: '#F1F5F9', color: '#94A3B8', borderRadius: 4,
  textTransform: 'uppercase', letterSpacing: 0.5
}

const meBlock = {
  padding: 14, borderTop: '1px solid #E2E8F0',
  display: 'flex', gap: 10, alignItems: 'center'
}
const avatar = {
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700, fontSize: 13, flexShrink: 0
}
const signOutBtn = {
  background: 'transparent', border: 'none', color: '#64748B',
  fontSize: 18, cursor: 'pointer', padding: '4px 6px'
}

const mainStyle = { padding: '24px 32px 64px', minWidth: 0 }
const topRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }
const crumbs = { fontSize: 13, color: '#64748B', marginBottom: 4 }
const h1Style = { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }
const toolbar = { display: 'flex', gap: 8 }
const ghostBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#1E293B'
}

const kpisGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12, marginBottom: 24
}
const kpiCard = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }
const kpiLabel = { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B' }
const kpiNum = { fontFamily: monoFamily, fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 6, color: '#0F172A' }

const twoColGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16
}

const panel = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }
const panelHeader = {
  padding: '14px 18px', borderBottom: '1px solid #E2E8F0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
}
const panelHeading = { margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }
const panelMeta = { fontSize: 12, color: '#64748B' }

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle = {
  textAlign: 'left', padding: '10px 18px', borderBottom: '1px solid #F1F5F9',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94A3B8'
}
const tdStyle = { textAlign: 'left', padding: '10px 18px', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }
const tdMono = { fontFamily: monoFamily, fontSize: 12, color: '#475569' }

const chipStyle = {
  display: 'inline-flex', gap: 4, alignItems: 'center',
  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600
}

const lbRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 18px', borderBottom: '1px solid #F1F5F9', gap: 12
}
const lbBar = { height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginTop: 4 }
const lbBarFill = { height: '100%', background: '#F59E0B', borderRadius: 999 }

const emptyMsg = { color: '#94A3B8', fontSize: 13, padding: 32, textAlign: 'center' }
const errorBanner = {
  padding: 12, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FCA5A5',
  borderRadius: 8, color: '#b91c1c', fontSize: 13
}
