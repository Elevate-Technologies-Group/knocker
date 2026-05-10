import { Link } from 'react-router-dom'

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div style={pageStyle}>
      <nav style={navStyle}>
        <div style={navInner}>
          <Link to="/" style={logoStyle}>
            <span style={logoIcon}>🚪</span>
            <span style={logoText}>knocker</span>
          </Link>
          <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            <Link to="/" style={navLink}>Home</Link>
            <Link to="/privacy" style={navLink}>Privacy</Link>
            <Link to="/support" style={navLink}>Support</Link>
            <Link to="/manager" style={navLink}>Manager portal</Link>
          </div>
        </div>
      </nav>
      <main style={mainStyle}>
        <h1 style={h1Style}>{title}</h1>
        <div style={metaStyle}>Last updated {lastUpdated}</div>
        <div style={proseStyle}>{children}</div>
      </main>
      <footer style={footerStyle}>
        © {new Date().getFullYear()} Elevate Technologies Group · Built for solar reps
      </footer>
    </div>
  )
}

const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

const pageStyle = {
  margin: 0, fontFamily: fontStack, color: '#0A0A0A', background: '#FAFAF7',
  WebkitFontSmoothing: 'antialiased', minHeight: '100vh',
  display: 'flex', flexDirection: 'column'
}

const navStyle = {
  position: 'sticky', top: 0, zIndex: 50,
  background: 'rgba(250,250,247,0.85)',
  backdropFilter: 'saturate(180%) blur(16px)',
  WebkitBackdropFilter: 'saturate(180%) blur(16px)',
  borderBottom: '1px solid rgba(15,23,42,0.06)'
}
const navInner = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 32px', maxWidth: 800, margin: '0 auto', gap: 16, flexWrap: 'wrap'
}

const logoStyle = { display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: '#0A0A0A' }
const logoIcon = {
  width: 32, height: 32, background: '#0A0A0A', borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, color: '#FAFAF7'
}
const logoText = { fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }
const navLink = { color: '#1E293B', textDecoration: 'none', fontWeight: 500 }

const mainStyle = { flex: 1, maxWidth: 760, margin: '0 auto', padding: '64px 32px 96px', width: '100%' }
const h1Style = { fontSize: 'clamp(36px, 6vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }
const metaStyle = { fontSize: 13, color: '#64748B', marginBottom: 40 }

const proseStyle = {
  fontSize: 16, lineHeight: 1.65, color: '#1E293B'
}

const footerStyle = { padding: '32px', borderTop: '1px solid #E2E8F0', fontSize: 13, color: '#64748B', textAlign: 'center' }
