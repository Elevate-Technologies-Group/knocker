import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const monoFamily = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

/**
 * ManagerShell — sidebar + main content layout shared by every manager
 * portal page. Pages render their own header / body inside the `children`
 * slot. Dashboard, CalendarsPage etc. all wrap themselves in this.
 */
export default function ManagerShell({ session, team, role, children }) {
  return (
    <div style={appStyle}>
      <Sidebar team={team} role={role} session={session} />
      <main style={mainStyle}>{children}</main>
    </div>
  )
}

function Sidebar({ team, role, session }) {
  const location = useLocation()
  const isActive = (path) => {
    if (path === '/manager') return location.pathname === '/manager' || location.pathname === '/manager/'
    return location.pathname.startsWith(path)
  }
  const myInitials = initialsOf(session.user.email || '?')

  return (
    <aside style={asideStyle}>
      <div style={brandBlock}>
        <div style={brandIcon}>🚪</div>
        <div style={brandName}>knocker</div>
        <div style={brandTag}>{(role || '').toUpperCase()}</div>
      </div>

      <div style={teamSwitch}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{team.name}</div>
          <div style={{ fontFamily: monoFamily, fontSize: 12, color: '#475569', marginTop: 2 }}>{team.slug}</div>
        </div>
      </div>

      <nav style={sideNav}>
        <NavLink to="/manager" icon="▦" label="Dashboard" active={isActive('/manager')} />
        <NavLink to="/manager/reps" icon="👥" label="Reps" active={isActive('/manager/reps')} />
        <NavLink to="/manager/calendars" icon="📆" label="Calendars" active={isActive('/manager/calendars')} />
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

function NavLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      style={{
        ...sideLink,
        ...(active ? sideLinkActive : null),
        textDecoration: 'none'
      }}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function NavItem({ icon, label, disabled }) {
  return (
    <span style={{
      ...sideLink,
      ...(disabled ? sideLinkDisabled : null)
    }}>
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
      {disabled && <span style={soonChip}>soon</span>}
    </span>
  )
}

function initialsOf(name) {
  if (!name) return '?'
  const parts = name.split(/[\s.@]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

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

const mainStyle = { minWidth: 0 }
