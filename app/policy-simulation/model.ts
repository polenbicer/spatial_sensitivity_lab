export type Neighbourhood = { id: string; name: string; temperature: number; green: number; income: number; scores: number[] };
export type Decision = { title: string; amounts: number[] };
export const money = (value: number) => `€${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)}m`;
export function totals(decisions: Decision[]) {
  return [0, 1, 2].map(i => decisions.reduce((sum, d) => sum + d.amounts[i], 0));
}
export function mayorProfile(areas: Neighbourhood[], funding: number[]) {
  if (Math.max(...funding) - Math.min(...funding) <= 30) return { title: 'The Balancing Mayor', text: 'You spread your budget relatively evenly across the three neighbourhoods.', emphasis: 'Shared investment' };
  const scores = [0, 1, 2].map(k => areas.reduce((sum, n, i) => sum + n.scores[k] * (funding[i] / 100 - 1 / 3), 0));
  const best = scores.indexOf(Math.max(...scores));
  return [
    { title: 'The Heat-First Mayor', text: 'Your spending leans towards neighbourhoods with higher surface-temperature scores.', emphasis: 'Surface temperature' },
    { title: 'The Green-First Mayor', text: 'Your spending leans towards neighbourhoods with greater public-green deficits.', emphasis: 'Green deficit' },
    { title: 'The Income-First Mayor', text: 'Your spending leans towards neighbourhoods with lower median incomes.', emphasis: 'Lower median income' },
  ][best];
}
