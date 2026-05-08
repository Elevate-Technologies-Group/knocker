// GHL Integration — push interested/hot leads to GoHighLevel
// Location: c4qnvKrHymHljtBaFmsW

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_KEY = import.meta.env.VITE_GHL_KEY
const GHL_LOC = import.meta.env.VITE_GHL_LOC

// Custom field IDs (created 2026-05-08)
const CF = {
  systemKw:       '2bsoQDWqdqtfbY5gyZtI',  // contact.solar_system_size_kw
  annualSavings:  'axxMvzdxvE6HbeEREevC',  // contact.solar_annual_savings_usd
  panelCount:     '8xxcv8xE4bmd30wBEYSz',  // contact.solar_panel_count
  annualKwh:      'JrHMRZZ94orYXE6Bclv0',  // contact.solar_annual_kwh
  roofOrientation:'5dM4kO2Z1rK79lPlc8hr',  // contact.roof_orientation
  ownerName:      'yAslEUH6nESNBwYhV5AR',  // contact.property_owner_name
  knockDate:      '0x2Dr4nDMOXqAogwHOl8',  // contact.door_knock_date
  knockStatus:    'CR7gHUQ4EM1lLH7EZEEE',  // contact.knock_status
  repName:        'uC6JajbFo22x2RbJYkgU',  // contact.knocker_rep_name
  monthlySavings: 'bnj4tR12Ow89OOxraEAl',  // contact.solar_monthly_savings_usd
}

function ghlHeaders() {
  return {
    'Authorization': `Bearer ${GHL_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }
}

// Push a door knock lead to GHL as a contact
// Called when rep marks a door as "interested" or "hot_lead"
export async function pushToGHL({ address, solar, owner_name, rep_name, status, notes }) {
  try {
    // Parse address for name fields
    const parts = address.split(',')
    const streetLine = parts[0]?.trim() || ''
    const city = parts[1]?.trim() || ''
    const stateZip = parts[2]?.trim() || ''

    // Build contact name from owner_name or address
    const displayName = owner_name || `Door Knock — ${streetLine}`
    const [firstName, ...lastParts] = displayName.split(' ')
    const lastName = lastParts.join(' ') || 'Unknown'

    const customFields = [
      { id: CF.knockDate, field_value: new Date().toISOString().split('T')[0] },
      { id: CF.knockStatus, field_value: status === 'hot_lead' ? 'Hot Lead 🔥' : 'Interested' },
      { id: CF.repName, field_value: rep_name || 'Unknown' },
    ]

    if (owner_name) customFields.push({ id: CF.ownerName, field_value: owner_name })

    if (solar) {
      customFields.push(
        { id: CF.systemKw, field_value: String(solar.systemSizeKw || '') },
        { id: CF.annualSavings, field_value: String(solar.annualSavings || '') },
        { id: CF.monthlySavings, field_value: String(solar.monthlySavings || '') },
        { id: CF.panelCount, field_value: String(solar.panelCount || '') },
        { id: CF.annualKwh, field_value: String(solar.realisticKwh || '') },
        { id: CF.roofOrientation, field_value: solar.bestAzimuth ? getAzimuthLabel(solar.bestAzimuth) : '' },
      )
    }

    const contactPayload = {
      locationId: GHL_LOC,
      firstName,
      lastName,
      address1: streetLine,
      city,
      state: stateZip.split(' ')[0] || '',
      postalCode: stateZip.split(' ')[1] || '',
      tags: ['knocker', status === 'hot_lead' ? 'hot-lead' : 'interested'],
      source: 'knocker-app',
      customFields,
    }

    if (notes) contactPayload.customFields.push({
      id: CF.knockStatus,
      field_value: `${contactPayload.customFields.find(f=>f.id===CF.knockStatus)?.field_value} — ${notes}`
    })

    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify(contactPayload),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'GHL error')
    return { success: true, contactId: data.contact?.id }
  } catch (e) {
    console.error('GHL push failed:', e)
    return { success: false, error: e.message }
  }
}

function getAzimuthLabel(deg) {
  if (deg == null) return ''
  if (deg <= 22 || deg >= 338) return 'N'
  if (deg < 68) return 'NE'
  if (deg < 112) return 'E'
  if (deg < 158) return 'SE'
  if (deg < 202) return 'S (best)'
  if (deg < 248) return 'SW'
  if (deg < 292) return 'W'
  return 'NW'
}
