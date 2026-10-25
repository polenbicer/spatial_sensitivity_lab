export type Scenario = 'priority_consensus' | 'priority_balanced' | 'priority_income_led' | 'priority_heat_led' | 'priority_nature_deficit_led';
const entry = (title: string, weights: string, explanation: string) => ({title, weights, note: explanation, interpretation: explanation});
export const SCENARIOS: Record<Scenario, ReturnType<typeof entry>> = {
 priority_consensus: entry('Scenario median', 'Median of four scenarios', 'Statistical median of the four weightings. It is not public agreement.'),
 priority_balanced: entry('Balanced weighting', '40% surface temperature · 30% green deficit · 30% low income', 'Combines surface heat, green shortage and lower income.'),
 priority_income_led: entry('Low income first', '25% surface temperature · 20% green deficit · 55% low income', 'Gives more weight to lower income, using a neighbourhood-based income proxy.'),
 priority_heat_led: entry('Surface temperature first', '60% surface temperature · 20% green deficit · 20% low income', 'Gives more weight to observed summer land-surface temperature.'),
 priority_nature_deficit_led: entry('Green deficit first', '25% surface temperature · 55% green deficit · 20% low income', 'Gives more weight to a shortage of cooling green cover.'),
};
