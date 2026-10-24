"use client";
import { applyIncome } from "../../lib/income-data";
import { buildCellLabels } from "../../lib/cell-labels";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type City = "Amsterdam" | "Brussels";
type Scenario =
  | "priority_income"
  | "priority_consensus"
  | "priority_balanced"
  | "priority_population_led"
  | "priority_surface_led"
  | "priority_nature_deficit_led";
type ViewMode = "neighbourhoods" | "cells";
type Feature = { properties: Record<string, string | number | null> };
type Collection = { features: Feature[] };
type NeighbourhoodRow = {
  id: string;
  city: City;
  neighbourhood_code: string;
  neighbourhood_name: string;
  intersecting_eligible_cells: number;
  eligible_overlap_area_m2: number;
  official_area_m2: number;
  eligible_coverage_pct: number;
  thermal_coverage_pct: number;
  ranking_eligible: boolean;
  data_quality: string;
  summer_lst_median_c: number | null;
  score_impervious: number;
  score_green_deficit: number;
  score_population: number;
  income: number | null;
  score_income_deprivation?: number | null;
  income_scenario_coverage_pct?: number;
} & Record<Scenario, number | null>;
type NeighbourhoodCollection = { method: string; rows: NeighbourhoodRow[] };
type Summary = {
  id: string;
  code: string;
  name: string;
  cells: number;
  area: number;
  coverage: number;
  thermalCoverage: number;
  rankingEligible: boolean;
  quality: string;
  priority: number;
  surface: number;
  green: number;
  population: number;
  income: number | null;
  lst: number | null;
};

const CITIES: City[] = ["Brussels", "Amsterdam"];
const SCENARIOS: Record<Scenario, { title: string; weights: string; interpretation: string }> = {
  priority_income: { title: "Income model · Amsterdam", weights: "40% surface · 30% green deficit · 30% low income", interpretation: "Lower neighbourhood income increases priority. The grid value is an area-weighted proxy of neighbourhood medians, not measured cell income. Only cells with at least 99.9% income coverage are scored. These weights are an analytical choice." },
  priority_consensus: {
    title: "Scenario median",
    weights: "Median of four scenarios",
    interpretation:
      "This report aggregates four policy logics through a statistical median. It reduces the influence of any single weighting scheme, but it is neither a political consensus nor a neutral result.",
  },
  priority_balanced: {
    title: "Balanced proxy weighting",
    weights: "40% surface · 30% green deficit · 30% population",
    interpretation:
      "This logic distributes attention across three mapped proxies. It favours places where several signals overlap, but equal treatment of indicators is not a complete theory of distributive justice.",
  },
  priority_population_led: {
    title: "Demographic exposure first",
    weights: "25% surface · 20% green deficit · 55% population",
    interpretation:
      "This population-led logic moves densely inhabited places upward. It measures population exposure; income, health and housing are not included in this population-based scenario.",
  },
  priority_surface_led: {
    title: "Built environment / sealed surfaces",
    weights: "60% surface · 20% green deficit · 20% population",
    interpretation:
      "This morphological logic moves highly sealed and impervious places upward. It identifies where the built environment intensifies heat pressure, but does not by itself establish who is most vulnerable or where investment is democratically authorised.",
  },
  priority_nature_deficit_led: {
    title: "Ecological compensation",
    weights: "25% surface · 55% green deficit · 20% population",
    interpretation:
      "This ecological logic moves places with the greatest relative shortage of cooling green upward. It highlights spatial compensation needs while leaving land availability, tenure, displacement risk and local preferences for later public assessment.",
  },
};

function summarise(rows: NeighbourhoodRow[], scenario: Scenario): Summary[] {
  return rows.map((r) => ({
    id: r.id,
    code: r.neighbourhood_code,
    name: r.neighbourhood_name,
    cells: r.intersecting_eligible_cells,
    area: r.eligible_overlap_area_m2,
    coverage: r.eligible_coverage_pct,
    thermalCoverage: r.thermal_coverage_pct,
    rankingEligible: r.ranking_eligible && r[scenario] != null,
    quality: scenario === "priority_income" && r.priority_income == null ? "insufficient income coverage" : r.data_quality,
    priority: r[scenario] ?? NaN,
    surface: r.score_impervious,
    green: r.score_green_deficit,
    population: r.score_population,
    income: r.score_income_deprivation ?? null,
    lst: r.summer_lst_median_c,
  }));
}
function rankMap<T extends { id: string; priority: number }>(rows: T[]) {
  const sorted = rows.filter(r => Number.isFinite(r.priority)).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const out = new Map<string, number>();
  let rank = 0,
    last: number | undefined;
  sorted.forEach((row, i) => {
    if (last === undefined || Math.abs(row.priority - last) > 0.000001) rank = i + 1;
    out.set(row.id, rank);
    last = row.priority;
  });
  return out;
}
function sharedDeltas(a: Array<{id: string; priority: number}>, b: Array<{id: string; priority: number}>) {
  const validA = a.filter(r => Number.isFinite(r.priority));
  const validB = b.filter(r => Number.isFinite(r.priority));
  const idsA = new Set(validA.map(r => r.id)), idsB = new Set(validB.map(r => r.id));
  const left = rankMap(validA.filter(r => idsB.has(r.id)));
  const right = rankMap(validB.filter(r => idsA.has(r.id)));
  return new Map([...left].map(([id, rank]) => [id, right.get(id)! - rank]));
}
function ColumnHelp({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="column-help">
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Explain ${label}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span className={`column-tip ${open ? "open" : ""}`} role="tooltip">
        {children}
      </span>
    </span>
  );
}

const WEIGHTS: Partial<Record<Scenario, [number, number, number, number]>> = {
  priority_income: [0.4, 0.3, 0, 0.3],
  priority_balanced: [0.4, 0.3, 0.3, 0],
  priority_population_led: [0.25, 0.2, 0.55, 0],
  priority_surface_led: [0.6, 0.2, 0.2, 0],
  priority_nature_deficit_led: [0.25, 0.55, 0.2, 0],
};
function movementReason(
  row: { surface: number; green: number; population: number; income?: number | null },
  current: Scenario,
  previous: Scenario,
) {
  if (current === previous) return "Reference selection";
  if (!WEIGHTS[current] || !WEIGHTS[previous])
    return current === "priority_consensus"
      ? "Moved under the four-scenario median"
      : "Moved away from the four-scenario median";
  const labels = ["surface pressure", "green deficit", "population exposure", "low income"];
  if ((current === "priority_income" || previous === "priority_income") && row.income == null) return "No comparable income score";
  const values = [row.surface, row.green, row.population, row.income ?? 0];
  const effects = values.map((value, i) => value * (WEIGHTS[current]![i] - WEIGHTS[previous]![i]));
  const index = effects.map(Math.abs).indexOf(Math.max(...effects.map(Math.abs)));
  return `${labels[index]} received ${effects[index] >= 0 ? "more" : "less"} influence`;
}

function RankingMap({
  city,
  scenario,
  view,
  selected,
  onSelect,
  cellLabels,
}: {
  city: City;
  scenario: Scenario;
  view: ViewMode;
  selected: string;
  onSelect: (id: string) => void;
  cellLabels: Map<string, string>;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    const source =
      view === "neighbourhoods"
        ? "/data/neighbourhood_priority.geojson"
        : "/data/grid_priority.geojson";
    setHtml(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;margin:0}.leaflet-container{background:#dbe3df;font:13px Arial}.leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0}</style></head><body><div id="map"></div><script>const cellLabels=${JSON.stringify(Object.fromEntries(cellLabels))};const city=${JSON.stringify(city)},field=${JSON.stringify(scenario)},selected=${JSON.stringify(selected)},view=${JSON.stringify(view)};const map=L.map('map',{zoomSnap:.25});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,opacity:.58}).addTo(map);Promise.all([fetch('${source}').then(r=>r.json()),fetch('/data/amsterdam_income.json').then(r=>r.json())]).then(([data,income])=>{const byId=new Map((view==='cells'?income.grid_rows:income.neighbourhood_rows).map(r=>[view==='cells'?r.grid_id:r.id,r]));data.features.forEach(f=>Object.assign(f.properties,byId.get(view==='cells'?f.properties.grid_id:f.properties.id)||{}));const layer=L.geoJSON(data,{filter:f=>f.properties.city===city,style:f=>{const p=f.properties,v=p[field],id=view==='neighbourhoods'?p.id:p.grid_id,c=v==null?'#777':v<20?'#0878ad':v<40?'#55a8c8':v<60?'#ecebe5':v<80?'#e89b32':'#c80032';return{fillColor:c,fillOpacity:p.eligible===0||v==null?.18:.72,color:id===selected?'#111':'rgba(30,30,30,.55)',weight:id===selected?4:view==='neighbourhoods'?1.1:.45,dashArray:p.ranking_eligible===false?'5 4':null}},onEachFeature:(f,l)=>{const p=f.properties,id=view==='neighbourhoods'?p.id:p.grid_id,name=view==='cells'?(cellLabels[id]||p.neighbourhood_name||'Boundary cell'):(p.neighbourhood_name||'Boundary cell');l.bindTooltip(name,{permanent:id===selected,direction:'top'});l.on('click',()=>parent.postMessage({type:'ranking-select',id},'*'))}}).addTo(map);if(layer.getBounds().isValid()){const fit=()=>{map.invalidateSize({pan:false});map.fitBounds(layer.getBounds(),{padding:[20,20],animate:false})};requestAnimationFrame(fit);new ResizeObserver(fit).observe(document.getElementById('map'))}});</script></body></html>`,
    );
  }, [city, scenario, view, selected, cellLabels]);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "ranking-select") onSelect(String(event.data.id));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelect]);
  return <iframe className="ranking-map" title={`${city} ${view} map`} srcDoc={html} />;
}

export default function RankingExplorer() {
  const [data, setData] = useState<Collection | null>(null),
    [neighbourhoodData, setNeighbourhoodData] = useState<NeighbourhoodCollection | null>(null),
    [error, setError] = useState(""),
    [city, setCity] = useState<City>("Amsterdam"),
    [scenario, setScenario] = useState<Scenario>("priority_income"),
    [comparison, setComparison] = useState<Scenario>("priority_consensus"),
    [view, setView] = useState<ViewMode>("cells"),
    [showDetails, setShowDetails] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    Promise.all(["grid_priority.geojson", "neighbourhood_priority.json", "amsterdam_income.json"].map(name => fetch(`/data/${name}`).then(r => { if (!r.ok) throw new Error(name); return r.json(); })))
      .then(([grid, neighbourhoods, income]: any[]) => {
        applyIncome(grid, neighbourhoods, income);
        setData(grid as Collection);
        setNeighbourhoodData(neighbourhoods as NeighbourhoodCollection);
      })
      .catch(() => setError("The ranking data could not be loaded."));
  }, []);
  const cellLabels = useMemo(() => buildCellLabels(data?.features ?? []), [data]);
  const cityCells = useMemo(
    () =>
      data?.features.filter((f) => f.properties.city === city && Boolean(f.properties.eligible)) ??
      [],
    [data, city],
  );
  const cityNeighbourhoods = useMemo(
    () => neighbourhoodData?.rows.filter((r) => r.city === city) ?? [],
    [neighbourhoodData, city],
  );
  const currentSummaries = useMemo(
      () => summarise(cityNeighbourhoods, scenario),
      [cityNeighbourhoods, scenario],
    ),
    previousSummaries = useMemo(
      () => summarise(cityNeighbourhoods, comparison),
      [cityNeighbourhoods, comparison],
    );
  const summaryRanks = useMemo(
      () => rankMap(currentSummaries.filter((r) => r.rankingEligible)),
      [currentSummaries],
    ),
    previousSummaryRanks = useMemo(
      () => rankMap(previousSummaries.filter((r) => r.rankingEligible)),
      [previousSummaries],
    );
  const cellRanks = useMemo(
    () =>
      rankMap(
        cityCells.map((f) => ({
          id: String(f.properties.grid_id),
          priority: f.properties[scenario] == null ? NaN : Number(f.properties[scenario]),
        })),
      ),
    [cityCells, scenario],
  );
  const previousCellRanks = useMemo(
    () =>
      rankMap(
        cityCells.map((f) => ({
          id: String(f.properties.grid_id),
          priority: f.properties[comparison] == null ? NaN : Number(f.properties[comparison]),
        })),
      ),
    [cityCells, comparison],
  );
  const neighbourhoodMovement = useMemo(() => sharedDeltas(
    currentSummaries.filter(r => r.rankingEligible), previousSummaries.filter(r => r.rankingEligible)
  ), [currentSummaries, previousSummaries]);
  const cellMovement = useMemo(() => sharedDeltas(
    cityCells.map(f => ({id: String(f.properties.grid_id), priority: f.properties[scenario] == null ? NaN : Number(f.properties[scenario])})),
    cityCells.map(f => ({id: String(f.properties.grid_id), priority: f.properties[comparison] == null ? NaN : Number(f.properties[comparison])}))
  ), [cityCells, scenario, comparison]);
  const q = query.trim().toLowerCase();
  const neighbourhoodRows = useMemo(
    () =>
      [...currentSummaries]
        .sort(
          (a, b) =>
            Number(b.rankingEligible) - Number(a.rankingEligible) || b.priority - a.priority,
        )
        .filter((r) => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)),
    [currentSummaries, q],
  );
  const cellRows = useMemo(
    () =>
      cityCells.filter(f => f.properties[scenario] != null)
        .sort((a, b) => Number(b.properties[scenario]) - Number(a.properties[scenario]))
        .filter(
          (f) =>
            !q ||
            String(f.properties.neighbourhood_name || "")
              .toLowerCase()
              .includes(q) ||
            String(f.properties.grid_id).toLowerCase().includes(q) ||
            (cellLabels.get(String(f.properties.grid_id)) ?? "").toLowerCase().includes(q),
        ),
    [cityCells, scenario, q, cellLabels],
  );
  const chooseScenario = (next: Scenario) => {
    if (next !== scenario) {
      setComparison(scenario);
      setScenario(next);
    }
  };
  const count =
    view === "neighbourhoods"
      ? currentSummaries.filter((r) => r.rankingEligible).length
      : cellRanks.size;
  const excludedNeighbourhoodCount = currentSummaries.filter((r) => !r.rankingEligible).length;
  const downloadCsv = () => {
    const head =
      view === "neighbourhoods"
        ? [
            "rank",
            "movement_vs_previous_logic",
            "movement_explanation",
            "neighbourhood_code",
            "neighbourhood",
            "eligible_500m_cells",
            "eligible_area_coverage_pct",
            "thermal_coverage_pct",
            "evidence_status",
            "mean_priority",
            "mean_surface_pressure",
            "mean_green_deficit",
            scenario === "priority_income" ? "mean_low_income_score" : "mean_population_exposure",
            "mean_summer_lst_c",
          ]
        : [
            "rank",
            "movement_vs_previous_logic",
            "movement_explanation",
            "neighbourhood_context",
            "cell_id",
            "priority",
            "surface_pressure",
            "green_deficit",
            scenario === "priority_income" ? "low_income_score" : "population_exposure",
            "summer_lst_c",
          ];
    const body =
      view === "neighbourhoods"
        ? neighbourhoodRows.map((r) => [
            summaryRanks.get(r.id) ?? "",
            neighbourhoodMovement.get(r.id) ?? "",
            movementReason(r, scenario, comparison),
            r.code,
            r.name,
            r.cells,
            r.coverage.toFixed(1),
            r.thermalCoverage.toFixed(1),
            r.quality,
            (Number.isFinite(r.priority) ? r.priority.toFixed(1) : ""),
            r.surface.toFixed(0),
            r.green.toFixed(0),
            scenario === "priority_income" ? (r.income == null ? "" : r.income.toFixed(0)) : r.population.toFixed(0),
            r.lst == null ? "" : r.lst.toFixed(1),
          ])
        : cellRows.map((f) => {
            const p = f.properties,
              id = String(p.grid_id);
            return [
              cellRanks.get(id),
              cellMovement.get(id) ?? "",
              movementReason(
                {
                  surface: Number(p.score_impervious),
                  green: Number(p.score_green_deficit),
                  population: Number(p.score_population),
                  income: p.score_income_deprivation == null ? null : Number(p.score_income_deprivation),
                },
                scenario,
                comparison,
              ),
              p.neighbourhood_name || "Boundary cell",
              id,
              Number(p[scenario]).toFixed(1),
              Number(p.score_impervious).toFixed(0),
              Number(p.score_green_deficit).toFixed(0),
              scenario === "priority_income" ? (p.score_income_deprivation == null ? "" : Number(p.score_income_deprivation).toFixed(0)) : Number(p.score_population).toFixed(0),
              p.summer_lst_median_c == null ? "" : Number(p.summer_lst_median_c).toFixed(1),
            ];
          });
    const csv = [head, ...body]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${city.toLowerCase()}-${view}-${scenario.replace("priority_", "")}-ranking.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="rankings-page">
      <header className="rankings-nav">
        <div className="rankings-nav-identity">
          <a href="/">← Spatial Sensitivity Lab</a>
          <span>Full within-city ranking</span>
        </div>
        <div className="rankings-nav-actions">
          <a href="/priority-lines">Priority Lines →</a>
          <button onClick={downloadCsv}>Download CSV</button>
          <button onClick={() => window.print()}>Save as PDF</button>
        </div>
      </header>
      <section className="rankings-title">
        <p>
          Decision report ·{" "}
          {view === "neighbourhoods" ? "neighbourhood summaries" : "500 m audit cells"}
        </p>
        <h1>
          {city}
          <br />
          <em>{SCENARIOS[scenario].title}</em>
        </h1>
        <div>
          <b>{count}</b>
          <span>{view === "neighbourhoods" ? "neighbourhoods" : "eligible cells"} ranked</span>
          {view === "neighbourhoods" && excludedNeighbourhoodCount > 0 && (
            <small>{excludedNeighbourhoodCount} additional official units shown but excluded for insufficient mapped or income coverage</small>
          )}
        </div>
      </section>
      <section className="rankings-controls">
        <fieldset>
          <legend>01 · City</legend>
          {CITIES.map((x) => (
            <button
              key={x}
              className={x === city ? "active" : ""}
              onClick={() => {
                setCity(x);
                  setScenario(x === "Amsterdam" ? "priority_income" : "priority_balanced");
                setComparison("priority_balanced");
                setQuery("");
                setSelected("");
              }}
            >
              {x}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>02 · Policy logic</legend>
          {(Object.keys(SCENARIOS) as Scenario[]).filter(k => city === "Amsterdam" || k !== "priority_income").map((x) => (
            <button
              key={x}
              className={x === scenario ? "active" : ""}
              onClick={() => chooseScenario(x)}
            >
              {SCENARIOS[x].title}
            </button>
          ))}
        </fieldset>
        <label>
          03 · Find a neighbourhood or cell
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter…"
          />
        </label>
      </section>
      <section className="ranking-view-switch" aria-label="Ranking unit">
        <button
          className={view === "neighbourhoods" ? "active" : ""}
          onClick={() => {
            setView("neighbourhoods");
            setSelected("");
          }}
        >
          Neighbourhood summaries <small>one row per official area</small>
        </button>
        <button
          className={view === "cells" ? "active" : ""}
          onClick={() => {
            setView("cells");
            setSelected("");
          }}
        >
          500 m cells <small>full audit detail</small>
        </button>
        <details className="ranking-explanation">
          <summary>About these spatial units</summary>
          <p>
          {view === "neighbourhoods" ? (
            <>
              Each official neighbourhood appears once. Values are{" "}
              <b>weighted by the exact overlap area</b> between eligible 500 m cells and the
              neighbourhood polygon, so a tiny boundary fragment cannot count like a full cell.
              Amsterdam uses 519 fine-grained CBS <i>buurten</i> (508 rankable here), while
              Brussels uses 145 Monitoring des Quartiers units. These local geographies are not
              equivalent in size or granularity, so neighbourhood ranks must not be compared
              between cities. The income model is available for Amsterdam only. Its ranks cannot be compared with Brussels.
            </>
          ) : (
            <>
              Each row is a distinct 500 m analytical cell. Repeated neighbourhood names are
              location labels—not duplicate observations or neighbourhood-level scores. Cell numbers stay fixed across scenarios and searches; they are not ranks. Select a cell label to highlight its location on the map.
            </>
          )}
          </p>
        </details>
      </section>
      {city === "Amsterdam" && <p className="report-note">Income model: 365/949 eligible cells scored. A cell needs at least 99.9% income coverage. Other cells stay unranked. The value is an area-weighted proxy of neighbourhood medians, not cell household income. <a href="/methods.html">Sources and method</a>.</p>}
      <section className="report-note">
        <div>
          <span>Selected weights</span>
          <strong>{SCENARIOS[scenario].weights}</strong>
        </div>
        <p>{SCENARIOS[scenario].interpretation}</p>
        <small>
          Rank movement is recalculated among locations with scores in both scenarios. The comparison is:{" "}
          {SCENARIOS[comparison].title}. Choose another model to compare ranks.
        </small>
      </section>
      <div className="ranking-toolbar">
        <p>Ranked within {city} · comparison: {SCENARIOS[comparison].title}</p>
        <button type="button" aria-pressed={showDetails} onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "Hide detailed columns" : "Show detailed columns"}
        </button>
      </div>
      <section className={`ranking-results ${view} ${showDetails ? "show-details" : "summary-columns"}`}>
        {data && neighbourhoodData && (
          <RankingMap
            city={city}
            scenario={scenario}
            view={view}
            selected={selected}
            onSelect={setSelected}
            cellLabels={cellLabels}
          />
        )}
        {error ? (
          <div className="ranking-status error">{error}</div>
        ) : !data || !neighbourhoodData ? (
          <div className="ranking-status">Loading full city ranking…</div>
        ) : view === "neighbourhoods" ? (
          <div className="full-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <ColumnHelp label="Rank">
                      <b>Within-city neighbourhood order</b>
                      <span>
                        Official neighbourhoods sorted by their overlap-area-weighted
                        selected-policy score.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Rank change">
                      <b>Compared with {SCENARIOS[comparison].title}</b>
                      <span>
                        Previous rank minus current rank. Equal scores receive equal ranks; positive
                        means the neighbourhood moved up.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Why it moved">
                      <b>Largest weighting effect</b>
                      <span>
                        The component whose changed policy weight had the largest direct effect on
                        this score.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Neighbourhood">
                      <b>Official spatial unit</b>
                      <span>
                        One row per unique official code. Brussels uses Monitoring des Quartiers;
                        Amsterdam uses CBS neighbourhoods.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Cells">
                      <b>Intersecting analytical units</b>
                      <span>
                        Distinct eligible 500 m cells overlapping the neighbourhood; cells crossing
                        a boundary contribute proportionally to each side.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Coverage">
                      <b>Eligible mapped area</b>
                      <span>
                        Share of the official neighbourhood polygon represented by eligible
                        analytical cells.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Mean priority">
                      <b>Area-weighted summary</b>
                      <span>
                        Cell scores weighted by exact overlap area. It is a derived summary, not a
                        separately modelled neighbourhood score.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Mean surface">
                      <b>Area-weighted surface pressure</b>
                      <span>
                        Overlap-area-weighted mean of cell-level within-city impervious-surface
                        scores.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Mean green deficit">
                      <b>Area-weighted green shortage</b>
                      <span>
                        Overlap-area-weighted mean of cell-level within-city cooling-green deficit
                        scores.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label={scenario === "priority_income" ? "Mean low income" : "Mean population"}>
                      <b>{scenario === "priority_income" ? "Area-weighted low-income score" : "Area-weighted population exposure"}</b>
                      <span>
                        {scenario === "priority_income" ? "Mean of eligible cell income scores. At least 99.9% of eligible overlap area must have a score. This is not neighbourhood median income." : "Overlap-area-weighted mean of cell population-exposure scores; not total neighbourhood population."}
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Mean summer LST">
                      <b>Area-weighted surface temperature</b>
                      <span>
                        Overlap-area-weighted mean of available Landsat summer LST medians. It is
                        not air temperature.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Evidence">
                      <b>Coverage warning</b>
                      <span>
                        Areas below 50% analytical coverage are shown but not ranked. Thermal
                        coverage is reported separately.
                      </span>
                    </ColumnHelp>
                  </th>
                </tr>
              </thead>
              <tbody>
                {neighbourhoodRows.map((r) => {
                  const currentRank = summaryRanks.get(r.id),
                    previousRank = previousSummaryRanks.get(r.id);
                  const delta =
                    neighbourhoodMovement.get(r.id) ?? null;
                  return (
                    <tr
                      key={r.id}
                      className={`${selected === r.id ? "selected " : ""}${r.rankingEligible ? "" : "limited"}`}
                      onClick={() => setSelected(r.id)}
                    >
                      <td>{currentRank ?? "—"}</td>
                      <td
                        className={
                          delta !== null && delta > 0
                            ? "up"
                            : delta !== null && delta < 0
                              ? "down"
                              : "same"
                        }
                      >
                        {delta === null ? "—" : delta > 0 ? `+${delta}` : String(delta)}
                      </td>
                      <td>{movementReason(r, scenario, comparison)}</td>
                      <td>
                        {r.name}
                        <small className="unit-code">{r.code}</small>
                      </td>
                      <td>{r.cells}</td>
                      <td>{r.coverage.toFixed(0)}%</td>
                      <td>
                        <b>{(Number.isFinite(r.priority) ? r.priority.toFixed(1) : "—")}</b>
                      </td>
                      <td>{r.surface.toFixed(0)}</td>
                      <td>{r.green.toFixed(0)}</td>
                      <td>{scenario === "priority_income" ? (r.income == null ? "—" : r.income.toFixed(0)) : r.population.toFixed(0)}</td>
                      <td>{r.lst == null ? "—" : `${r.lst.toFixed(1)} °C`}</td>
                      <td>
                        <span
                          className={`quality ${r.quality.startsWith("sufficient") ? "good" : "warning"}`}
                        >
                          {r.quality}
                        </span>
                        <small className="thermal-coverage">
                          LST coverage {r.thermalCoverage.toFixed(0)}%
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="full-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <ColumnHelp label="Rank">
                      <b>Within-city cell order</b>
                      <span>
                        Eligible 500 m cells sorted from highest to lowest selected-policy score.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Rank change">
                      <b>Compared with {SCENARIOS[comparison].title}</b>
                      <span>Previous rank minus current rank.</span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Why it moved">
                      <b>Largest weighting effect</b>
                      <span>
                        The component whose changed policy weight had the largest direct effect on
                        this cell score.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Cell location">
                      <b>Orientation label only</b>
                      <span>
                        The neighbourhood containing the cell’s representative point. Repeated names
                        are expected; values remain cell-specific.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Priority">
                      <b>Selected-policy score</b>
                      <span>
                        A 0–100 within-city composite derived from surface pressure, green deficit
                        and either population exposure or low income, depending on the selected model.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Surface">
                      <b>Impervious-surface pressure</b>
                      <span>
                        A within-city 0–100 score derived from Copernicus 2021 sealed-surface data.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Green deficit">
                      <b>Relative cooling-green shortage</b>
                      <span>
                        A within-city 0–100 deficit score derived from ESA WorldCover 2021
                        cooling-green classes.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label={scenario === "priority_income" ? "Low income" : "Population"}>
                      <b>{scenario === "priority_income" ? "Lower income gives a higher score" : "Population exposure"}</b>
                      <span>
                        {scenario === "priority_income" ? "Inverse income-proxy percentile among complete-coverage Amsterdam cells; higher means lower income. It is not a poverty rate." : "A within-city 0–100 score derived from JRC GHSL population density for 2020."}
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Summer LST">
                      <b>Observed surface temperature</b>
                      <span>
                        Median daytime land-surface temperature in °C from valid Landsat 8/9
                        observations for June–August 2019–2023.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Cell ID">
                      <b>Stable spatial unit</b>
                      <span>The identifier of the 500 m European analysis-grid cell.</span>
                    </ColumnHelp>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cellRows.map((f) => {
                  const p = f.properties,
                    id = String(p.grid_id),
                    delta = cellMovement.get(id) ?? NaN;
                  return (
                    <tr
                      key={id}
                      className={selected === id ? "selected" : ""}
                      onClick={() => setSelected(id)}
                    >
                      <td>{cellRanks.get(id)}</td>
                      <td className={delta > 0 ? "up" : delta < 0 ? "down" : "same"}>
                        {!Number.isFinite(delta) ? "—" : delta > 0 ? `+${delta}` : String(delta)}
                      </td>
                      <td>
                        {movementReason(
                          {
                            surface: Number(p.score_impervious),
                            green: Number(p.score_green_deficit),
                            population: Number(p.score_population),
                  income: p.score_income_deprivation == null ? null : Number(p.score_income_deprivation),
                          },
                          scenario,
                          comparison,
                        )}
                      </td>
                      <td><button type="button" className="cell-link" onClick={() => setSelected(id)}>{cellLabels.get(id) || "Boundary cell"}</button></td>
                      <td>
                        <b>{Number(p[scenario]).toFixed(1)}</b>
                      </td>
                      <td>{Number(p.score_impervious).toFixed(0)}</td>
                      <td>{Number(p.score_green_deficit).toFixed(0)}</td>
                      <td>{scenario === "priority_income" ? (p.score_income_deprivation == null ? "—" : Number(p.score_income_deprivation).toFixed(0)) : Number(p.score_population).toFixed(0)}</td>
                      <td>
                        {p.summer_lst_median_c == null
                          ? "—"
                          : `${Number(p.summer_lst_median_c).toFixed(1)} °C`}
                      </td>
                      <td>{id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="report-method">
        <div>
          <span>Interpretation</span>
          <p>
            Under <b>{SCENARIOS[scenario].title}</b>, higher scores indicate a stronger relative
            priority signal within {city}. They do not establish that an area should automatically
            receive investment.
          </p>
        </div>
        <div>
          <span>Method</span>
          <p>
            Neighbourhood values are exact overlap-area-weighted summaries of eligible 500 m cells.
            Cell scores are within-city measures and should not be compared numerically between
            Amsterdam and Brussels.
          </p>
        </div>
        <div>
          <span>Evidence boundary</span>
          <p>
            Income is represented only in Amsterdam’s income model, through a neighbourhood-based proxy. The ranking does not fully measure health, housing quality, land feasibility,
            displacement risk or residents’ preferences. Landsat records land-surface—not
            air—temperature.
          </p>
        </div>
        <div>
          <span>Sources · income 2023 · boundaries 2025</span>
          <p>
            ESA WorldCover 2021 · Copernicus Imperviousness 2021 · JRC GHSL population 2020 ·
            Landsat 8/9 JJA 2019–2023 · CBS income 2023 · CBS boundaries 2025 · PDOK / perspective.brussels.
          </p>
        </div>
      </section>
      <section className="reading-limits">
        <header>
          <p>How to read this ranking</p>
          <h2>Four limits remain visible.</h2>
        </header>
        <div>
          <article>
            <b>01 · Relative, not absolute</b>
            <p>
              Scores are within-city percentiles. A score of 90 in Brussels is not directly
              equivalent to 90 in Amsterdam.
            </p>
          </article>
          <article>
            <b>02 · Summary hides variation</b>
            <p>
              A neighbourhood mean improves legibility but can conceal hot or underserved cells. The
              500 m audit view preserves that variation.
            </p>
          </article>
          <article>
            <b>03 · The grid shapes the result</b>
            <p>
              Five-hundred-metre cells simplify continuous urban conditions. Boundaries and rank
              order may change at another spatial resolution.
            </p>
          </article>
          <article>
            <b>04 · Evidence, not authorization</b>
            <p>
              Rank movement exposes the effect of indicator choices and policy weights. It does not identify a politically
              legitimate budget winner without participation, review and appeal.
            </p>
          </article>
        </div>
      </section>
      <footer className="rankings-footer">
        <span>Spatial Sensitivity Lab · Polen Biçer · 2026</span>
        <span>
          Within-city relative scores · research demonstrator · not an allocation decision
        </span>
      </footer>
    </main>
  );
}
