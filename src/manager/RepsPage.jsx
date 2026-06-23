import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const monoFamily = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const AVATAR_COLORS = ['#F59E0B', '#06b6d4', '#22c55e', '#475569', '#a855f7', '#ef4444']

const ROLE_OPTIONS = ['rep', 'manager', 'owner']
const REP_TYPE_OPTIONS = [null, 'setter', 'closer', 'both']

export default function RepsPage({ session, team, role }) {
  const [members, setMembers] = useState([])
  const [pending, setPending] = useState([])
  const [eventNames, setEventNames] = useState({}) // user_id -> rep_name fallback
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInvite, setShowInvite] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase
          .from('team_members')
          .select('id, user_id, role, rep_type, display_name, joined_at')
          .eq('team_id', team.id)
          .order('joined_at', { ascending: true }),
        supabase
          .from('pending_invites')
          .select('id, email, first_name, last_name, intended_role, intended_rep_type, invited_at, accepted_at')
          .eq('team_id', team.id)
          .is('accepted_at', null)
          .order('invited_at', { ascending: false }),
      ])
      setMembers(m || [])
      setPending(p || [])

      // Harvest fallback names from door_events for members with no display_name
      const needNames = (m || []).filter(x => !x.display_name).map(x => x.user_id)
      const map = {}
      await Promise.all(needNames.map(async (uid) => {
        const { data: rows } = await supabase
          .from('door_events')
          .select('rep_name')
          .eq('user_id', uid)
          .not('rep_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
        if (rows?.[0]?.rep_name) map[uid] = rows[0].rep_name
      }))
      setEventNames(map)
    } catch (e) {
      console.error('Reps load error:', e)
      setError(e.message || 'Failed to load reps.')
    } finally {
      setLoading(false)
    }
  }, [team.id])

  useEffect(() => { loadAll() }, [loadAll])

  async function invite(form) {
    setError(null)
    const { data: { session: cur } } = await supabase.auth.getSession()
    const token = cur?.access_token
    if (!token) {
      setError('Not signed in.')
      return
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-rep`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: team.id,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          rep_type: form.rep_type,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.error) {
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      if (body.warning === 'already_registered') {
        alert(`${form.email} already has an account. They'll be added to ${team.name} when they next sign in.`)
      } else {
        alert(`Invite sent to ${form.email}.`)
      }
      await loadAll()
      setShowInvite(false)
    } catch (e) {
      setError(e.message || 'Failed to send invite.')
    }
  }

  async function updateMember(memberId, patch) {
    setError(null)
    try {
      const { error: uErr } = await supabase
        .from('team_members')
        .update(patch)
        .eq('id', memberId)
      if (uErr) throw uErr
      await loadAll()
    } catch (e) {
      setError(e.message || 'Failed to update.')
    }
  }

  async function revokeInvite(inviteId) {
    if (!confirm('Revoke this pending invite? They won\'t be able to join until you re-invite them.')) return
    setError(null)
    try {
      const { error: dErr } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', inviteId)
      if (dErr) throw dErr
      await loadAll()
    } catch (e) {
      setError(e.message || 'Failed to revoke.')
    }
  }

  const rows = useMemo(() => {
    return [...members].sort((a, b) => {
      const an = a.display_name || eventNames[a.user_id] || ''
      const bn = b.display_name || eventNames[b.user_id] || ''
      return an.toLowerCase().localeCompare(bn.toLowerCase())
    })
  }, [members, eventNames])

  return (
    <div style={pageStyle}>
      <div style={topRow}>
        <div>
          <div style={crumbs}>
            <Link to="/manager" style={crumbLink}>{team.name}</Link> / Reps
          </div>
          <h1 style={h1Style}>Reps</h1>
        </div>
        <button onClick={() => setShowInvite(true)} style={primaryBtn}>+ Invite rep</button>
      </div>

      <p style={leadCopy}>
        Invite new reps by email — they get a magic-link sign-in, and on first sign-in they're automatically added to {team.name} with the role and type you set here.
      </p>

      {error && <div style={errorBanner}>{error}</div>}

      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={sectionLabel}>Pending invites ({pending.length})</div>
          <div style={panel}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Invited</th>
                  <th style={thStyle} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {pending.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: monoFamily, fontSize: 12, color: '#475569' }}>{p.email}</td>
                    <td style={tdStyle}>{p.intended_role}</td>
                    <td style={tdStyle}>{p.intended_rep_type || '—'}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{formatRel(p.invited_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => revokeInvite(p.id)} style={ghostBtnSm}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={sectionLabel}>Active reps ({rows.length})</div>
      {loading && rows.length === 0 ? (
        <div style={emptyMsg}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={panel}>
          <div style={{ padding: 24, textAlign: 'center', color: '#475569' }}>
            No reps yet. Click <strong>+ Invite rep</strong> to invite your first one.
          </div>
        </div>
      ) : (
        <div style={panel}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const name = m.display_name || eventNames[m.user_id] || `Rep ${m.user_id.slice(-4)}`
                const initials = initialsOf(name)
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
                const isSelf = m.user_id === session.user.id
                return (
                  <tr key={m.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ ...avatar, background: color }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {name}
                            {isSelf && <span style={youTag}>you</span>}
                          </div>
                          <div style={{ fontFamily: monoFamily, fontSize: 11, color: '#94A3B8' }}>{m.user_id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={m.role}
                        disabled={isSelf && m.role === 'owner'}
                        onChange={e => updateMember(m.id, { role: e.target.value })}
                        style={selectStyle}
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={m.rep_type || ''}
                        onChange={e => updateMember(m.id, { rep_type: e.target.value || null })}
                        style={selectStyle}
                      >
                        {REP_TYPE_OPTIONS.map(t => (
                          <option key={t || '_none'} value={t || ''}>{t || '—'}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#64748B' }}>{formatRel(m.joined_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteModal
          team={team}
          onCancel={() => setShowInvite(false)}
          onSubmit={invite}
        />
      )}
    </div>
  )
}

function InviteModal({ team, onCancel, onSubmit }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('rep')
  const [repType, setRepType] = useState('setter')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = email.includes('@') && !submitting

  async function handle() {
    setSubmitting(true)
    await onSubmit({
      first_name: first.trim() || null,
      last_name: last.trim() || null,
      email: email.trim().toLowerCase(),
      role,
      rep_type: repType || null,
    })
    setSubmitting(false)
  }

  return (
    <div style={modalBackdrop} onClick={onCancel}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h2 style={modalTitle}>Invite rep to {team.name}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={fieldLabel}>First name</label>
            <input
              autoFocus
              value={first}
              onChange={e => setFirst(e.target.value)}
              placeholder="Jamie"
              style={input}
            />
          </div>
          <div>
            <label style={fieldLabel}>Last name</label>
            <input
              value={last}
              onChange={e => setLast(e.target.value)}
              placeholder="Park"
              style={input}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jamie@example.com"
            style={input}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div>
            <label style={fieldLabel}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Type</label>
            <select value={repType || ''} onChange={e => setRepType(e.target.value || null)} style={selectStyle}>
              {REP_TYPE_OPTIONS.map(t => (
                <option key={t || '_none'} value={t || ''}>{t || '—'}</option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 16px' }}>
          We'll email them a magic-link sign-in. On first sign-in they're added to {team.name} with the role + type above. Manager + owner roles can see the manager portal too.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button
            onClick={handle}
            disabled={!canSubmit}
            style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Sending…' : 'Send invite'}
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

function formatRel(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

const pageStyle = { padding: '24px 32px 64px', minWidth: 0 }
const topRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16, flexWrap: 'wrap' }
const crumbs = { fontSize: 13, color: '#64748B', marginBottom: 4 }
const crumbLink = { color: '#64748B', textDecoration: 'none' }
const h1Style = { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }
const leadCopy = { fontSize: 14, color: '#475569', marginBottom: 24, maxWidth: 720 }

const sectionLabel = { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }

const primaryBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: '1px solid #0F172A', background: '#0F172A', color: '#fff', cursor: 'pointer'
}
const ghostBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#1E293B'
}
const ghostBtnSm = {
  padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#b91c1c'
}

const panel = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle = {
  textAlign: 'left', padding: '10px 18px', borderBottom: '1px solid #F1F5F9',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94A3B8'
}
const tdStyle = { textAlign: 'left', padding: '10px 18px', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }

const avatar = {
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 700, fontSize: 13, flexShrink: 0, color: '#fff'
}
const youTag = {
  marginLeft: 6, fontSize: 10, padding: '1px 6px', background: '#F1F5F9',
  color: '#64748B', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5
}

const selectStyle = {
  padding: '6px 8px', borderRadius: 6, fontSize: 13,
  border: '1px solid #E2E8F0', background: '#fff', color: '#1E293B',
  fontFamily: 'inherit', textTransform: 'capitalize'
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
