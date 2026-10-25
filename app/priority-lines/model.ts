export type City = 'Brussels' | 'Amsterdam';
export const SCENARIOS = [
  { field: 'priority_heat_led', title: 'Surface temperature first', weights: '60 / 20 / 20' },
  { field: 'priority_balanced', title: 'Balanced', weights: '40 / 30 / 30' },
  { field: 'priority_nature_deficit_led', title: 'Green deficit first', weights: '25 / 55 / 20' },
  { field: 'priority_income_led', title: 'Lower median income first', weights: '25 / 20 / 55' },
] as const;
export type ScoreField = typeof SCENARIOS[number]['field'];
export type Row = {
  id: string; city: City; neighbourhood_name: string; ranking_eligible: boolean;
} & Record<ScoreField, number>;
export type RankedRow = Row & { ranks: number[]; span: number };
export type Polygon = number[][][];
export type Feature = {
  properties: { id: string; city: City; neighbourhood_name: string };
  geometry: { type: 'Polygon'; coordinates: Polygon } | { type: 'MultiPolygon'; coordinates: Polygon[] };
};
export type GeoData = { features: Feature[] };

// Same within-city competition ranking and tie tolerance as the full Rankings page.
export function rankCity(rows: Row[], city: City): RankedRow[] {
  const eligible = rows.filter(row => row.city === city && row.ranking_eligible &&
    SCENARIOS.every(scenario => Number.isFinite(row[scenario.field])));
  const ranks = SCENARIOS.map(({ field }) => {
    const sorted = [...eligible].sort((a, b) => b[field] - a[field] || a.id.localeCompare(b.id));
    const result = new Map<string, number>();
    let previous: number | undefined;
    let rank = 0;
    sorted.forEach((row, index) => {
      if (previous === undefined || Math.abs(row[field] - previous) > 0.000001) rank = index + 1;
      result.set(row.id, rank);
      previous = row[field];
    });
    return result;
  });
  return eligible.map(row => {
    const positions = ranks.map(rank => rank.get(row.id)!);
    return { ...row, ranks: positions, span: Math.max(...positions) - Math.min(...positions) };
  });
}

export function exampleIds(rows: RankedRow[], city: City): string[] {
  const original = ['1.0', '47.0', '26.0', '18.0', '803.0', '800.0'].map(id => `Brussels:${id}`);
  if (city === 'Brussels' && original.every(id => rows.some(row => row.id === id))) return original;
  // Amsterdam: one high-priority reference and five largest spans, all from its own ranking universe.
  const highest = [...rows].sort((a, b) => a.ranks[1] - b.ranks[1] || a.id.localeCompare(b.id))[0];
  const movers = [...rows].filter(row => row.id !== highest?.id)
    .sort((a, b) => b.span - a.span || a.id.localeCompare(b.id)).slice(0, 5);
  return highest ? [highest.id, ...movers.map(row => row.id)] : [];
}

export function mapPaths(features: Feature[]) {
  if (!features.length) return [];
  const latitude = features[0].properties.city === 'Brussels' ? 50.85 : 52.37;
  const correction = Math.cos(latitude * Math.PI / 180);
  const polygons = (feature: Feature): Polygon[] => feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates : [feature.geometry.coordinates];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  features.forEach(feature => polygons(feature).forEach(polygon => polygon.forEach(ring => ring.forEach(([lon, lat]) => {
    const x = lon * correction;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
  }))));
  const scale = Math.min(660 / (maxX - minX), 600 / (maxY - minY));
  const offsetX = (700 - (maxX - minX) * scale) / 2;
  const offsetY = (650 - (maxY - minY) * scale) / 2;
  return features.map(feature => ({ ...feature.properties, path: polygons(feature).map(polygon => polygon.map(ring =>
    ring.map(([lon, lat], index) => `${index ? 'L' : 'M'}${(offsetX + (lon * correction - minX) * scale).toFixed(2)},${(offsetY + (maxY - lat) * scale).toFixed(2)}`).join('') + 'Z'
  ).join('')).join('') }));
}
