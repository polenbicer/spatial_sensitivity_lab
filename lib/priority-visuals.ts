/** Shared score colours for both choropleths. Red in Priority Lines denotes selection. */
export const PRIORITY_BANDS = [
  { max: 20, colour: '#075985', label: '0–20' },
  { max: 40, colour: '#0284C7', label: '20–40' },
  { max: 60, colour: '#E3B448', label: '40–60' },
  { max: 80, colour: '#F05A28', label: '60–80' },
  { max: 101, colour: '#B70021', label: '80–100' },
];
export const priorityColour = (score: number | null) => score == null ? '#777777' : (PRIORITY_BANDS.find(band => score < band.max) ?? PRIORITY_BANDS[4]).colour;
export const PRIORITY_LEGEND = '<div style="background:#fff;color:#111;padding:9px 11px;border:1px solid #777;font:12px/1.6 Arial,sans-serif"><b>Cooling investment priority</b><br>' + PRIORITY_BANDS.map((band, index) => '<i style="display:inline-block;width:12px;height:12px;margin-right:7px;background:' + band.colour + '"></i>' + (band.label + (index === 0 ? ' · Lower priority' : index === PRIORITY_BANDS.length - 1 ? ' · Higher priority' : ''))).join('<br>') + '<br><i style="display:inline-block;width:12px;height:12px;margin-right:7px;background:#777"></i>Unranked<br><span>Score 0–100 · selected scenario</span></div>';
export const SCENARIO_RATIOS: Record<string, string> = {
  priority_balanced: '⅓ / ⅓ / ⅓',
  priority_heat_led: '60 / 20 / 20',
  priority_nature_deficit_led: '20 / 60 / 20',
  priority_income_led: '20 / 20 / 60',
};
