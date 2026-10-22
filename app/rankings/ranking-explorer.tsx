"use client";
import { buildCellLabels } from "../../lib/cell-labels";
import { mergeSocialOverlay } from "../../lib/social-overlay";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type City = "Amsterdam" | "Brussels";
type Scenario =
  | "priority_consensus"
  | "priority_balanced"
  | "priority_population_led"
  | "priority_surface_led"
  | "priority_nature_deficit_led"
  | "priority_vulnerability_informed";
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
  age65_pct?: number | null;
  one_person_pct?: number | null;
  social_diagnostic?: number | null;
  social_coverage_pct?: number;
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
  social: number;
  age65: number | null;
  onePerson: number | null;
  socialCoverage: number;
  lst: number | null;
};

const CITIES: City[] = ["Brussels", "Amsterdam"];
const SCENARIOS: Record<Scenario, { title: string; weights: string; interpretation: string }> = {
  priority_vulnerability_informed: {
    title: "Vulnerability-informed · 65+ and living alone",
    weights: "30% surface · 20% green deficit · 20% population · 15% age 65+ · 15% one-person households",
    interpretation: "Includes within-city percentile scores of the population share aged 65+ and the share of one-person households, with equal weight in the social component. Age is a heat-vulnerability indicator; living alone is not proof of social isolation. Health and housing remain unmeasured. Areas without enough social evidence are not ranked.",
  },
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
      "This population-led logic moves densely inhabited places upward. The result reflects potential exposure, not individual vulnerability: age and one-person household shares are included in the separate vulnerability-informed scenario. This population-only baseline does not include them.",
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
    quality: scenario === "priority_vulnerability_informed" && r[scenario] == null ? "insufficient social coverage" : r.data_quality,
    priority: r[scenario] ?? NaN,
    surface: r.score_impervious,
    green: r.score_green_deficit,
    population: r.score_population,
    social: r.social_diagnostic ?? 0,
    age65: r.age65_pct ?? null,
    onePerson: r.one_person_pct ?? null,
    socialCoverage: r.social_coverage_pct ?? 0,
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
  priority_vulnerability_informed: [0.3, 0.2, 0.2, 0.3],
  priority_balanced: [0.4, 0.3, 0.3, 0],
  priority_population_led: [0.25, 0.2, 0.55, 0],
  priority_surface_led: [0.6, 0.2, 0.2, 0],
  priority_nature_deficit_led: [0.25, 0.55, 0.2, 0],
};
function movementReason(
  row: { surface: number; green: number; population: number; social?: number },
  current: Scenario,
  previous: Scenario,
) {
  if (current === previous) return "Reference selection";
  if (!WEIGHTS[current] || !WEIGHTS[previous])
    return current === "priority_consensus"
      ? "Moved under the four-scenario median"
      : "Moved away from the four-scenario median";
  const labels = ["surface pressure", "green deficit", "population exposure", "age 65+ and one-person households"];
  const values = [row.surface, row.green, row.population, row.social ?? 0];
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
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;margin:0}.leaflet-container{background:#dbe3df;font:13px Arial}.leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0}</style></head><body><div id="map"></div><script>const cellLabels=${JSON.stringify(Object.fromEntries(cellLabels))};const city=${JSON.stringify(city)},field=${JSON.stringify(scenario)},selected=${JSON.stringify(selected)},view=${JSON.stringify(view)};const map=L.map('map',{zoomSnap:.25});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,opacity:.58}).addTo(map);Promise.all([fetch('${source}').then(r=>r.json()),fetch(view==='neighbourhoods'?'/data/social_neighbourhoods.json':'/data/social_diagnostic.json').then(r=>r.json())]).then(([data,social])=>{const byId=new Map(social.map(r=>view==='neighbourhoods'?[r.id,r]:[r[0],{age65_pct:r[1],one_person_pct:r[2],social_diagnostic:r[4],priority_vulnerability_informed:r[5]}]));for(const f of data.features)Object.assign(f.properties,byId.get(view==='neighbourhoods'?f.properties.id:f.properties.grid_id)||{priority_vulnerability_informed:null});const layer=L.geoJSON(data,{filter:f=>f.properties.city===city,style:f=>{const p=f.properties,v=p[field],id=view==='neighbourhoods'?p.id:p.grid_id,c=v==null?'#777':v<20?'#0878ad':v<40?'#55a8c8':v<60?'#ecebe5':v<80?'#e89b32':'#c80032';return{fillColor:c,fillOpacity:p.eligible===0||v==null?.18:.72,color:id===selected?'#111':'rgba(30,30,30,.55)',weight:id===selected?4:view==='neighbourhoods'?1.1:.45,dashArray:p.ranking_eligible===false?'5 4':null}},onEachFeature:(f,l)=>{const p=f.properties,id=view==='neighbourhoods'?p.id:p.grid_id,name=view==='cells'?(cellLabels[id]||p.neighbourhood_name||'Boundary cell'):(p.neighbourhood_name||'Boundary cell');l.bindTooltip(name,{permanent:id===selected,direction:'top'});l.on('click',()=>parent.postMessage({type:'ranking-select',id},'*'))}}).addTo(map);if(layer.getBounds().isValid()){const fit=()=>{map.invalidateSize({pan:false});map.fitBounds(layer.getBounds(),{padding:[20,20],animate:false})};requestAnimationFrame(fit);new ResizeObserver(fit).observe(document.getElementById('map'))}});</script></body></html>`,
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
    [city, setCity] = useState<City>("Brussels"),
    [scenario, setScenario] = useState<Scenario>("priority_vulnerability_informed"),
    [comparison, setComparison] = useState<Scenario>("priority_consensus"),
    [view, setView] = useState<ViewMode>("neighbourhoods"),
    [showDetails, setShowDetails] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    Promise.all(["grid_priority.geojson", "neighbourhood_priority.json", "social_diagnostic.json", "social_neighbourhoods.json"].map(name => fetch(`/data/${name}`).then(r => { if (!r.ok) throw new Error(name); return r.json(); })))
      .then(([grid, neighbourhoods, social, socialAreas]: any[]) => {
        mergeSocialOverlay(grid.features, social);
        const byId = new Map<string, object>(socialAreas.map((r: any) => [r.id, r]));
        for (const row of neighbourhoods.rows) Object.assign(row, byId.get(row.id));
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
            "mean_population_exposure",
            "mean_summer_lst_c", "age65_population_share_pct", "one_person_household_share_pct", "social_score", "social_area_coverage_pct",
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
            "population_exposure",
            "summer_lst_c", "age65_population_share_pct", "one_person_household_share_pct", "social_score",
          ];
    const body =
      view === "neighbourhoods"
        ? neighbourhoodRows.map((r) => [
            summaryRanks.get(r.id) ?? "",
            summaryRanks.has(r.id) && previousSummaryRanks.has(r.id)
              ? Number(previousSummaryRanks.get(r.id)) - Number(summaryRanks.get(r.id))
              : "",
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
            r.population.toFixed(0),
            r.lst == null ? "" : r.lst.toFixed(1), r.age65 ?? "", r.onePerson ?? "", r.social, r.socialCoverage,
          ])
        : cellRows.map((f) => {
            const p = f.properties,
              id = String(p.grid_id);
            return [
              cellRanks.get(id),
              (previousCellRanks.has(id) && cellRanks.has(id) ? Number(previousCellRanks.get(id)) - Number(cellRanks.get(id)) : ""),
              movementReason(
                {
                  surface: Number(p.score_impervious),
                  green: Number(p.score_green_deficit),
                  population: Number(p.score_population),
                  social: Number(p.social_diagnostic ?? 0),
                },
                scenario,
                comparison,
              ),
              p.neighbourhood_name || "Boundary cell",
              id,
              Number(p[scenario]).toFixed(1),
              Number(p.score_impervious).toFixed(0),
              Number(p.score_green_deficit).toFixed(0),
              Number(p.score_population).toFixed(0),
              p.summer_lst_median_c == null ? "" : Number(p.summer_lst_median_c).toFixed(1), p.age65_pct ?? "", p.one_person_pct ?? "", p.social_diagnostic ?? "",
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
            <small>{excludedNeighbourhoodCount} additional official units shown but excluded for insufficient mapped or social coverage</small>
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
          {(Object.keys(SCENARIOS) as Scenario[]).map((x) => (
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
              between cities. Use the common 500 m cell view for cross-city spatial comparison.
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
      <section className="report-note">
        <div>
          <span>Selected weights</span>
          <strong>{SCENARIOS[scenario].weights}</strong>
        </div>
        <p>{SCENARIOS[scenario].interpretation}</p>
        <small>
          Rank movement compares this selection with the previously selected policy logic:{" "}
          {SCENARIOS[comparison].title}. On first load, vulnerability-informed priorities are compared with the four-scenario population-based median.
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
                    <ColumnHelp label="Mean population">
                      <b>Area-weighted population exposure</b>
                      <span>
                        Overlap-area-weighted mean of cell-level population-exposure scores; not
                        total neighbourhood population.
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
                  <th>Age 65+ share (%)</th><th>One-person households (%)</th><th>Social score (0–100)</th>
                </tr>
              </thead>
              <tbody>
                {neighbourhoodRows.map((r) => {
                  const currentRank = summaryRanks.get(r.id),
                    previousRank = previousSummaryRanks.get(r.id);
                  const delta =
                    currentRank !== undefined && previousRank !== undefined
                      ? previousRank - currentRank
                      : null;
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
                      <td>{r.population.toFixed(0)}</td>
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
                      <td>{r.age65 == null ? "—" : r.age65.toFixed(1)}</td>
                      <td>{r.onePerson == null ? "—" : r.onePerson.toFixed(1)}</td>
                      <td>{r.socialCoverage > 0 ? r.social.toFixed(1) : "—"}<small>Social coverage {r.socialCoverage.toFixed(0)}%</small></td>
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
                        and population exposure; the vulnerability-informed scenario also includes age 65+ and one-person household shares.
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
                    <ColumnHelp label="Population">
                      <b>Population exposure</b>
                      <span>
                        A within-city 0–100 score derived from JRC GHSL population density for 2020.
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
                  <th>Age 65+ share (%)</th><th>One-person households (%)</th><th>Social score (0–100)</th>
                </tr>
              </thead>
              <tbody>
                {cellRows.map((f) => {
                  const p = f.properties,
                    id = String(p.grid_id),
                    delta = (previousCellRanks.has(id) && cellRanks.has(id) ? Number(previousCellRanks.get(id)) - Number(cellRanks.get(id)) : NaN);
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
                  social: Number(p.social_diagnostic ?? 0),
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
                      <td>{Number(p.score_population).toFixed(0)}</td>
                      <td>
                        {p.summer_lst_median_c == null
                          ? "—"
                          : `${Number(p.summer_lst_median_c).toFixed(1)} °C`}
                      </td>
                      <td>{id}</td>
                      <td>{p.age65_pct == null ? "—" : Number(p.age65_pct).toFixed(1)}</td>
                      <td>{p.one_person_pct == null ? "—" : Number(p.one_person_pct).toFixed(1)}</td>
                      <td>{p.social_diagnostic == null ? "—" : Number(p.social_diagnostic).toFixed(1)}</td>
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
            The ranking does not fully measure health, income, housing quality, land feasibility,
            displacement risk or residents’ preferences. Landsat records land-surface—not
            air—temperature.
          </p>
        </div>
        <div>
          <span>Sources · physical data 2020–2023 · social data 2025</span>
          <p>
            ESA WorldCover 2021 · Copernicus Imperviousness 2021 · JRC GHSL population 2020 ·
            Landsat 8/9 JJA 2019–2023 · CBS 2025 · IBSA 2025 · PDOK / perspective.brussels.
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
              Rank movement exposes the effect of policy weights. It does not identify a politically
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
