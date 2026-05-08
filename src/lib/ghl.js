// GHL Integration — push interested/hot leads to GoHighLevel
// Location: c4qnvKrHymHljtBaFmsW
// Pipeline: v5GwbWF3QfsEeztqFnzg (Knocker - Door Knocking)

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_KEY = import.meta.env.VITE_GHL_KEY
const GHL_LOC = import.meta.env.VITE_GHL_LOC
const GHL_PIPELINE = import.meta.env.VITE_GHL_PIPELINE

// Custom field IDs
const CF = {
  systemKw:        '2bsoQDWqdqtfbY5gyZtI',
  annualSavings:   'axxMvzdxvE6HbeEREevC',
  panelCount:      '8xxcv8xE4bmd30wBEYSz',
  annualKwh:       'JrHMRZZ94orYXE6Bclv0',
  roofOrientation: '5dM4kO2Z1rK79lPlc8hr',
  ownerName:       'yAslEUH6nESNBwYhV5AR',
  knockDate:       '0x2Dr4nDMOXqAogwHOl8',
  knockStatus:     'CR7gHUQ4EM1lLH7EZEEE',
  repName:         'uC6JajbFo22x2RbJYkgU',
  monthlySavings:  'bnj4tR12Ow89OOxraEAl',
}

// Stage IDs
const STAGES = {
  interested:       '3edaa422-9d7b-4e20-9dd4-798eafa60686',
  hot_lead:         '85979ec8-df21-4b40-b186-2f6efe4123b4',
  callback:         '111afdd0-65e1-46e2-aefb-93aaeb969c0d',
  proposal_sent:    'f5490042-d409-4c7b-a803-83f773ed0162',
  appointment_set:  'cfda5cc2-26e5-459c-84d2-30fef06eeb82',
  closed:           '7b66cee1-6edd-4172-a3ff-a92e7102e09b',
}

function ghlHeaders() {
  return {
    'Authorization': `Bearer ${GHL_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
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

// Push a door knock lead to GHL — creates contact + opportunity in pipeline
export async function pushToGHL({ address, solar, owner_name, rep_name, status, notes }) {
  try {
    const parts = address.split(',')
    const streetLine = parts[0]?.trim() || ''
    const city = parts[1]?.trim() || ''
    const stateZipRaw = parts[2]?.trim() || ''
    const statePart = stateZipRaw.split(' ')[0] || ''
    const zipPart = stateZipRaw.split(' ').slice(1).join(' ') || ''

    const displayName = owner_name || `Knock — ${streetLine}`
    const nameParts = displayName.trim().split(' ')
    const firstName = nameParts[0] || 'Door'
    const lastName = nameParts.slice(1).join(' ') || 'Knock'

    // Build custom fields array
    const customFields = [
      { id: CF.knockDate, field_value: new Date().toISOString().split('T')[0] },
      { id: CF.knockStatus, field_value: status === 'hot_lead' ? 'Hot Lead 🔥' : 'Interested ✅' },
      { id: CF.repName, field_value: rep_name || 'Unknown' },
    ]
    if (owner_name) customFields.push({ id: CF.ownerName, field_value: owner_name })
    if (solar) {
      customFields.push(
        { id: CF.systemKw,        field_value: String(solar.systemSizeKw || '') },
        { id: CF.annualSavings,   field_value: String(solar.annualSavings || '') },
        { id: CF.monthlySavings,  field_value: String(solar.monthlySavings || '') },
        { id: CF.panelCount,      field_value: String(solar.panelCount || '') },
        { id: CF.annualKwh,       field_value: String(solar.realisticKwh || '') },
        { id: CF.roofOrientation, field_value: solar.bestAzimuth ? getAzimuthLabel(solar.bestAzimuth) : '' },
      )
    }

    // 1. Create or find contact
    const contactPayload = {
      locationId: GHL_LOC,
      firstName,
      lastName,
      address1: streetLine,
      city,
      state: statePart,
      postalCode: zipPart,
      tags: ['knocker', status === 'hot_lead' ? 'hot-lead' : 'interested'],
      source: 'knocker-app',
      customFields,
    }

    const contactRes = await fetch(`${GHL_BASE}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify(contactPayload),
    })
    const contactData = await contactRes.json()
    if (!contactRes.ok) throw new Error(contactData.message || 'Failed to create contact')
    const contactId = contactData.contact?.id
    if (!contactId) throw new Error('No contact ID returned')

    // 2. Create opportunity in Knocker pipeline
    const stageId = STAGES[status] || STAGES.interested
    const opportunityName = owner_name
      ? `${owner_name} — ${streetLine}`
      : streetLine

    const monetaryValue = solar?.annualSavings
      ? Math.round(solar.annualSavings * 20)  // rough 20yr LTV estimate
      : 0

    const oppPayload = {
      pipelineId: GHL_PIPELINE,
      locationId: GHL_LOC,
      name: opportunityName,
      pipelineStageId: stageId,
      status: 'open',
      contactId,
      monetaryValue,
      assignedTo: null,
      customFields: notes ? [{ key: 'notes', field_value: notes }] : [],
    }

    const oppRes = await fetch(`${GHL_BASE}/opportunities/`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify(oppPayload),
    })
    const oppData = await oppRes.json()
    const oppId = oppData.opportunity?.id

    return {
      success: true,
      contactId,
      opportunityId: oppId,
      opportunityName,
    }
  } catch (e) {
    console.error('GHL push failed:', e)
    return { success: false, error: e.message }
  }
}
