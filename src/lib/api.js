import { supabase } from './supabase'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// ─── Geocoding ─────────────────────────────────────────────────────────────

export async function geocodeAddress(address) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_KEY}`
  )
  const data = await res.json()
  if (data.results && data.results.length > 0) {
    const loc = data.results[0].geometry.location
    const formatted = data.results[0].formatted_address
    return { lat: loc.lat, lng: loc.lng, formatted }
  }
  return null
}

export async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`
  )
  const data = await res.json()
  if (data.results && data.results.length > 0) {
    return data.results[0].formatted_address
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// ─── Solar API ──────────────────────────────────────────────────────────────

export async function getSolarData(lat, lng) {
  try {
    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${MAPS_KEY}`
    )
    const data = await res.json()
    if (!data.solarPotential) return null

    const sp = data.solarPotential
    const configs = sp.solarPanelConfigs || []

    let chosenConfig = configs.length > 0
      ? configs.reduce((best, c) => {
          const target = 20
          return Math.abs(c.panelsCount - target) < Math.abs(best.panelsCount - target) ? c : best
        }, configs[0])
      : null

    const realisticKwh = chosenConfig?.yearlyEnergyDcKwh || 0
    const panelCount = chosenConfig?.panelsCount || sp.maxArrayPanelsCount || 0

    const roofStats = sp.wholeRoofStats
    const sunshineQuantiles = roofStats?.sunshineQuantiles || []
    const medianSunshineKwhPerKw = sunshineQuantiles.length >= 3
      ? sunshineQuantiles[Math.floor(sunshineQuantiles.length / 2)]
      : sp.maxSunshineHoursPerYear || 0

    const avgRate = 0.14
    const annualSavings = Math.round(realisticKwh * avgRate)

    const segments = sp.roofSegmentStats || []
    const bestSegment = segments
      .filter(s => s.pitchDegrees > 5 && s.pitchDegrees < 55)
      .sort((a, b) => {
        const aScore = (b.stats?.sunshineQuantiles?.[2] || 0)
        const bScore = (a.stats?.sunshineQuantiles?.[2] || 0)
        return aScore - bScore
      })[0]

    return {
      panelCount,
      realisticKwh: Math.round(realisticKwh),
      medianSunshineHours: Math.round(medianSunshineKwhPerKw),
      maxSunshineHours: Math.round(sp.maxSunshineHoursPerYear || 0),
      roofSegments: segments.length,
      bestPitch: bestSegment ? Math.round(bestSegment.pitchDegrees) : null,
      bestAzimuth: bestSegment ? Math.round(bestSegment.azimuthDegrees) : null,
      annualSavings,
      monthlySavings: Math.round(annualSavings / 12),
      panelCapacityW: sp.panelCapacityWatts,
      systemSizeKw: parseFloat(((panelCount * (sp.panelCapacityWatts || 400)) / 1000).toFixed(1)),
    }
  } catch (e) {
    console.warn('Solar API error:', e)
  }
  return null
}

// ─── Homeowner lookup ───────────────────────────────────────────────────────

export async function getHomeownerInfo(lat, lng, address) {
  try {
    const res = await fetch(
      `https://rxfpsuczmkhxetmzbppb.supabase.co/functions/v1/parcel-lookup?lat=${lat}&lng=${lng}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      }
    )
    if (!res.ok) return { owner: null }
    const data = await res.json()
    return { owner: data.owner || null, source: data.source || null }
  } catch (e) {
    console.warn('Owner lookup failed:', e)
    return { owner: null }
  }
}

// ─── Doors ─────────────────────────────────────────────────────────────────

/**
 * Upsert a door row + write a door_event row.
 * user_id and team_id come from the caller (RepView resolves them from auth).
 * Falls back to legacy rep_name / session_id write so old rows stay readable.
 */
export async function logDoor({
  lat, lng, address, status, notes, rep_name, session_id,
  owner_name, proposal, user_id, team_id, appointmentAt
}) {
  const row = {
    lat,
    lng,
    address,
    status,
    notes: notes || '',
    rep_name: rep_name || 'Unknown',
    session_id: session_id || 'default',
    owner_name: owner_name || null,
    proposal: proposal || null,
    updated_at: new Date().toISOString(),
    ...(user_id ? { user_id } : {}),
    ...(team_id ? { team_id } : {}),
  }

  const { data, error } = await supabase
    .from('doors')
    .upsert(row, { onConflict: 'address', ignoreDuplicates: false })
    .select()
    .single()

  if (error) {
    console.error('logDoor error:', error)
    throw error
  }

  // Write the event log row (best-effort — don't block save on failure)
  if (user_id && data?.id) {
    const event = {
      door_id: data.id,
      user_id,
      rep_name: rep_name || 'Unknown',
      status,
      notes: notes || null,
      ...(appointmentAt ? { appointment_at: appointmentAt } : {}),
    }
    const { error: evErr } = await supabase.from('door_events').insert(event)
    if (evErr) console.warn('door_events insert error (non-fatal):', evErr)
  }

  return data
}

/**
 * Fetch doors. Scoping:
 *  - team_id set  → fetch all doors with that team_id (team member view)
 *  - user_id only → fetch doors belonging to this user (individual view)
 *  - fallback     → session_id filter (legacy, no auth)
 */
export async function getDoors({ user_id, team_id, session_id } = {}) {
  let query = supabase.from('doors').select('*').order('updated_at', { ascending: false })
  if (team_id) {
    query = query.eq('team_id', team_id)
  } else if (user_id) {
    query = query.eq('user_id', user_id)
  } else if (session_id) {
    query = query.eq('session_id', session_id)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getRepHistory(rep_name) {
  const { data, error } = await supabase
    .from('doors')
    .select('*')
    .eq('rep_name', rep_name)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('getRepHistory error:', error)
    throw error
  }
  return data || []
}

/**
 * Fetch event log for a specific door, newest first.
 */
export async function fetchDoorEvents(door_id) {
  const { data, error } = await supabase
    .from('door_events')
    .select('*')
    .eq('door_id', door_id)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('fetchDoorEvents error:', error)
    return []
  }
  return data || []
}

// ─── Realtime ───────────────────────────────────────────────────────────────

/**
 * Subscribe to door changes.
 * Filter by team_id when in team mode, user_id when individual, session_id legacy.
 */
export function subscribeToDoorsSession({ user_id, team_id, session_id }, callback) {
  let filter
  if (team_id) {
    filter = `team_id=eq.${team_id}`
  } else if (user_id) {
    filter = `user_id=eq.${user_id}`
  } else if (session_id) {
    filter = `session_id=eq.${session_id}`
  }

  return supabase
    .channel('doors-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'doors',
      filter
    }, callback)
    .subscribe()
}
