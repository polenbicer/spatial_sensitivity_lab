import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "public", "data", name), "utf8"));
const grid = read("grid_priority.geojson").features;
const neighbourhoods = read("neighbourhood_priority.json").rows;
const scenarios = [
  "priority_balanced",
  "priority_population_led",
  "priority_surface_led",
  "priority_nature_deficit_led",
];
const expected = {
  Amsterdam: { all: 1049, eligible: 949, neighbourhoods: 519 },
  Brussels: { all: 734, eligible: 732, neighbourhoods: 145 },
};
const fail = (message) => {
  throw new Error(`[data validation] ${message}`);
};
const close = (a, b, tolerance = 0.025) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;

if (new Set(grid.map((f) => f.properties.grid_id)).size !== grid.length) fail("duplicate grid_id");
for (const [city, counts] of Object.entries(expected)) {
  const rows = grid.filter((f) => f.properties.city === city),
    eligible = rows.filter((f) => f.properties.eligible === 1);
  if (rows.length !== counts.all || eligible.length !== counts.eligible)
    fail(`${city} grid row count changed`);
  const areas = neighbourhoods.filter((r) => r.city === city);
  if (areas.length !== counts.neighbourhoods) fail(`${city} neighbourhood count changed`);
  if (new Set(areas.map((r) => r.id)).size !== areas.length)
    fail(`${city} duplicate neighbourhood id`);
}
for (const { properties: p } of grid) {
  if (p.eligible !== 1) continue;
  for (const key of [
    "score_impervious",
    "score_green_deficit",
    "score_population",
    ...scenarios,
    "priority_consensus",
    "priority_range",
  ])
    if (p[key] === null || p[key] < 0 || p[key] > 100) fail(`${p.grid_id}: invalid ${key}`);
  const expectedScores = {
    priority_balanced:
      0.4 * p.score_impervious + 0.3 * p.score_green_deficit + 0.3 * p.score_population,
    priority_population_led:
      0.25 * p.score_impervious + 0.2 * p.score_green_deficit + 0.55 * p.score_population,
    priority_surface_led:
      0.6 * p.score_impervious + 0.2 * p.score_green_deficit + 0.2 * p.score_population,
    priority_nature_deficit_led:
      0.25 * p.score_impervious + 0.55 * p.score_green_deficit + 0.2 * p.score_population,
  };
  for (const [key, value] of Object.entries(expectedScores))
    if (!close(p[key], value)) fail(`${p.grid_id}: ${key} formula mismatch`);
  const sorted = scenarios.map((k) => p[k]).sort((a, b) => a - b),
    median = (sorted[1] + sorted[2]) / 2;
  if (!close(p.priority_consensus, median)) fail(`${p.grid_id}: consensus mismatch`);
  if (p.score_ge_80_scenario_count !== scenarios.filter((k) => p[k] >= 80).length)
    fail(`${p.grid_id}: >=80 count mismatch`);
}
for (const r of neighbourhoods) {
  if (r.aggregation !== "exact overlap-area-weighted mean of eligible 500 m cell scores")
    fail(`${r.id}: undocumented aggregation`);
  if (!(r.eligible_overlap_area_m2 > 0) || !(r.intersecting_eligible_cells > 0))
    fail(`${r.id}: empty neighbourhood coverage`);
  if (!(r.official_area_m2 > 0) || r.eligible_coverage_pct < 0 || r.eligible_coverage_pct > 100.1)
    fail(`${r.id}: invalid area coverage`);
  if (r.thermal_coverage_pct < 0 || r.thermal_coverage_pct > 100.1)
    fail(`${r.id}: invalid thermal coverage`);
  if (r.ranking_eligible !== r.eligible_coverage_pct >= 50)
    fail(`${r.id}: ranking eligibility mismatch`);
}
console.log(
  `Validated ${grid.length} unique grid cells and ${neighbourhoods.length} unique official neighbourhood units.`,
);

// Income is a separate Amsterdam overlay; the original four scenarios stay intact.
const income = read("amsterdam_income.json");
const incomeRows = income.grid_rows;
const gridById = new Map(grid.map(f => [f.properties.grid_id, f.properties]));
if (incomeRows.length !== expected.Amsterdam.all || new Set(incomeRows.map(r => r.grid_id)).size !== incomeRows.length) fail("income overlay row count or duplicate id");
let scored = 0;
const scoresByProxy = new Map();
for (const r of incomeRows) {
  const p = gridById.get(r.grid_id);
  if (!p || p.city !== "Amsterdam") fail("income joined to wrong city or unknown cell");
  if (r.income_coverage_pct < 0 || r.income_coverage_pct > 100) fail("invalid income coverage");
  if (r.income_status !== "complete_proxy" && (r.income_proxy_eur !== null || r.score_income_deprivation !== null || r.priority_income !== null)) fail("incomplete income was scored");
  if (r.priority_income !== null) {
    scored++;
    if (p.eligible !== 1 || r.income_coverage_pct < income.metadata.minimum_income_coverage_pct || !Number.isFinite(r.income_proxy_eur)) fail("ineligible income score");
    if (!close(r.priority_income, .4*p.score_impervious + .3*p.score_green_deficit + .3*r.score_income_deprivation, .0002)) fail("income formula mismatch");
    if (!(r.score_income_deprivation >= 0 && r.score_income_deprivation <= 100)) fail("invalid income percentile");
    if (scoresByProxy.has(r.income_proxy_eur) && scoresByProxy.get(r.income_proxy_eur) !== r.score_income_deprivation) fail("income ties have different scores");
    scoresByProxy.set(r.income_proxy_eur,r.score_income_deprivation);
  }
}
if (scored !== income.metadata.scored_eligible_cells || scored !== 365) fail("income coverage changed; review displayed counts and method");
const ordered = [...scoresByProxy].sort((a,b)=>a[0]-b[0]);
for(let i=1;i<ordered.length;i++) if(ordered[i][1] > ordered[i-1][1]) fail("higher income incorrectly receives higher deprivation score");
for(const r of income.neighbourhood_rows) {
  if(r.priority_income !== null && r.income_scenario_coverage_pct < income.metadata.minimum_income_coverage_pct) fail("partial neighbourhood income scored");
}
console.log(`Validated income overlay: ${scored} scored eligible cells; missing coverage retained; lower income gives higher priority.`);
