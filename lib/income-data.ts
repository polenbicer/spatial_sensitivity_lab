// Public overlay joins only on stable identifiers. Missing values stay null.
export type IncomeOverlay = {grid_rows: Array<Record<string, any>>; neighbourhood_rows: Array<Record<string, any>>};
export function applyIncome(grid: any, neighbourhoods: any, income: IncomeOverlay) {
  const cells = new Map(income.grid_rows.map(r => [r.grid_id, r]));
  const areas = new Map(income.neighbourhood_rows.map(r => [r.id, r]));
  for (const f of grid.features) Object.assign(f.properties, cells.get(f.properties.grid_id) ?? {});
  if (neighbourhoods) for (const row of neighbourhoods.rows) Object.assign(row, areas.get(row.id) ?? {});
}
