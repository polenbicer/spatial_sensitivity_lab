/** Stable display labels within each city/neighbourhood for this data release.
 * Number all grid cells, before filtering or ranking, so scenarios and searches
 * cannot renumber them. These are location labels, not priority ranks.
 */
export function buildCellLabels(features: readonly { properties: Record<string, unknown> }[]) {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const { properties: p } of features) {
    const id = String(p.grid_id);
    const name = String(p.neighbourhood_name || "Boundary cell");
    const key = JSON.stringify([p.city, name]);
    const group = groups.get(key) ?? [];
    group.push({ id, name });
    groups.set(key, group);
  }
  const labels = new Map<string, string>();
  for (const {properties:p} of features) if ((p.spatial_unit === "buurt" || p.spatial_unit === "wijk" || p.spatial_unit === "monitoring_neighbourhood")) labels.set(String(p.grid_id ?? p.id), String(p.neighbourhood_name));
  for (const group of groups.values()) {
    group.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    group.forEach(({ id, name }, i) => labels.has(id) ? undefined : labels.set(id, `${name} · Cell ${i + 1}`));
  }
  return labels;
}
