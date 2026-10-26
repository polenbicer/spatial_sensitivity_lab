import data from '../public/data/neighbourhood_districts.json';
const districts: Record<string, string> = data.districts;
export function neighbourhoodLabel(row: { id: string; neighbourhood_name: string }) {
  const district = districts[row.id];
  return district ? `${row.neighbourhood_name} (${district})` : row.neighbourhood_name;
}
