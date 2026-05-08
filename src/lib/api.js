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

export async function getSolarData(lat, lng) {
  try {
    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${MAPS_KEY}`
    )
    const data = await res.json()
    if (data.solarPotential) {
      const sp = data.solarPotential
      const annualKwh = sp.maxArrayAnnualEnergyKwh || 0
      const avgRate = 0.14
      const annualSavings = Math.round(annualKwh * avgRate)
      return {
        maxPanels: sp.maxArrayPanelsCount,
        annualKwh: Math.round(annualKwh),
        sunshineHours: Math.round(sp.maxSunshineHoursPerYear || 0),
        roofSegments: (sp.roofSegmentStats || []).length,
        annualSavings,
        monthlySavings: Math.round(annualSavings / 12)
      }
    }
  } catch (e) {
    console.warn('Solar API error:', e)
  }
  return null
}

export async function logDoor({ lat, lng, address, status, notes, rep_name, session_id }) {
  const { data, error } = await supabase
    .from('doors')
    .upsert({
      lat,
      lng,
      address,
      status,
      notes: notes || '',
      rep_name: rep_name || 'Unknown',
      session_id: session_id || 'default',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'address'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDoors(session_id) {
  let query = supabase.from('doors').select('*').order('updated_at', { ascending: false })
  if (session_id) {
    query = query.eq('session_id', session_id)
  }
  const { data, error } = await query
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
