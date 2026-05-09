import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ManagerLogin() {
  const [step, setStep] = useState('email') // 'email' | 'code'
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
    if (err) {
      setError(err.message)
      return
    }
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
    if (err) {
      setError(err.message)
      return
    }
    // ManagerApp picks up the new session via onAuthStateChange
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚪</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Knocker</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Manager Portal
          </div>
        </div>

        {step === 'email' ? (
          <>
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
            <button onClick={sendCode} disabled={loading || !email.trim()} style={buttonStyle(email.trim() && !loading)}>
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </>
        ) : (
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
            <button onClick={verifyCode} disabled={loading || code.length < 6} style={buttonStyle(code.length === 6 && !loading)}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', border: 'none',
                color: '#64748b', fontSize: 13, cursor: 'pointer',
                marginTop: 8
              }}
            >
              Use a different email
            </button>
          </>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: 10,
            background: '#450a0a', border: '1px solid #ef4444',
            borderRadius: 8, color: '#fca5a5', fontSize: 13,
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: '1px solid #334155',
          textAlign: 'center'
        }}>
          <a href="/" style={{
            fontSize: 12, color: '#64748b', textDecoration: 'none'
          }}>
            ← Back to rep view
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
const buttonStyle = (enabled) => ({
  width: '100%', padding: '14px',
  background: enabled ? '#6366f1' : '#1e293b',
  border: 'none', borderRadius: 14,
  color: enabled ? '#fff' : '#475569',
  fontSize: 16, fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default',
  transition: 'all 0.15s'
})
