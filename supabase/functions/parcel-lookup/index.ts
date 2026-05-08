// Supabase Edge Function: parcel-lookup
// Queries county assessor data server-side (no CORS issues)
// Supports: Maricopa County AZ (primary market) + fallback for other counties

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lng = parseFloat(url.searchParams.get('lng') || '')

  if (!lat || !lng) {
    return new Response(JSON.stringify({ owner: null, error: 'missing lat/lng' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Try Maricopa County first (main AZ solar market)
  // Their assessor has a public parcel search API
  const result = await tryMaricopa(lat, lng)
    ?? await tryArcGISNational(lat, lng)

  return new Response(JSON.stringify(result ?? { owner: null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// Maricopa County Assessor — public parcel data
async function tryMaricopa(lat: number, lng: number) {
  try {
    // Use their public ArcGIS parcel service
    const query = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'OWNER_NAME,OWNER_NAME2,SITUS_ADDRESS,SITUS_CITY,APN,YEAR_BUILT,SQFT_LIVING',
      returnGeometry: 'false',
      f: 'json',
    })

    // Try multiple known Maricopa ArcGIS endpoints
    const endpoints = [
      `https://mcassessor.maricopa.gov/arcgis/rest/services/MC_Parcels/MapServer/0/query?${query}`,
      `https://gismaps.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query?${query}`,
    ]

    for (const endpoint of endpoints) {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SolarApp/1.0)' },
      })
      if (!res.ok) continue
      const data = await res.json()
      const attrs = data?.features?.[0]?.attributes
      if (!attrs) continue

      const owner = attrs.OWNER_NAME || attrs.OWNERNAME || attrs.OWN_NAME
      if (owner) {
        return {
          owner: cleanOwnerName(owner),
          source: 'maricopa',
          apn: attrs.APN,
          yearBuilt: attrs.YEAR_BUILT,
          sqft: attrs.SQFT_LIVING,
        }
      }
    }
  } catch (e) {
    console.warn('Maricopa lookup failed:', e)
  }
  return null
}

// National fallback: try ESRI Living Atlas public parcel layer
async function tryArcGISNational(lat: number, lng: number) {
  try {
    const query = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'OWNER,SITEADDR,OWNTYPE,YR_BLT,LIVINGSQFT',
      returnGeometry: 'false',
      f: 'json',
    })

    // ESRI public parcels dataset (US-wide, free, updated regularly)
    const res = await fetch(
      `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Parcels/FeatureServer/0/query?${query}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SolarApp/1.0)' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const attrs = data?.features?.[0]?.attributes
    if (!attrs) return null

    const owner = attrs.OWNER || attrs.OWNERNAME
    if (!owner) return null

    return {
      owner: cleanOwnerName(owner),
      source: 'national',
      yearBuilt: attrs.YR_BLT,
      sqft: attrs.LIVINGSQFT,
    }
  } catch (e) {
    console.warn('National parcel lookup failed:', e)
    return null
  }
}

function cleanOwnerName(name: string): string {
  if (!name) return name
  // Trim, normalize case (ALL CAPS → Title Case)
  return name.trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    // Remove common non-person suffixes from display
    .replace(/\s+(Llc|Inc|Corp|Ltd|Trust|Tr|Rev|Revocable)$/i, '')
    .trim()
}
