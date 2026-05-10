import LegalLayout from './LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy policy" lastUpdated="May 9, 2026">
      <p>
        Knocker is built by Elevate Technologies Group, LLC ("Knocker," "we,"
        "us"). This policy explains what data the Knocker iOS app and web
        manager portal collect, how we use it, and the choices you have. We
        wrote it to be readable, not to confuse you.
      </p>

      <h2 style={h2}>What we collect</h2>
      <ul style={ul}>
        <li>
          <strong>Account data</strong> — your email address, your display name
          (optional), the team you belong to, and the role you hold on that
          team. If you sign in with Apple, we receive a stable Apple identifier
          and the email Apple shares with us (real or relay address). We do not
          receive your Apple ID password.
        </li>
        <li>
          <strong>Doors you log</strong> — the address, latitude/longitude,
          disposition (Appointment / Interested / Callback / Not Interested /
          No Answer / DQ), notes you type, scheduled appointment time, and the
          owner name returned from public county records. Your team
          (manager/owner role) sees this data; nobody outside your team does.
        </li>
        <li>
          <strong>Location</strong> — when you open the app, we read your
          current location to center the map. Location is used only in real
          time on your device for map display and is not stored or sent to our
          servers as a continuous track.
        </li>
        <li>
          <strong>Diagnostics</strong> — basic crash and error logs that help
          us fix bugs. These do not include the content of your doors or the
          notes you write.
        </li>
      </ul>

      <h2 style={h2}>What we do not collect</h2>
      <ul style={ul}>
        <li>We do not collect contacts, photos, microphone audio, calendar, or
          health data.</li>
        <li>We do not run third-party advertising or analytics SDKs (no Google
          Analytics, no Meta Pixel, no AppsFlyer).</li>
        <li>We do not sell your data. There is no business model that
          benefits from selling it.</li>
      </ul>

      <h2 style={h2}>Third-party services we use</h2>
      <ul style={ul}>
        <li>
          <strong>Supabase</strong> (database + authentication). Your account
          and doors are stored on Supabase infrastructure (US, AWS us-east-1).
        </li>
        <li>
          <strong>Apple Sign in with Apple</strong> for authentication. Apple
          shares only the email and identifier with us; nothing else.
        </li>
        <li>
          <strong>Google Solar API</strong> — we send a latitude/longitude to
          Google to retrieve solar potential data for the building. We do not
          send your account info or any personal data with this query.
        </li>
        <li>
          <strong>Google Maps</strong> — used for satellite imagery on the web
          rep view; the iOS app uses Apple MapKit, not Google Maps.
        </li>
        <li>
          <strong>OpenStreetMap (Overpass)</strong> — used to fetch building
          locations near your viewport. We send the bounding-box coordinates
          you're looking at; no account info is sent.
        </li>
        <li>
          <strong>County GIS providers</strong> — for the homeowner-name
          lookup, we send the latitude/longitude you tapped to public county
          GIS services (Maricopa, Pima, Cochise, Yavapai, Mohave, Pinal,
          MassGIS, SC and VA county portals). These are public-records APIs.
        </li>
      </ul>

      <h2 style={h2}>How we use your data</h2>
      <p>
        Strictly to operate Knocker: showing you doors you've logged, allowing
        your team to share visibility, fetching solar/parcel data when you tap
        a house, and authenticating you via email or Apple. We do not use your
        data to train AI models, build a marketing list, or score you.
      </p>

      <h2 style={h2}>How long we keep it</h2>
      <p>
        Account and door data is kept for as long as your account exists. If
        you delete your account, we delete your account record and the doors
        you owned individually. Doors that belong to a team (where you logged
        them under team mode) remain part of the team's data unless your team
        owner deletes them.
      </p>

      <h2 style={h2}>Deleting your account</h2>
      <p>
        You can request account deletion in two ways:
      </p>
      <ul style={ul}>
        <li>
          <strong>From the iOS app:</strong> open Settings → Account → Delete
          account. Confirm the deletion and your account is removed within 24
          hours.
        </li>
        <li>
          <strong>By email:</strong> send a deletion request to{' '}
          <a href="mailto:elevatetechnologiesgroup@gmail.com" style={link}>elevatetechnologiesgroup@gmail.com</a>{' '}
          from the email associated with your account. We confirm and process
          within 7 business days.
        </li>
      </ul>

      <h2 style={h2}>Children</h2>
      <p>
        Knocker is a B2B sales tool. It is not intended for, marketed to, or
        knowingly used by anyone under 16 years of age.
      </p>

      <h2 style={h2}>Changes</h2>
      <p>
        If we make a material change, we'll update the "Last updated" date at
        the top of this page and notify managers via email. Continued use after
        a change constitutes acceptance.
      </p>

      <h2 style={h2}>Contact</h2>
      <p>
        Questions, requests, or complaints:{' '}
        <a href="mailto:elevatetechnologiesgroup@gmail.com" style={link}>elevatetechnologiesgroup@gmail.com</a>.
        We read every message.
      </p>
    </LegalLayout>
  )
}

const h2 = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 36, marginBottom: 12, color: '#0A0A0A' }
const ul = { paddingLeft: 22, margin: '0 0 16px' }
const link = { color: '#0F172A', textDecoration: 'underline' }
