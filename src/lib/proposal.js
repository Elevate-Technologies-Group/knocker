// Solar proposal generator — builds a clean proposal object from solar data
// Saved to Supabase doors.proposal (jsonb) and displayed in DoorModal

const AVG_RATE_PER_KWH = 0.14        // average US residential rate
const PANEL_COST_PER_W = 2.85        // installed cost $/W (2025 avg)
const FED_TAX_CREDIT = 0.30          // 30% ITC
const SYSTEM_LIFETIME_YEARS = 25
const ANNUAL_DEGRADATION = 0.005     // 0.5%/yr panel degradation

export function generateProposal({ solar, address, owner_name }) {
  if (!solar) return null

  const systemKw = solar.systemSizeKw || 0
  const annualKwh = solar.realisticKwh || 0
  const annualSavings = solar.annualSavings || 0
  const panelCount = solar.panelCount || 0
  const panelCapW = solar.panelCapacityW || 400

  // Gross system cost
  const grossCost = Math.round(systemKw * 1000 * PANEL_COST_PER_W)
  // After 30% federal tax credit
  const netCost = Math.round(grossCost * (1 - FED_TAX_CREDIT))
  // Simple payback
  const paybackYears = annualSavings > 0 ? parseFloat((netCost / annualSavings).toFixed(1)) : null

  // 25-year cumulative savings (with 0.5%/yr degradation, assumes flat rates)
  let cumulativeSavings = 0
  let yearlyKwh = annualKwh
  for (let y = 0; y < SYSTEM_LIFETIME_YEARS; y++) {
    cumulativeSavings += yearlyKwh * AVG_RATE_PER_KWH
    yearlyKwh *= (1 - ANNUAL_DEGRADATION)
  }
  cumulativeSavings = Math.round(cumulativeSavings)
  const netLifetimeSavings = cumulativeSavings - netCost

  // CO2 offset (avg US grid: 0.386 kg CO2/kWh)
  const annualCo2Kg = Math.round(annualKwh * 0.386)
  const lifetimeCo2Kg = Math.round(annualCo2Kg * SYSTEM_LIFETIME_YEARS)

  // Roof quality score 0-100
  const sunScore = Math.min(100, Math.round((solar.medianSunshineHours / 1800) * 100))

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    address,
    ownerName: owner_name || null,

    // System specs
    systemKw,
    panelCount,
    panelCapacityW: panelCapW,
    annualKwh,
    medianSunshineHours: solar.medianSunshineHours,
    roofSegments: solar.roofSegments,
    bestAzimuth: solar.bestAzimuth,
    bestPitch: solar.bestPitch,
    sunScore,

    // Financials
    grossCost,
    federalCredit: Math.round(grossCost * FED_TAX_CREDIT),
    netCost,
    annualSavings,
    monthlySavings: solar.monthlySavings,
    paybackYears,
    cumulativeSavings25yr: cumulativeSavings,
    netLifetimeSavings,

    // Environmental
    annualCo2Kg,
    lifetimeCo2Kg,
    treesEquivalent: Math.round(annualCo2Kg / 21), // ~21kg CO2/tree/yr
  }
}

// Format proposal for display
export function formatProposalSummary(p) {
  if (!p) return null
  return {
    headline: `$${p.monthlySavings}/mo savings · ${p.systemKw} kW system`,
    subline: `${p.paybackYears}yr payback · $${p.netLifetimeSavings?.toLocaleString()} net lifetime value`,
    sunScore: p.sunScore,
  }
}
