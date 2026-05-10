import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={pageStyle}>
      <NavBar />
      <Hero />
      <PhonesShowcase />
      <LaunchVideo />
      <FeaturesSection />
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
          <a href="#launch-video" style={navLink}>Watch it</a>
          <a href="#free" style={navLink}>Free</a>
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
          <a id="download" style={btnAmber} href="#how">Get Knocker for iOS →</a>
          <a href="#how" style={ghostLinkLarge}>See how it works →</a>
        </div>
        <div style={heroMeta}>
          <span><strong style={heroMetaStrong}>Native iOS</strong> · iPhone, iOS 17+</span>
          <span><strong style={heroMetaStrong}>6 county GIS sources</strong> chained for parcel data</span>
          <span><strong style={heroMetaStrong}>Google Solar API</strong> for honest sun estimates</span>
        </div>
      </div>
    </header>
  )
}

function PhonesShowcase() {
  const standingRef = useRef(null)

  useEffect(() => {
    const phone = standingRef.current
    if (!phone) return

    const baseRY = -14
    let currentRY = baseRY
    let lastScrollY = window.scrollY
    let scrollDelta = 0
    let raf = null

    function tick() {
      scrollDelta *= 0.92
      const target = baseRY + scrollDelta
      currentRY += (target - currentRY) * 0.12
      phone.style.setProperty('--ry', currentRY.toFixed(2) + 'deg')
      if (Math.abs(scrollDelta) > 0.05 || Math.abs(currentRY - baseRY) > 0.05) {
        raf = requestAnimationFrame(tick)
      } else {
        raf = null
      }
    }

    function onScroll() {
      const y = window.scrollY
      const dy = y - lastScrollY
      lastScrollY = y
      scrollDelta = Math.max(-22, Math.min(22, scrollDelta + dy * 0.18))
      if (!raf) raf = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section style={phonesSection}>
      <style>{phonesCss}</style>
      <div style={container}>
        <div className="phones-stage">
          <div ref={standingRef} className="phone phone--standing" style={{ '--ry': '-14deg' }}>
            <div className="screen">
              <img src="/screenshots/map.jpg" alt="Knocker iOS app · Map screen" />
              <div className="notch" />
              <div className="glare" />
            </div>
            <div className="shadow" />
          </div>

          <div className="phone phone--tabletop">
            <div className="screen">
              <img src="/screenshots/calendar.jpg" alt="Knocker iOS app · Calendar screen" />
              <div className="notch" />
              <div className="glare" />
            </div>
            <div className="shadow" />
          </div>
        </div>
      </div>
    </section>
  )
}

function LaunchVideo() {
  const wrapRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!wrapRef.current || mounted) return
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setMounted(true)
        obs.disconnect()
      }
    }, { rootMargin: '300px' })
    obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [mounted])

  return (
    <section id="launch-video" style={launchVideoSection}>
      <div style={container}>
        <div style={launchEyebrow}>30-second tour</div>
        <h2 style={launchHeading}>Watch it work.</h2>
        <p style={launchLead}>
          Pin drops, owner lookup, solar estimate, disposition logged, pipeline updated —
          end to end, in half a minute.
        </p>
        <div ref={wrapRef} style={launchFrame}>
          {mounted ? (
            <iframe
              src="/launch/index.html"
              title="Knocker — 30-second tour"
              style={launchIframe}
              loading="lazy"
              allow="autoplay"
            />
          ) : (
            <div style={launchPlaceholder}>Loading…</div>
          )}
        </div>
      </div>
    </section>
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
          >
            <DispositionPills />
          </FeatureCard>
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

function FeatureCard({ title, body, stat, children }) {
  return (
    <div style={featureCard}>
      <h3 style={featureTitle}>{title}</h3>
      <p style={featureBody}>{body}</p>
      {children}
      {stat && <span style={featureStat}>{stat}</span>}
    </div>
  )
}

function DispositionPills() {
  const dispos = [
    { label: 'Appointment',    color: '#06b6d4' },
    { label: 'Interested',     color: '#22c55e' },
    { label: 'Callback',       color: '#f59e0b' },
    { label: 'Not Interested', color: '#ef4444' },
    { label: 'No Answer',      color: '#94a3b8' },
    { label: 'DQ',             color: '#475569' }
  ]
  return (
    <div style={dispoPills}>
      {dispos.map(d => (
        <span key={d.label} style={dispoPill}>
          <span style={{ ...dispoSwatch, background: d.color }} />
          {d.label}
        </span>
      ))}
    </div>
  )
}

function ByTheNumbers() {
  return (
    <section id="free" style={ctaStrip}>
      <div style={container}>
        <div style={{ ...eyebrow, color: '#F59E0B' }}>Free during launch</div>
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
          Free for now — no card, no trial timer. Reach out at <a href="mailto:elevatetechnologiesgroup@gmail.com" style={{ color: '#F59E0B', textDecoration: 'underline' }}>elevatetechnologiesgroup@gmail.com</a> with feedback.
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

const heroStyle = { padding: '88px 0 32px' }
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 18 }
const displayHeading = { fontSize: 'clamp(48px, 9vw, 88px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.02, margin: '0 0 24px' }
const leadCopy = { fontSize: 'clamp(17px, 2vw, 22px)', color: '#475569', maxWidth: 720, lineHeight: 1.5, margin: '0 0 32px' }
const heroCtas = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }
const heroMeta = { display: 'flex', gap: 24, marginTop: 24, fontSize: 13, color: '#64748B', flexWrap: 'wrap' }
const heroMetaStrong = { color: '#0A0A0A', fontWeight: 600 }

const phonesSection = { padding: '16px 0 96px' }

// CSS for the phone showcase — has to be a real stylesheet because of
// the 3D transforms + media query. Inline styles can't express either.
const phonesCss = `
.phones-stage {
  position: relative;
  height: 720px;
  perspective: 1800px;
  perspective-origin: 50% 30%;
}
.phone {
  border-radius: 42px;
  background: #0a0b0c;
  padding: 9px;
  box-shadow:
    0 0 0 2px #1f2024 inset,
    0 0 0 1px rgba(255,255,255,0.04),
    0 30px 80px -16px rgba(15,23,42,0.55),
    0 12px 30px -8px rgba(15,23,42,0.45);
  transform-style: preserve-3d;
  will-change: transform;
}
.phone .screen {
  width: 100%; height: 100%;
  border-radius: 33px;
  overflow: hidden;
  background: #fff;
  position: relative;
}
.phone .screen img {
  display: block; width: 100%; height: 100%; object-fit: cover;
}
.phone .glare {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%);
  pointer-events: none;
  border-radius: 33px;
}
.phone .notch {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  width: 88px; height: 26px; border-radius: 999px;
  background: #000; z-index: 2;
}
.phone--standing {
  position: absolute;
  left: 8%;
  top: 50%;
  width: 320px;
  aspect-ratio: 9 / 19.5;
  transform: translateY(-50%) rotateY(var(--ry, -14deg)) rotateX(2deg) rotateZ(-2deg);
  transition: transform 600ms cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 3;
}
.phone--standing .shadow {
  position: absolute;
  bottom: -28px; left: 8%;
  width: 84%; height: 36px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0) 70%);
  filter: blur(8px);
  z-index: -1;
}
.phone--tabletop {
  position: absolute;
  right: 6%;
  top: 50%;
  width: 360px;
  aspect-ratio: 9 / 19.5;
  transform: translateY(-50%) rotateX(62deg) rotateZ(-22deg) rotateY(-4deg);
  z-index: 2;
}
.phone--tabletop .shadow {
  position: absolute;
  bottom: -40px; left: -10%;
  width: 120%; height: 60px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0) 70%);
  filter: blur(14px);
  z-index: -1;
}
@media (max-width: 900px) {
  .phones-stage {
    height: auto;
    display: flex; flex-direction: column;
    gap: 64px; align-items: center; padding: 32px 0;
  }
  .phone--standing, .phone--tabletop {
    position: relative; left: auto; right: auto; top: auto;
    width: min(260px, 80vw);
    transform: none;
  }
  .phone--tabletop { transform: rotateX(0) rotateZ(0); }
}
`

const launchVideoSection = { padding: '32px 0 96px' }
const launchEyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 14 }
const launchHeading = { fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 14px' }
const launchLead = { fontSize: 18, color: '#475569', maxWidth: 640, lineHeight: 1.55, marginBottom: 36 }
const launchFrame = {
  position: 'relative',
  width: '100%',
  maxWidth: 720,
  margin: '0 auto',
  aspectRatio: '1 / 1',
  borderRadius: 24,
  overflow: 'hidden',
  background: '#0a0a0a',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 80px rgba(15,23,42,0.18)'
}
const launchIframe = {
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  border: 0,
  display: 'block'
}
const launchPlaceholder = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'rgba(250,250,247,0.5)', fontSize: 14
}

const section = { padding: '32px 0 96px' }
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

const dispoPills = { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18 }
const dispoPill = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px 4px 6px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: '#1E293B',
  background: '#fff', border: '1px solid #E2E8F0'
}
const dispoSwatch = { width: 10, height: 10, borderRadius: '50%', flex: 'none' }

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
