// Supabase Edge Function: parcel-lookup
// Queries county assessor data server-side (no CORS issues)
// Sources (in order of priority):
//   1. Maricopa County GIS ArcGIS REST (confirmed working, no auth)
//   2. Arizona ADWR Pima County parcels (confirmed working, no auth)
//   3. ESRI USA_Parcels national fallback

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Accept lat/lng from either POST JSON body or GET query string so any
  // client (current iOS GET, web GET, future POST callers) keeps working.
  let lat = NaN, lng = NaN
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      lat = parseFloat(String(body?.lat))
      lng = parseFloat(String(body?.lng))
    } catch { /* fall through to query-string parse */ }
  }
  if (isNaN(lat) || isNaN(lng)) {
    const url = new URL(req.url)
    lat = parseFloat(url.searchParams.get('lat') || '')
    lng = parseFloat(url.searchParams.get('lng') || '')
  }

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({ owner: null, error: 'missing lat/lng' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const result =
    await tryMaricopa(lat, lng) ??
    await tryPima(lat, lng) ??
    await tryMassachusetts(lat, lng) ??
    await trySouthCarolina(lat, lng) ??
    await tryVirginia(lat, lng) ??
    await tryPrinceGeorges(lat, lng) ??
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

// ── South Carolina — Multi-county routing ────────────────────────────────────
// SC has no statewide layer; route by bounding box to confirmed county endpoints
async function trySouthCarolina(lat: number, lng: number) {
  // Approximate county bounding boxes for confirmed endpoints
  const routes = [
    // York County (Rock Hill, Fort Mill, Clover, Tega Cay) — richest SC endpoint
    {
      bounds: { minLat: 34.7, maxLat: 35.2, minLng: -81.4, maxLng: -80.7 },
      url: 'https://services1.arcgis.com/2AGLxyiJoNiVHKwq/arcgis/rest/services/Parcels/FeatureServer/0',
      ownerField: 'Owner1',
      extraFields: 'Owner1,Owner2,YearBuilt,FinishedSQFT,AsdTotVal,AprTotVal,PropertyAddress,LandUseDesc,TAXMAPID,SalePrice',
      yearBuiltField: 'YearBuilt',
      sqftField: 'FinishedSQFT',
      valueField: 'AprTotVal',
    },
    // Horry County (Myrtle Beach area)
    {
      bounds: { minLat: 33.5, maxLat: 34.4, minLng: -79.4, maxLng: -78.5 },
      url: 'https://www.horrycounty.org/gispublic/rest/services/Public/Parcels/MapServer/1',
      ownerField: 'OwnerName',
      extraFields: 'OwnerName,OwnerStreet,OwnerCity,OwnerState,OwnerZip,Acreage,LandUseCode,TMS',
      yearBuiltField: null,
      sqftField: null,
      valueField: null,
    },
    // Greenville City (fallback for Greenville area)
    {
      bounds: { minLat: 34.7, maxLat: 35.0, minLng: -82.5, maxLng: -82.2 },
      url: 'https://citygis.greenvillesc.gov/arcgis/rest/services/AddressSearch/Property/MapServer/3',
      ownerField: 'OWNAM1',
      extraFields: 'OWNAM1,OWNAM2,SQFEET,TAXMKTVAL,FAIRMKTVAL,PIN,STREET,STRNUM,BEDROOMS,BATHRMS',
      yearBuiltField: null,
      sqftField: 'SQFEET',
      valueField: 'FAIRMKTVAL',
    },
  ]

  for (const route of routes) {
    const { bounds } = route
    if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) continue

    try {
      const params = new URLSearchParams({
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: route.extraFields,
        returnGeometry: 'false',
        f: 'json',
      })

      const res = await fetch(`${route.url}/query?${params}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const attrs = data?.features?.[0]?.attributes
      if (!attrs) continue

      const owner = attrs[route.ownerField]
      if (!owner) continue

      return {
        owner: cleanOwnerName(String(owner)),
        source: 'south_carolina',
        yearBuilt: route.yearBuiltField ? attrs[route.yearBuiltField] : null,
        sqft: route.sqftField ? attrs[route.sqftField] : null,
        totalVal: route.valueField ? attrs[route.valueField] : null,
      }
    } catch (e) {
      console.warn('SC parcel lookup failed:', e)
    }
  }
  return null
}

// ── Virginia — Multi-locality routing ────────────────────────────────────────
// VA strips owner names from most public GIS layers; use confirmed localities
async function tryVirginia(lat: number, lng: number) {
  const routes = [
    // Prince William County (Manassas, Woodbridge, Dumfries) — nightly updated ownership
    {
      bounds: { minLat: 38.4, maxLat: 38.85, minLng: -77.7, maxLng: -77.1 },
      url: 'https://gisweb.pwcva.gov/arcgis/rest/services/GTS/Cadastral/MapServer/5',
      ownerField: 'CAMA_OWNER_CUR',
      extraFields: 'CAMA_OWNER_CUR,CAMA_ADDRESS2,CAMA_CITY,CAMA_STATE,CAMA_ZIPCODE,CAMA_USECODE,CAMA_SQFTABV,StreetNumber,StreetName,StreetType,City,ZipCode,SubdivisionName',
      sqftField: 'CAMA_SQFTABV',
    },
    // Henrico County (Richmond suburbs) — rich CAMA data, no owner (return building data anyway)
    {
      bounds: { minLat: 37.4, maxLat: 37.7, minLng: -77.7, maxLng: -77.2 },
      url: 'https://portal.henrico.gov/mapping/rest/services/Layers/Tax_Parcels_and_CAMA_Data_External/FeatureServer/0',
      ownerField: null, // No owner in public layer — return building data only
      extraFields: 'FULL_ADDRESS,YEAR_BUILT,SQFT_FINISHED,SQFT_BUILDING_FOOTPRINT,NUMBER_BEDROOMS,NUMBER_FULL_BATHS,HOUSE_STYLE_DESCRIPTION,LAND_VALUE_CURRENT,IMPROVEMENTS_VALUE_CURRENT,LAST_SALE_DATE,LAST_SALE_PRICE,SUBDIVISION_NAME',
      sqftField: 'SQFT_FINISHED',
    },
  ]

  for (const route of routes) {
    const { bounds } = route
    if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) continue

    try {
      const params = new URLSearchParams({
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: route.extraFields,
        returnGeometry: 'false',
        f: 'json',
      })

      const res = await fetch(`${route.url}/query?${params}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const attrs = data?.features?.[0]?.attributes
      if (!attrs) continue

      const ownerRaw = route.ownerField ? attrs[route.ownerField] : null
      // Return result even without owner if we got building data
      const hasUsefulData = ownerRaw || attrs['YEAR_BUILT'] || attrs['SQFT_FINISHED']
      if (!hasUsefulData) continue

      return {
        owner: ownerRaw ? cleanOwnerName(String(ownerRaw)) : null,
        source: 'virginia',
        yearBuilt: attrs['YEAR_BUILT'] || null,
        sqft: route.sqftField ? attrs[route.sqftField] : null,
        totalVal: attrs['IMPROVEMENTS_VALUE_CURRENT']
          ? (attrs['LAND_VALUE_CURRENT'] || 0) + attrs['IMPROVEMENTS_VALUE_CURRENT']
          : null,
        style: attrs['HOUSE_STYLE_DESCRIPTION'] || null,
        bedrooms: attrs['NUMBER_BEDROOMS'] || null,
        baths: attrs['NUMBER_FULL_BATHS'] || null,
      }
    } catch (e) {
      console.warn('VA parcel lookup failed:', e)
    }
  }
  return null
}

// ── Prince George's County, MD (Brandywine, Waldorf-adjacent, DC suburbs) ───
// Confirmed endpoint: gis.princegeorgescountymd.gov public ArcGIS, no auth.
// Maryland's statewide SDAT layer omits owner names by policy; county-level
// layers do publish them. PG County's Property_Flattened layer is the
// authoritative parcel polygons + owner_name + structure data.
async function tryPrinceGeorges(lat: number, lng: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      // 50m buffer in case the tapped lat/lng is on the roof and the parcel
      // polygon is slightly inset / offset. Layer is polygons so an exact
      // hit usually works without buffer, but this is forgiving.
      distance: '50',
      units: 'esriSRUnit_Meter',
      outFields: 'OWNER_NAME,ICO_NAME,ACCOUNT,HOUSE_NUMBER,STREET_NAME,STREET_TYPE,CITY,ZIP5,YEAR_BUILT,STRUCTURE_SQ_FT,LAND_AREA_ACRE',
      returnGeometry: 'false',
      f: 'json',
      resultRecordCount: '1',
    })

    const res = await fetch(
      `https://gis.princegeorgescountymd.gov/arcgis/rest/services/Property/Property_Flattened/MapServer/0/query?${params}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Knocker/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const attrs = data?.features?.[0]?.attributes
    if (!attrs) return null

    const ownerRaw = attrs.OWNER_NAME || attrs.ICO_NAME
    if (!ownerRaw) return null

    return {
      owner: cleanOwnerName(String(ownerRaw)),
      source: 'prince_georges_md',
      apn: attrs.ACCOUNT,
      yearBuilt: attrs.YEAR_BUILT,
      sqft: attrs.STRUCTURE_SQ_FT,
    }
  } catch (e) {
    console.warn('PG County lookup failed:', e)
  }
  return null
}

// ── National fallback: ESRI USA Parcels (~70% US coverage) ───────────────────
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
