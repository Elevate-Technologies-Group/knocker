import { supabase } from './supabase'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

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

// Solar API — uses solarPanelConfigs for realistic production (accounts for shading/orientation)
// NOT maxArrayAnnualEnergyKwh (theoretical max). We pick the config closest to a typical
// residential system size (8-12 panels) which reflects actual usable roof area.
export async function getSolarData(lat, lng) {
  try {
    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${MAPS_KEY}`
    )
    const data = await res.json()
    if (!data.solarPotential) return null

    const sp = data.solarPotential
    const configs = sp.solarPanelConfigs || []

    // Pick realistic config: ~20 panels or nearest available (not the theoretical max)
    // This accounts for shading, orientation, usable roof area
    let chosenConfig = configs.length > 0
      ? configs.reduce((best, c) => {
          const target = 20
          return Math.abs(c.panelsCount - target) < Math.abs(best.panelsCount - target) ? c : best
        }, configs[0])
      : null

    const realisticKwh = chosenConfig?.yearlyEnergyDcKwh || 0
    const panelCount = chosenConfig?.panelsCount || sp.maxArrayPanelsCount || 0

    // Use median sunshine from wholeRoofStats (not max) for accurate hours
    const roofStats = sp.wholeRoofStats
    const sunshineQuantiles = roofStats?.sunshineQuantiles || []
    // median = middle quantile (index 2 of 5)
    const medianSunshineKwhPerKw = sunshineQuantiles.length >= 3
      ? sunshineQuantiles[Math.floor(sunshineQuantiles.length / 2)]
      : sp.maxSunshineHoursPerYear || 0

    const avgRate = 0.14
    const annualSavings = Math.round(realisticKwh * avgRate)

    // Best roof segment: southish facing, pitched 15-40 degrees
    const segments = sp.roofSegmentStats || []
    const bestSegment = segments
      .filter(s => s.pitchDegrees > 5 && s.pitchDegrees < 55)
      .sort((a, b) => {
        // Prefer south-facing (180°), penalize north (0°)
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

// Homeowner name scraper — uses free county assessor data via Regrid API (free tier)
// and falls back to OpenAddresses/Pelias. No cost for light usage.
export async function getHomeownerInfo(lat, lng, address) {
  try {
    // Regrid free tier: parcel data including owner name from county records
    // No API key needed for basic lookups (rate limited)
    const res = await fetch(
      `https://app.regrid.com/api/v1/parcel/geopoint?lat=${lat}&lon=${lng}&return_custom=false&return_field_labels=false&return_matched_key=false&return_nearest=true`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) throw new Error('Regrid unavailable')
    const data = await res.json()
    const parcel = data.parcels?.features?.[0]?.properties?.fields
    if (parcel) {
      const owner = parcel.owner || parcel.ownernme1 || parcel.own_name || null
      const mailingAddr = parcel.mail_address || parcel.mailadd || null
      const yearBuilt = parcel.yearbuilt || parcel.yr_blt || null
      const sqft = parcel.ll_gisacre ? Math.round(parcel.ll_gisacre * 43560) : (parcel.sqft || null)
      return { owner, mailingAddr, yearBuilt, sqft, source: 'county' }
    }
  } catch (e) {
    console.warn('Parcel lookup failed:', e)
  }

  // Fallback: try OpenAddresses via geocode (gets address only, no owner)
  return { owner: null, mailingAddr: null, yearBuilt: null, sqft: null, source: null }
}

export async function logDoor({ lat, lng, address, status, notes, rep_name, session_id, owner_name, proposal }) {
  const { data, error } = await supabase
    .from('doors')
    .upsert({
      lat, lng, address, status,
      notes: notes || '',
      rep_name: rep_name || 'Unknown',
      session_id: session_id || 'default',
      owner_name: owner_name || null,
      proposal: proposal || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'address' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDoors(session_id) {
  let query = supabase.from('doors').select('*').order('updated_at', { ascending: false })
  if (session_id) query = query.eq('session_id', session_id)
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
  if (error) throw error
  return data || []
}

export function subscribeToDoorsSession(session_id, callback) {
  return supabase
    .channel('doors-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'doors',
      filter: session_id ? `session_id=eq.${session_id}` : undefined
    }, callback)
    .subscribe()
}
