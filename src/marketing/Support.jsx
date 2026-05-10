import LegalLayout from './LegalLayout'

export default function Support() {
  return (
    <LegalLayout title="Support" lastUpdated="May 9, 2026">
      <p>
        Knocker is built and supported by Elevate Technologies Group. We're a
        small team — a real person reads every email and replies, usually
        within one business day.
      </p>

      <h2 style={h2}>Contact</h2>
      <p>
        <strong>Email:</strong>{' '}
        <a href="mailto:elevatetechnologiesgroup@gmail.com" style={link}>elevatetechnologiesgroup@gmail.com</a>
      </p>
      <p>
        Include your account email and a description of the issue. Screenshots
        help. Note your iOS version and iPhone model if it's a crash or
        rendering bug.
      </p>

      <h2 style={h2}>Common questions</h2>

      <h3 style={h3}>How do I sign in?</h3>
      <p>
        Open the app, choose Individual (just you) or Team (joining your sales
        org's roster), and either sign in with Apple or enter your email to
        receive a 6-digit code. The code expires in 10 minutes; if you don't
        see the email, check spam, then request a new one.
      </p>

      <h3 style={h3}>How do team accounts work?</h3>
      <p>
        Teams share door data across the whole roster — managers and reps see
        the same map. To join a team, ask your team owner for the team slug
        (a short identifier like <code style={code}>clean-grid-solar</code>),
        then enter it during sign-in.
      </p>

      <h3 style={h3}>Where does the homeowner name come from?</h3>
      <p>
        Public county GIS records. We chain six Arizona county sources, plus
        statewide layers in South Carolina, Virginia, and Massachusetts. If a
        county isn't in our chain yet, the owner field stays empty — the rest
        of the door modal still works.
      </p>

      <h3 style={h3}>Why is the solar number lower than I expected?</h3>
      <p>
        We use Google Solar API's median sunshine quantile, not the optimistic
        max. On a tree-shaded roof, the median is closer to what the panels
        will actually see. The "Realistic kWh/Yr" value picks the panel
        configuration nearest to a typical 20-panel residential system.
      </p>

      <h3 style={h3}>How do I delete my account?</h3>
      <p>
        In the iOS app: open Settings → Account → Delete account, then
        confirm. Your account record and any doors you owned individually are
        deleted within 24 hours. Doors logged under your team remain with the
        team unless your team owner deletes them.
      </p>
      <p>
        You can also email{' '}
        <a href="mailto:elevatetechnologiesgroup@gmail.com" style={link}>elevatetechnologiesgroup@gmail.com</a>{' '}
        from your account address to request deletion.
      </p>

      <h3 style={h3}>The map is blank — what's wrong?</h3>
      <p>
        Most often this is a location-permission issue. Open Settings → Privacy
        & Security → Location Services → Knocker, and make sure it's set to
        "While Using the App." Also confirm Location Services is on at the
        top level.
      </p>

      <h3 style={h3}>I lost an appointment / a door / a note.</h3>
      <p>
        Email us with the address, your account email, and roughly when you
        logged it. Knocker keeps a full activity log per door, so we can
        usually reconstruct what happened.
      </p>

      <h2 style={h2}>System requirements</h2>
      <ul style={ul}>
        <li>iPhone with iOS 17.0 or later</li>
        <li>Active internet connection (cellular or Wi-Fi)</li>
        <li>Location Services enabled while using the app</li>
        <li>An Apple ID (for Sign in with Apple) or a working email address</li>
      </ul>

      <h2 style={h2}>Manager portal</h2>
      <p>
        Team owners and managers can also sign in to the web manager portal at{' '}
        <a href="/manager" style={link}>knocker-web.vercel.app/manager</a> to
        see team activity, the leaderboard, and recent dispositions across the
        roster.
      </p>

      <h2 style={h2}>Status &amp; outages</h2>
      <p>
        If multiple users report issues, we post status updates by email to
        team owners. There is no public status page yet.
      </p>
    </LegalLayout>
  )
}

const h2 = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 36, marginBottom: 12, color: '#0A0A0A' }
const h3 = { fontSize: 17, fontWeight: 700, letterSpacing: '-0.005em', marginTop: 28, marginBottom: 8, color: '#0F172A' }
const ul = { paddingLeft: 22, margin: '0 0 16px' }
const link = { color: '#0F172A', textDecoration: 'underline' }
const code = { fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 14, padding: '1px 6px', background: '#F1F5F9', borderRadius: 4 }
