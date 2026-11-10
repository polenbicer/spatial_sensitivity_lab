import PolicySimulation from './simulation';
import source from '../../public/data/neighbourhood_priority.json';
import type { Neighbourhood } from './model';

export const metadata = { title: 'Policy Simulation | Spatial Sensitivity Lab', description: 'Allocate a fictional €100 million cooling budget across three Brussels neighbourhoods.' };
export default function Page() {
  const names = ['Duchesse', 'Louise - Longue Haie', 'Marolles'];
  const neighbourhoods: Neighbourhood[] = names.map(name => {
    const row = source.rows.find(r => r.city === 'Brussels' && r.neighbourhood_name === name && r.eligible);
    if (!row) throw new Error(`Simulation neighbourhood unavailable: ${name}`);
    return { id: row.id, name, temperature: row.summer_lst_median_c!, green: row.cooling_green_pct!, income: row.income_median_equivalised_after_tax_eur!, scores: [row.score_surface_temperature!, row.score_green_deficit!, row.score_income_deprivation!] };
  });
  return <PolicySimulation neighbourhoods={neighbourhoods} />;
}
