import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ManagerLogin from './ManagerLogin'
import Dashboard from './Dashboard'
import ErrorBoundary from './ErrorBoundary'

export default function ManagerApp() {
  return (
    <ErrorBoundary>
      <ManagerAppInner />
    </ErrorBoundary>
  )
}

function ManagerAppInner() {
  const [session, setSession] = useState(null)
  const [team, setTeam] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setTeam(null)
        setRole(null)
        setError(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        // Find any team where this user is manager/owner
        const { data, error } = await supabase
          .from('team_members')
          .select('team_id, role, teams(id, name, slug, owner_user_id)')
          .eq('user_id', session.user.id)
          .in('role', ['manager', 'owner'])
          .limit(1)

        if (error) throw error
        if (!data || data.length === 0) {
          setError("You're signed in, but this account isn't a manager or owner on any team. Contact your team owner if you should have access.")
          return
        }

        setTeam(data[0].teams)
        setRole(data[0].role)
      } catch (e) {
        console.error('Manager check error:', e)
        setError(e.message || 'Could not verify manager access.')
      } finally {
        setLoading(false)
      }
    })()
  }, [session])

  if (loading) {
    return <FullScreenMessage>Loading…</FullScreenMessage>
  }

  if (!session) {
    return <ManagerLogin />
  }

  if (error) {
    return (
      <FullScreenMessage>
        <div style={{ color: '#fca5a5', marginBottom: 16, maxWidth: 400, textAlign: 'center', lineHeight: 1.5 }}>
          {error}
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{
          padding: '10px 20px', background: '#1e293b',
          border: '1px solid #334155', borderRadius: 10,
          color: '#f1f5f9', fontSize: 14, cursor: 'pointer'
        }}>
          Sign Out
        </button>
      </FullScreenMessage>
    )
  }

  return <Dashboard session={session} team={team} role={role} />
}

function FullScreenMessage({ children }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, color: '#f1f5f9', fontFamily: 'system-ui, sans-serif',
      flexDirection: 'column'
    }}>
      {children}
    </div>
  )
}
