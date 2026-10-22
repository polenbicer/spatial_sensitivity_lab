export const SOCIAL_FIELDS = [
  "age65_pct", "one_person_pct", "median_taxable_income_eur", "social_diagnostic",
  "priority_vulnerability_informed", "age65_pct_covered_area_pct",
  "one_person_pct_covered_area_pct", "social_overlap_count",
] as const;

export function mergeSocialOverlay(
  features: Array<{ properties: Record<string, any> }>,
  rows: Array<Array<string | number | null>>,
) {
  const byId = new Map(rows.map(row => [String(row[0]), row]));
  for (const { properties: p } of features) {
    const row = byId.get(String(p.grid_id));
    for (const [i, field] of SOCIAL_FIELDS.entries()) p[field] = row?.[i + 1] ?? null;
  }
}
