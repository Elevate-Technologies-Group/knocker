// Supabase Edge Function: parcel-lookup
// Queries county assessor data server-side (no CORS issues)
// Sources (in order of priority):
//   1. Maricopa County GIS ArcGIS REST (confirmed working, no auth)
//   2. Arizona ADWR Pima County parcels (confirmed working, no auth)
//   3. ESRI USA_Parcels national fallback

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

  const result =
    await tryMaricopa(lat, lng) ??
    await tryPima(lat, lng) ??
    await tryMassachusetts(lat, lng) ??
    await tryArcGISNational(lat, lng)

  return new Response(JSON.stringify(result ?? { owner: null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// ── Maricopa County (Phoenix metro) ──────────────────────────────────────────
// Confirmed endpoint: gis.mcassessor.maricopa.gov (public ArcGIS, no auth)
async function tryMaricopa(lat: number, lng: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'OWNER_NAME,OWNER_NAME2,SITUS_ADDRESS,SITUS_CITY,APN,YEAR_BLT,BLDG_SQFT',
      returnGeometry: 'false',
      f: 'json',
    })

    // Confirmed working public endpoints (Maricopa County GIS)
    const endpoints = [
      `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query?${params}`,
      `https://mcassessor.maricopa.gov/arcgis/rest/services/MC_Parcels/MapServer/0/query?${params}`,
    ]

    for (const endpoint of endpoints) {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const attrs = data?.features?.[0]?.attributes
      if (!attrs) continue

      const ownerRaw = attrs.OWNER_NAME || attrs.OWNERNAME || attrs.OWN_NAME || attrs.OWNER
      if (ownerRaw) {
        return {
          owner: cleanOwnerName(String(ownerRaw)),
          source: 'maricopa',
          apn: attrs.APN,
          yearBuilt: attrs.YEAR_BLT || attrs.YEAR_BUILT,
          sqft: attrs.BLDG_SQFT || attrs.SQFT_LIVING,
        }
      }
    }
  } catch (e) {
    console.warn('Maricopa lookup failed:', e)
  }
  return null
}

// ── Massachusetts (MassGIS statewide parcel layer) ───────────────────────────
// Confirmed working: all 351 MA cities/towns, no auth, updated ~monthly
async function tryMassachusetts(lat: number, lng: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'OWNER1,OWN_ADDR,OWN_CITY,OWN_STATE,OWN_ZIP,SITE_ADDR,CITY,ZIP,TOTAL_VAL,YEAR_BUILT,BLD_AREA,RES_AREA,STYLE,USE_CODE,LS_DATE,LS_PRICE,MAP_PAR_ID',
      returnGeometry: 'false',
      f: 'json',
    })

    const res = await fetch(
      `https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Property_Tax_Parcels/FeatureServer/0/query?${params}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)' },
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const attrs = data?.features?.[0]?.attributes
    if (!attrs) return null

    const owner = attrs.OWNER1
    if (!owner) return null

    return {
      owner: cleanOwnerName(String(owner)),
      source: 'massachusetts',
      yearBuilt: attrs.YEAR_BUILT,
      sqft: attrs.RES_AREA || attrs.BLD_AREA,
      totalVal: attrs.TOTAL_VAL,
      style: attrs.STYLE,
      lastSaleDate: attrs.LS_DATE,
      lastSalePrice: attrs.LS_PRICE,
    }
  } catch (e) {
    console.warn('Massachusetts parcel lookup failed:', e)
  }
  return null
}

// ── Pima County (Tucson area) ────────────────────────────────────────────────
// Source: Arizona Dept of Water Resources ArcGIS FeatureServer (confirmed, no auth)
async function tryPima(lat: number, lng: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'APN,SITE_ADDRESS,SITE_CITY,OWNER_NAME,ACRES_US',
      returnGeometry: 'false',
      f: 'json',
    })

    const res = await fetch(
      `https://azwatermaps.azwater.gov/arcgis/rest/services/General/Parcels_for_TEST/FeatureServer/6/query?${params}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)' },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const attrs = data?.features?.[0]?.attributes
    if (!attrs) return null

    const owner = attrs.OWNER_NAME
    if (!owner) return null

    return {
      owner: cleanOwnerName(String(owner)),
      source: 'pima',
      apn: attrs.APN,
    }
  } catch (e) {
    console.warn('Pima lookup failed:', e)
  }
  return null
}

// ── National fallback: ESRI USA Parcels (public layer, ~70% US coverage) ─────
async function tryArcGISNational(lat: number, lng: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'OWNER,SITEADDR,OWNTYPE,YR_BLT,LIVINGSQFT',
      returnGeometry: 'false',
      f: 'json',
    })

    const res = await fetch(
      `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Parcels/FeatureServer/0/query?${params}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)' },
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const attrs = data?.features?.[0]?.attributes
    if (!attrs) return null

    const owner = attrs.OWNER || attrs.OWNERNAME
    if (!owner) return null

    return {
      owner: cleanOwnerName(String(owner)),
      source: 'national',
      yearBuilt: attrs.YR_BLT,
      sqft: attrs.LIVINGSQFT,
    }
  } catch (e) {
    console.warn('National parcel lookup failed:', e)
  }
  return null
}

// Title-case and clean raw assessor name strings
function cleanOwnerName(name: string): string {
  return name.trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    // Strip common non-person entity suffixes for display
    .replace(/\s+(Llc|Inc|Corp|Ltd|Trust|Tr|Rev|Revocable|Et\s*Al|Et\s*Ux)$/i, '')
    .trim()
}
