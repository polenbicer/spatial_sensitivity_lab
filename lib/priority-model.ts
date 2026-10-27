export type Scenario = 'priority_consensus' | 'priority_balanced' | 'priority_income_led' | 'priority_heat_led' | 'priority_nature_deficit_led';
const entry = (title: string, weights: string, explanation: string) => ({title, weights, note: explanation, interpretation: explanation});
export const SCENARIOS: Record<Scenario, ReturnType<typeof entry>> = {
 priority_consensus: entry('Scenario median', 'Median of four scenarios', 'Statistical median of the four weightings. It is not public agreement.'),
 priority_balanced: entry('Balanced weighting', '40% surface temperature · 30% green deficit · 30% lower median income', 'Combines surface heat, green shortage and lower income.'),
 priority_income_led: entry('Lower median income first', '25% surface temperature · 20% green deficit · 55% lower median income', 'Gives more weight to lower neighbourhood income within the selected city.'),
 priority_heat_led: entry('Surface temperature first', '60% surface temperature · 20% green deficit · 20% lower median income', 'Gives more weight to observed summer land-surface temperature.'),
 priority_nature_deficit_led: entry('Green deficit first', '25% surface temperature · 55% green deficit · 20% lower median income', 'Gives more weight to green deficit as defined in each city’s source data.'),
};

export const CITY_INCOME = {
 Amsterdam: {
  label: 'Median disposable household income · 2024 (preliminary)',
  description: 'Amsterdam: official wijk scale (110 areas). O&S median disposable household income, not adjusted for household size. 108 published income values; 108 complete neighbourhoods ranked. 2 wijken have no published income value. Income covers 2024 and is preliminary. Student households, institutional residents and households without income information are excluded; publication requires at least 100 remaining households (O&S, 27 October 2026).',
 },
 Brussels: {
  label: 'Median equivalised after-tax income · 2023',
  description: 'Brussels-Capital Region: IBSA/Statbel indicator 2498, median equivalised after-tax income of residents in 2023. 118 published income values; 116 neighbourhoods ranked. IBSA does not publish neighbourhood income for the 27 areas classified as non-residential (codes above 118). These are generally large areas with relatively few residents, so mapped income can be misleading. This is not evidence of zero residents or zero need. Two further neighbourhoods are unranked because of unresolved green-inventory features. This tax-based measure excludes some non-taxable income.',
 },
} as const;
export const INCOME_COMPARABILITY = 'Income definitions differ between cities. Each city is normalized and ranked independently; income amounts and priority scores are not a cross-city comparison. Missing values remain unavailable.';

export const cityLabel = (city: 'Amsterdam' | 'Brussels') => city === 'Brussels' ? 'Brussels-Capital Region' : 'Amsterdam';
export const INCOME_MEANING = 'Lower median income means a higher income score. It does not measure the share of low-income residents or describe every household.';

export function coverageReason(row: {city?: string; income_status?: string; model_status?: string; green_coverage_status?: string}) {
 if (row.income_status !== 'published') return row.city === 'Brussels'
  ? 'Income not published: IBSA classifies this as a non-residential area. Such areas are generally large with relatively few residents, which can make mapped income misleading. Available temperature and public-green values are still shown.'
  : 'Income not published in the source. O&S publishes this indicator only for areas with at least 100 households after its exclusions; no area-specific household counts were supplied. Available temperature and public-green values are still shown.';
 if (row.green_coverage_status === 'unresolved_inventory_features' || row.model_status?.includes('unresolved_green_inventory')) return 'Public-green inventory has unresolved features here; green share and combined rank are unavailable. Temperature and published income remain visible.';
 return 'All three indicators available.';
}
