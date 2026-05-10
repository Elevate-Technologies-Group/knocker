import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={pageStyle}>
      <NavBar />
      <Hero />
      <FeaturesSection />
      <ScreenshotsSection />
      <ByTheNumbers />
      <Footer />
    </div>
  )
}

function NavBar() {
  return (
    <nav style={navStyle}>
      <div style={navInner}>
        <Logo />
        <div style={navLinks}>
          <a href="#how" style={navLink}>How it works</a>
          <a href="#screenshots" style={navLink}>Screens</a>
          <a href="#pricing" style={navLink}>Pricing</a>
          <Link to="/manager" style={navLink}>Manager portal</Link>
        </div>
        <a style={btnPrimary} href="#download">Get Knocker</a>
      </div>
    </nav>
  )
}

function Logo() {
  return (
    <a href="/" style={logoStyle}>
      <span style={logoIcon}>🚪</span>
      <span style={logoText}>knocker</span>
    </a>
  )
}

function Hero() {
  return (
    <header style={heroStyle}>
      <div style={container}>
        <div style={eyebrow}>Built for solar door-to-door reps</div>
        <h1 style={displayHeading}>Door-to-door,<br/>finally native.</h1>
        <p style={leadCopy}>
          Tap any house on the map. Get the homeowner's name from public county records.
          See real solar potential pulled from Google's Solar API. Log a disposition,
          drop a note, schedule the appointment if it earned one. Your map remembers
          everything forever.
        </p>
        <div style={heroCtas}>
          <a id="download" style={btnAmber} href="#screenshots">Get Knocker for iOS →</a>
          <a href="#how" style={ghostLinkLarge}>See how it works →</a>
        </div>
        <div style={heroMeta}>
          <span><strong style={heroMetaStrong}>Native iOS</strong> · iPhone, iOS 17+</span>
          <span><strong style={heroMetaStrong}>6 county GIS sources</strong> chained for parcel data</span>
          <span><strong style={heroMetaStrong}>Google Solar API</strong> for honest sun estimates</span>
        </div>
        <MapDemo />
      </div>
    </header>
  )
}

function MapDemo() {
  return (
    <div style={mapDemoStyle}>
      <div style={mapPill}>North Phoenix · 142 properties</div>
      {[
        ['12%','32%'], ['18%','64%'], ['28%','28%'],
        ['38%','80%'], ['64%','22%'], ['78%','60%']
      ].map(([l,t], i) => (
        <div key={i} style={{ ...houseDot, left: l, top: t }} />
      ))}
      <div style={{ ...mapPin, left: '22%', top: '48%', background: '#06b6d4', boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(6,182,212,0.6)' }}>📅</div>
      <div style={{ ...mapPin, left: '50%', top: '36%', background: '#22c55e', boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(34,197,94,0.6)' }}>👍</div>
      <div style={{ ...mapPin, left: '70%', top: '70%', background: '#f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(245,158,11,0.6)' }}>📞</div>
      <div style={{ ...mapPin, left: '44%', top: '60%', background: '#94a3b8', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>🔘</div>

      <div style={floatingCallout}>
        <div style={ownerRow}>
          <span style={{ fontSize: 14 }}>👤</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Maria Sandoval</div>
            <div style={{ fontSize: 10, color: '#8E8E93' }}>Property owner · County records</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>2841 W Sweetwater Ave, Phoenix</div>
        <div style={solarMini}>
          <div>
            <div style={solarMiniNum}>2,140</div>
            <div style={solarMiniLbl}>Median Sun Hrs</div>
          </div>
          <div>
            <div style={solarMiniNum}>11,820</div>
            <div style={solarMiniLbl}>Realistic kWh/Yr</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturesSection() {
  return (
    <section id="how" style={section}>
      <div style={container}>
        <h2 style={h2Style}>Every house, every owner,<br/>every visit.</h2>
        <p style={sectionLead}>
          The map is the heart of Knocker. It remembers every door you've touched —
          your team's, too — so you never re-knock the same place at the same time.
        </p>
        <div style={featureGrid}>
          <FeatureCard
            title="Public county records, on tap."
            body="Six county GIS sources chained — Maricopa, Pima, Cochise, Yavapai, Mohave, Pinal, plus statewide layers in SC and VA. Owner name and parcel ID populate the second the pin is tapped."
            stat="6 sources · 2.4M parcels indexed"
          />
          <FeatureCard
            title="Honest solar estimates."
            body="Pulled from Google's Solar API. We use the median sunshine quantile, not the optimistic max — so shaded roofs don't lie to you in the field."
            stat="median ≠ max"
          />
          <FeatureCard
            title="Disposition that means something."
            body="Six statuses: Appointment, Interested, Callback, Not Interested, No Answer, DQ. Pin color follows the status. Your map turns into a living heat map of who said what."
            stat="📅 👍 📞 ❌ 🔘 ⛔️"
          />
          <FeatureCard
            title="Pipeline that stays current."
            body="Every disposition rolls into a kanban automatically. No double-entry. No 'I'll log it tonight.' Tap a card to jump back to the door on the map."
            stat="no manual entry"
          />
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ title, body, stat }) {
  return (
    <div style={featureCard}>
      <h3 style={featureTitle}>{title}</h3>
      <p style={featureBody}>{body}</p>
      <span style={featureStat}>{stat}</span>
    </div>
  )
}

function ScreenshotsSection() {
  const shots = [
    { src: '/screenshots/map.jpg',           caption: 'Every house, mapped.',                      label: 'Map' },
    { src: '/screenshots/door-profile.jpg',  caption: 'Owner + solar in one tap.',                 label: 'Door modal' },
    { src: '/screenshots/pipeline.jpg',      caption: 'Your pipeline at a glance.',                label: 'Pipeline' },
    { src: '/screenshots/calendar.jpg',      caption: 'This week’s appointments, scheduled.', label: 'Calendar' },
    { src: '/screenshots/history.jpg',       caption: 'Every visit, remembered.',                  label: 'History' },
    { src: '/screenshots/appointment-time.jpg', caption: 'Pick a time, it’s on your week.',  label: 'Schedule' }
  ]
  return (
    <section id="screenshots" style={{ ...section, background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
      <div style={container}>
        <h2 style={h2Style}>What it looks like in the field.</h2>
        <p style={sectionLead}>Real screenshots from the iOS app. Phoenix sample data, Apple Maps satellite tiles.</p>
        <div style={screenshotsGrid}>
          {shots.map(s => (
            <figure key={s.src} style={screenshotFig}>
              <img src={s.src} alt={s.label} style={screenshotImg} />
              <figcaption style={screenshotCap}>{s.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function ByTheNumbers() {
  return (
    <section id="pricing" style={ctaStrip}>
      <div style={container}>
        <div style={{ ...eyebrow, color: '#F59E0B' }}>Built by a solar org, for solar reps</div>
        <h2 style={{ ...h2Style, color: '#FAFAF7' }}>Built for the rep, by the route.</h2>
        <p style={{ ...leadCopy, color: 'rgba(250,250,247,0.7)', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
          No SaaS adjectives. No "powerful, intuitive, seamless." Just the things you
          need on the third house of the day.
        </p>
        <div style={dataRow}>
          <DataPoint num="2.4M" lbl="Parcels indexed" />
          <DataPoint num="6" lbl="County GIS sources" />
          <DataPoint num="<200ms" lbl="Tap → owner name" />
          <DataPoint num="100%" lbl="Native iOS" />
        </div>
        <a style={btnAmber} href="#download">Get Knocker for iOS →</a>
        <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(250,250,247,0.6)' }}>
          App Store launch coming soon. Reach out at <a href="mailto:elevatetechnologiesgroup@gmail.com" style={{ color: '#F59E0B', textDecoration: 'underline' }}>elevatetechnologiesgroup@gmail.com</a> for early-access details.
        </p>
      </div>
    </section>
  )
}

function DataPoint({ num, lbl }) {
  return (
    <div style={dataCol}>
      <div style={dataNum}>{num}</div>
      <div style={dataLbl}>{lbl}</div>
    </div>
  )
}

function Footer() {
  return (
    <footer style={footerStyle}>
      <div style={{ ...container, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>© {new Date().getFullYear()} Elevate Technologies Group · Built for solar reps</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/privacy" style={footerLink}>Privacy</Link>
          <Link to="/support" style={footerLink}>Support</Link>
          <Link to="/manager" style={footerLink}>Manager portal</Link>
        </div>
      </div>
    </footer>
  )
}

const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const monoStack = "'Geist Mono', ui-monospace, SFMono-Regular, monospace"

const pageStyle = {
  margin: 0, fontFamily: fontStack, color: '#0A0A0A', background: '#FAFAF7',
  WebkitFontSmoothing: 'antialiased', minHeight: '100vh'
}

const container = { maxWidth: 1180, margin: '0 auto', padding: '0 32px' }

const navStyle = {
  position: 'sticky', top: 0, zIndex: 50,
  background: 'rgba(250,250,247,0.85)',
  backdropFilter: 'saturate(180%) blur(16px)',
  WebkitBackdropFilter: 'saturate(180%) blur(16px)',
  borderBottom: '1px solid rgba(15,23,42,0.06)'
}
const navInner = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 32px', maxWidth: 1180, margin: '0 auto', gap: 16, flexWrap: 'wrap'
}
const navLinks = { display: 'flex', gap: 28, fontSize: 14, fontWeight: 500, color: '#1E293B', flexWrap: 'wrap' }
const navLink = { color: 'inherit', textDecoration: 'none' }

const logoStyle = { display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: '#0A0A0A' }
const logoIcon = {
  width: 32, height: 32, background: '#0A0A0A', borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, color: '#FAFAF7'
}
const logoText = { fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }

const btnPrimary = {
  background: '#0A0A0A', color: '#FAFAF7',
  padding: '10px 18px', borderRadius: 8, border: 0,
  fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
  textDecoration: 'none', cursor: 'pointer'
}
const btnAmber = {
  background: '#F59E0B', color: '#0A0A0A',
  padding: '16px 28px', borderRadius: 10, border: 0,
  fontWeight: 600, fontSize: 16, textDecoration: 'none',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8
}
const ghostLinkLarge = { fontSize: 15, fontWeight: 500, color: '#1E293B', textDecoration: 'none' }

const heroStyle = { padding: '88px 0 96px' }
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 18 }
const displayHeading = { fontSize: 'clamp(48px, 9vw, 88px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.02, margin: '0 0 24px' }
const leadCopy = { fontSize: 'clamp(17px, 2vw, 22px)', color: '#475569', maxWidth: 720, lineHeight: 1.5, margin: '0 0 32px' }
const heroCtas = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }
const heroMeta = { display: 'flex', gap: 24, marginTop: 24, fontSize: 13, color: '#64748B', flexWrap: 'wrap' }
const heroMetaStrong = { color: '#0A0A0A', fontWeight: 600 }

const mapDemoStyle = {
  background: 'linear-gradient(135deg, #2c4a3a 0%, #1a2c2e 60%, #15252b 100%)',
  borderRadius: 24, padding: 36, marginTop: 64,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 80px rgba(15,23,42,0.18)',
  position: 'relative', overflow: 'hidden', minHeight: 460,
  backgroundImage: `linear-gradient(135deg, #2c4a3a 0%, #1a2c2e 60%, #15252b 100%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
  backgroundSize: 'auto, 36px 36px, 36px 36px'
}
const mapPill = {
  position: 'absolute', top: 24, left: 24,
  background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, color: '#0A0A0A'
}
const houseDot = {
  position: 'absolute', width: 18, height: 18,
  border: '2px solid #fff', background: 'rgba(99,102,241,0.4)', borderRadius: '50%'
}
const mapPin = {
  position: 'absolute', width: 36, height: 36, borderRadius: '50%',
  border: '3px solid #fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 17, color: '#fff'
}
const floatingCallout = {
  position: 'absolute', right: 36, bottom: 36,
  background: '#fff', borderRadius: 16, padding: 18, width: 280,
  boxShadow: '0 16px 40px rgba(0,0,0,0.25)'
}
const ownerRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 10px', background: '#F2F2F7', borderRadius: 8, marginBottom: 10
}
const solarMini = {
  background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)',
  borderRadius: 10, padding: 10,
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8
}
const solarMiniNum = { fontFamily: monoStack, fontSize: 14, fontWeight: 700, color: '#F59E0B' }
const solarMiniLbl = { fontSize: 9, color: '#8E8E93' }

const section = { padding: '96px 0' }
const h2Style = { fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 16px' }
const sectionLead = { fontSize: 18, color: '#475569', maxWidth: 640, lineHeight: 1.55, marginBottom: 56 }

const featureGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }
const featureCard = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)'
}
const featureTitle = { fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 8px' }
const featureBody = { fontSize: 15, color: '#475569', lineHeight: 1.55, margin: 0 }
const featureStat = { fontFamily: monoStack, fontWeight: 600, color: '#F59E0B', fontSize: 14, marginTop: 16, display: 'inline-block' }

const screenshotsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }
const screenshotFig = { margin: 0 }
const screenshotImg = {
  width: '100%', height: 'auto', borderRadius: 24,
  boxShadow: '0 10px 30px rgba(15,23,42,0.18)', display: 'block'
}
const screenshotCap = { marginTop: 12, fontSize: 13, color: '#64748B', textAlign: 'center' }

const ctaStrip = { background: '#0A0A0A', color: '#FAFAF7', padding: '96px 0', textAlign: 'center' }
const dataRow = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0,
  borderTop: '1px solid rgba(250,250,247,0.12)',
  borderBottom: '1px solid rgba(250,250,247,0.12)',
  padding: '32px 0', margin: '64px 0'
}
const dataCol = { textAlign: 'left', padding: '0 24px', borderRight: '1px solid rgba(250,250,247,0.12)' }
const dataNum = { fontFamily: monoStack, fontSize: 36, fontWeight: 600, color: '#F59E0B', letterSpacing: '-0.01em' }
const dataLbl = { fontSize: 12, color: 'rgba(250,250,247,0.6)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }

const footerStyle = { padding: '48px 0', borderTop: '1px solid #E2E8F0', fontSize: 13, color: '#64748B' }
const footerLink = { color: '#64748B', textDecoration: 'none' }
