import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import KnockerMap from './components/KnockerMap'
import ManagerApp from './manager/ManagerApp'
import Landing from './marketing/Landing'
import Privacy from './marketing/Privacy'
import Support from './marketing/Support'
import RepLogin from './components/RepLogin'
import { supabase } from './lib/supabase'

const LEGACY_SESSION_ID = 'elevate-' + new Date().toISOString().split('T')[0]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/support" element={<Support />} />
      <Route path="/app" element={<RepView />} />
      <Route path="/manager/*" element={<ManagerApp />} />
    </Routes>
  )
}

/**
 * RepView — auth-aware rep shell.
 *
 * Auth states:
 *   loading          → spinner
 *   no session       → RepLogin (email OTP) with legacy-skip option
 *   session, loading team → spinner
 *   session, team    → KnockerMap scoped to team_id
 *   session, no team → KnockerMap scoped to user_id (individual)
 *   legacy (no auth) → KnockerMap scoped to session_id (old flow)
 */
export function RepView() {
  const [session, setSession] = useState(undefined)   // undefined = loading
  const [teamId, setTeamId] = useState(null)
  const [teamName, setTeamName] = useState(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [legacyMode, setLegacyMode] = useState(false)
  const [legacyName, setLegacyName] = useState(() => localStorage.getItem('knocker_rep') || '')
  const [legacyNameInput, setLegacyNameInput] = useState('')

  // ── Auth state listener ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
      if (!newSession) { setTeamId(null); setTeamName(null) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ── Team resolution (fires when session is set) ──────────────────
  useEffect(() => {
    if (!session) return
    setTeamLoading(true)

    ;(async () => {
      try {
        const { data: memberships } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', session.user.id)
          .limit(1)

        if (memberships && memberships.length > 0) {
          const { data: t } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', memberships[0].team_id)
            .single()
          if (t) { setTeamId(t.id); setTeamName(t.name) }
        }
      } catch (e) {
        console.warn('Team lookup failed (non-fatal):', e)
      } finally {
        setTeamLoading(false)
      }
    })()
  }, [session])

  // ── Loading spinner ──────────────────────────────────────────────
  if (session === undefined || teamLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    )
  }

  // ── Legacy mode (no auth, name-only) ────────────────────────────
  if (legacyMode) {
    if (!legacyName) {
      return (
        <div style={{ minHeight: '100dvh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#1e293b', borderRadius: 20, padding: 28, color: '#f1f5f9' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🚪</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Knocker</div>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Legacy mode — name only</div>
            </div>
            <input
              value={legacyNameInput}
              onChange={e => setLegacyNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && legacyNameInput.trim()) {
                  localStorage.setItem('knocker_rep', legacyNameInput.trim())
                  setLegacyName(legacyNameInput.trim())
                }
              }}
              placeholder="Your name"
              autoFocus
              style={{ width: '100%', padding: '12px 14px', marginBottom: 16, background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => {
                if (!legacyNameInput.trim()) return
                localStorage.setItem('knocker_rep', legacyNameInput.trim())
                setLegacyName(legacyNameInput.trim())
              }}
              disabled={!legacyNameInput.trim()}
              style={{ width: '100%', padding: 14, background: legacyNameInput.trim() ? '#6366f1' : '#1e293b', border: 'none', borderRadius: 14, color: legacyNameInput.trim() ? '#fff' : '#475569', fontSize: 16, fontWeight: 700, cursor: legacyNameInput.trim() ? 'pointer' : 'default' }}
            >
              Start Knocking →
            </button>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={() => setLegacyMode(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                ← Sign in with email
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <KnockerMap
        repName={legacyName}
        sessionId={LEGACY_SESSION_ID}
        userId={null}
        teamId={null}
        teamName={null}
        onSignOut={() => { setLegacyMode(false); setLegacyName(''); localStorage.removeItem('knocker_rep') }}
      />
    )
  }

  // ── No session → show login ─────────────────────────────────────
  if (!session) {
    return <RepLogin onLegacySkip={() => setLegacyMode(true)} />
  }

  // ── Authenticated rep ───────────────────────────────────────────
  const email = session.user.email || session.user.user_metadata?.email || ''
  const displayName = session.user.user_metadata?.full_name || email.split('@')[0] || 'Rep'

  return (
    <KnockerMap
      repName={displayName}
      sessionId={LEGACY_SESSION_ID}
      userId={session.user.id}
      teamId={teamId}
      teamName={teamName}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
