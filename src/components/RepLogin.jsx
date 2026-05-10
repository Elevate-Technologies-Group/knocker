import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Rep sign-in screen.
 * Step 1: choose Individual or Team, enter email.
 * Step 2: enter 6-digit OTP code.
 * On success: supabase session fires → RepView auth listener picks it up.
 *
 * Team flow: after auth the caller looks up team_members to find the team.
 * Individual flow: no team lookup needed.
 */
export default function RepLogin({ onLegacySkip }) {
  const [mode, setMode] = useState('individual') // 'individual' | 'team'
  const [step, setStep] = useState('email')       // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function sendCode() {
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ email: trimmed })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('code')
  }

  async function verifyCode() {
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'email'
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    // onAuthStateChange in RepView handles the rest
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚪</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Knocker</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Sign in to start knocking
          </div>
        </div>

        {step === 'email' && (
          <>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['individual', 'team'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '10px',
                    borderRadius: 12,
                    border: `2px solid ${mode === m ? '#6366f1' : '#334155'}`,
                    background: mode === m ? '#1e1e5c' : '#1e293b',
                    color: mode === m ? '#a5b4fc' : '#64748b',
                    fontSize: 14, fontWeight: mode === m ? 700 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {m === 'individual' ? '👤 Individual' : '👥 Team'}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
              {mode === 'individual'
                ? 'Track your own doors. No team sharing.'
                : 'Join your team — see everyone\'s pins and leaderboard.'}
            </div>

            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCode()}
              placeholder="you@yourcompany.com"
              autoFocus
              style={inputStyle}
            />
            <button
              onClick={sendCode}
              disabled={loading || !email.trim()}
              style={btnStyle(email.trim() && !loading)}
            >
              {loading ? 'Sending…' : 'Send Code →'}
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Code sent to</div>
            <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 16 }}>{email}</div>

            <label style={labelStyle}>6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && verifyCode()}
              placeholder="000000"
              autoFocus
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                fontSize: 22,
                letterSpacing: 6,
                textAlign: 'center'
              }}
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              style={btnStyle(code.length === 6 && !loading)}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
              style={{ width: '100%', padding: 10, background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginTop: 8 }}
            >
              Use a different email
            </button>
          </>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: 10, background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5', fontSize: 13, lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Legacy skip — lets non-auth reps still enter a name and go */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #334155', textAlign: 'center' }}>
          <button
            onClick={onLegacySkip}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer' }}
          >
            Continue without account (legacy) →
          </button>
        </div>

        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <a href="/manager" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
            Manager Portal →
          </a>
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  minHeight: '100dvh', background: '#0f172a',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, fontFamily: 'system-ui, sans-serif'
}
const cardStyle = {
  width: '100%', maxWidth: 400,
  background: '#1e293b', borderRadius: 20,
  padding: 28, color: '#f1f5f9'
}
const labelStyle = {
  display: 'block', fontSize: 12, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8
}
const inputStyle = {
  width: '100%', padding: '12px 14px', marginBottom: 16,
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 12, color: '#f1f5f9', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
}
const btnStyle = (enabled) => ({
  width: '100%', padding: 14,
  background: enabled ? '#6366f1' : '#1e293b',
  border: 'none', borderRadius: 14,
  color: enabled ? '#fff' : '#475569',
  fontSize: 16, fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default',
  transition: 'all 0.15s'
})
