/** Shared score colours for both choropleths. Red in Priority Lines denotes selection. */
export const PRIORITY_BANDS = [
  { max: 20, colour: '#440154', label: '0–20' },
  { max: 40, colour: '#3b528b', label: '20–40' },
  { max: 60, colour: '#21918c', label: '40–60' },
  { max: 80, colour: '#5ec962', label: '60–80' },
  { max: 101, colour: '#fde725', label: '80–100' },
];
export const priorityColour = (score: number | null) => score == null ? '#777777' : (PRIORITY_BANDS.find(band => score < band.max) ?? PRIORITY_BANDS[4]).colour;
export const PRIORITY_LEGEND = '<div style="background:#fff;color:#111;padding:9px 11px;border:1px solid #777;font:12px/1.6 Arial,sans-serif"><b>Priority score · 0–100</b><br>' + PRIORITY_BANDS.map(band => '<i style="display:inline-block;width:12px;height:12px;margin-right:7px;background:' + band.colour + '"></i>' + band.label).join('<br>') + '<br><i style="display:inline-block;width:12px;height:12px;margin-right:7px;background:#777"></i>Unranked<br><span>Higher score = higher priority</span></div>';
export const SCENARIO_RATIOS: Record<string, string> = {
  priority_balanced: '⅓ / ⅓ / ⅓',
  priority_heat_led: '60 / 20 / 20',
  priority_nature_deficit_led: '20 / 60 / 20',
  priority_income_led: '20 / 20 / 60',
};
