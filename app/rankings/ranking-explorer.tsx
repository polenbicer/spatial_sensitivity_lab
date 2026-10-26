"use client";
import {SCENARIOS, CITY_INCOME, INCOME_COMPARABILITY, INCOME_MEANING, cityLabel, type Scenario} from "../../lib/priority-model";
import { buildCellLabels } from "../../lib/cell-labels";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type City = "Amsterdam" | "Brussels";

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
  score_surface_temperature: number;
  score_green_deficit: number;
  score_income_deprivation: number;
  income: number | null;
  incomeEur?: number | null;
  income_median_disposable_eur?: number | null;
  income_median_equivalised_after_tax_eur?: number | null;
  land_cover_coverage_pct?: number;
  
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
  lowIncome: number;
  income: number | null;
  incomeEur: number | null;
  lst: number | null;
};

const CITIES: City[] = ["Brussels", "Amsterdam"];


function formatScore(v: number | null | undefined) { return v == null || !Number.isFinite(v) ? "—" : v.toFixed(0); }
function summarise(rows: NeighbourhoodRow[], scenario: Scenario): Summary[] {
  return rows.map((r) => ({
    id: r.id,
    code: r.neighbourhood_code,
    name: r.neighbourhood_name,
    cells: r.intersecting_eligible_cells ?? 0,
    area: r.official_area_m2,
    coverage: r.land_cover_coverage_pct ?? r.eligible_coverage_pct,
    thermalCoverage: r.thermal_coverage_pct,
    rankingEligible: r.ranking_eligible && r[scenario] != null,
    quality: r.data_quality,
    priority: r[scenario] ?? NaN,
    surface: r.score_surface_temperature,
    green: r.score_green_deficit,
    lowIncome: r.score_income_deprivation,
    income: r.score_income_deprivation ?? null,
    incomeEur: r.income_median_disposable_eur ?? r.income_median_equivalised_after_tax_eur ?? null,
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

const WEIGHTS: Partial<Record<Scenario, [number, number, number]>> = {
 priority_balanced:[.4,.3,.3], priority_income_led:[.25,.2,.55], priority_heat_led:[.6,.2,.2], priority_nature_deficit_led:[.25,.55,.2]
};
function movementReason(row: {surface: number; green: number; income?: number | null; lowIncome?: number}, current: Scenario, previous: Scenario) {
 if(row.income == null || !Number.isFinite(row.surface)) return 'No complete three-indicator score';
 if(current === previous) return 'Reference selection';
 if(!WEIGHTS[current] || !WEIGHTS[previous]) return 'Changed under the four-scenario median';
 const values=[row.surface,row.green,row.income], labels=['surface temperature','green deficit','lower median income'];
 const effects=values.map((v,i)=>v*(WEIGHTS[current]![i]-WEIGHTS[previous]![i]));
 const index=effects.map(Math.abs).indexOf(Math.max(...effects.map(Math.abs)));
 return labels[index]+(effects[index]>=0?' received more influence':' received less influence');
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
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;margin:0}.leaflet-container{background:#dbe3df;font:13px Arial}.leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0}</style></head><body><div id="map"></div><script>const cellLabels=${JSON.stringify(Object.fromEntries(cellLabels))};const city=${JSON.stringify(city)},field=${JSON.stringify(scenario)},selected=${JSON.stringify(selected)},view=${JSON.stringify(view)};const map=L.map('map',{zoomSnap:.25});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,opacity:.58}).addTo(map);fetch('${source}').then(r=>r.json()).then(data=>{const layer=L.geoJSON(data,{filter:f=>f.properties.city===city,style:f=>{const p=f.properties,v=p[field],id=view==='neighbourhoods'?p.id:p.grid_id,c=v==null?'#777':v<20?'#0878ad':v<40?'#55a8c8':v<60?'#ecebe5':v<80?'#e89b32':'#c80032';return{fillColor:c,fillOpacity:p.eligible===0||v==null?.18:.72,color:id===selected?'#111':'rgba(30,30,30,.55)',weight:id===selected?4:view==='neighbourhoods'?1.1:.45,dashArray:p.ranking_eligible===false?'5 4':null}},onEachFeature:(f,l)=>{const p=f.properties,id=view==='neighbourhoods'?p.id:p.grid_id,name=view==='cells'?(cellLabels[id]||p.neighbourhood_name||'Boundary cell'):(p.neighbourhood_name||'Boundary cell');l.bindTooltip(name,{permanent:id===selected,direction:'top'});l.on('click',()=>parent.postMessage({type:'ranking-select',id},'*'))}}).addTo(map);if(layer.getBounds().isValid()){const fit=()=>{map.invalidateSize({pan:false});map.fitBounds(layer.getBounds(),{padding:[20,20],animate:false})};requestAnimationFrame(fit);new ResizeObserver(fit).observe(document.getElementById('map'))}});</script></body></html>`,
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
    [scenario, setScenario] = useState<Scenario>("priority_balanced"),
    [comparison, setComparison] = useState<Scenario>("priority_consensus"),
    [view, setView] = useState<ViewMode>("neighbourhoods"),
    [showDetails, setShowDetails] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('city');
    if (requested === 'Amsterdam' || requested === 'Brussels') setCity(requested);
  }, []);
  useEffect(() => {
    Promise.all(["grid_priority.geojson", "neighbourhood_priority.json"].map(name => fetch(`/data/${name}`).then(r => { if (!r.ok) throw new Error(name); return r.json(); })))
      .then(([grid, neighbourhoods]: any[]) => {
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
            city === "Brussels" ? "median_equivalised_after_tax_income_eur" : "median_disposable_household_income_eur",
            "land_cover_coverage_pct",
            "thermal_coverage_pct",
            "evidence_status",
            "priority",
            "surface_temperature_score",
            "green_deficit_score",
            true ? "low_income_score" : "low_income_score",
            "summer_lst_median_c",
          ]
        : [
            "rank",
            "movement_vs_previous_logic",
            "movement_explanation",
            "neighbourhood_context",
            "cell_id",
            "priority",
            "surface_temperature_score",
            "green_deficit",
            true ? "low_income_score" : "low_income_score",
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
            r.incomeEur ?? "",
            r.coverage.toFixed(1),
            r.thermalCoverage.toFixed(1),
            r.quality,
            (Number.isFinite(r.priority) ? r.priority.toFixed(1) : ""),
            formatScore(r.surface),
            formatScore(r.green),
            true ? (r.income == null ? "" : r.income.toFixed(0)) : formatScore(r.lowIncome),
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
                  surface: Number(p.score_surface_temperature),
                  green: Number(p.score_green_deficit),
                  lowIncome: Number(p.score_income_deprivation),
                  income: p.score_income_deprivation == null ? null : Number(p.score_income_deprivation),
                },
                scenario,
                comparison,
              ),
              p.neighbourhood_name || "Boundary cell",
              id,
              Number(p[scenario]).toFixed(1),
              Number(p.score_surface_temperature).toFixed(0),
              Number(p.score_green_deficit).toFixed(0),
              true ? (p.score_income_deprivation == null ? "" : Number(p.score_income_deprivation).toFixed(0)) : Number(p.score_income_deprivation).toFixed(0),
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
          {view === "neighbourhoods" ? "neighbourhoods" : "500 m audit cells"}
        </p>
        <h1>
          {cityLabel(city)}
          <br />
          <em>{SCENARIOS[scenario].title}</em>
        </h1>
        <div>
          <b>{count}</b>
          <span>{view === "neighbourhoods" ? "neighbourhoods" : "eligible cells"} ranked</span>
          {view === "neighbourhoods" && excludedNeighbourhoodCount > 0 && (
            <small>{excludedNeighbourhoodCount} additional official areas shown but unranked; see evidence for missing data or coverage limits</small>
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
                const url = new URL(window.location.href);
                url.searchParams.set("city", x);
                window.history.replaceState(null, "", url);
                  setScenario("priority_balanced");
                setView("neighbourhoods");
                setComparison("priority_balanced");
                setQuery("");
                setSelected("");
              }}
            >
              {x === "Brussels" ? "Brussels region" : x}
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
          03 · Find a neighbourhood
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
          Neighbourhoods <small>one row per official area</small>
        </button>
        <details className="ranking-explanation">
          <summary>About these spatial units</summary>
          <p>
          {view === "neighbourhoods" ? (
            <>
              Amsterdam uses 110 official wijken valid on 24 March 2022. Income is joined directly by official code; surface temperature and green cover are calculated within these boundaries from the source rasters. Scores are normalized at neighbourhood level, then combined with the selected weights. Brussels uses 145 Monitoring des Quartiers units, with income published for 118. Its income measure differs from Amsterdam; each city is ranked independently. These geographies differ in size and should not be compared as a city league table.
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
      <div style={{padding:"0 2vw"}}><p className="scope-note">{INCOME_MEANING} Grey areas are unranked, not low priority.</p><details className="reading-detail compact"><summary>Income definition, coverage and sources</summary><div className="reading-body"><p>{CITY_INCOME[city].description}</p><p>{INCOME_COMPARABILITY}</p><a href="/methods.html">Sources and method</a></div></details></div>
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
        <p>Ranked within {cityLabel(city)} · comparison: {SCENARIOS[comparison].title}</p>
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
                        Amsterdam uses the municipality’s official wijken.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Median income (€)"><b>Published neighbourhood median income</b><span>{CITY_INCOME[city].description} Neither city’s indicator is a poverty rate. Missing remains unavailable.</span></ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Land-cover coverage">
                      <b>Eligible mapped area</b>
                      <span>
                        Share of polygon pixels with observed WorldCover land-cover data.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Priority">
                      <b>Neighbourhood composite</b>
                      <span>
                        Selected weights applied directly to three neighbourhood percentile scores.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Surface temperature score">
                      <b>Neighbourhood median surface temperature</b>
                      <span>
                        Within-city percentile of the neighbourhood’s observed median summer land-surface temperature.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Green deficit score">
                      <b>Neighbourhood green deficit</b>
                      <span>
                        Within-city percentile of neighbourhood green deficit, calculated from WorldCover tree and grass cover.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label={true ? "Lower median income score" : "Lower median income score"}>
                      <b>{true ? "Neighbourhood median-income score" : "Area-weighted lower median income"}</b>
                      <span>
                        {true ? "Inverse percentile of the published neighbourhood median income, using the definition documented for the selected city. Lower median income gives a higher score; this is not the share of low-income residents." : "Overlap-area-weighted mean of cell median-income scores; not household income measured within the cell."}
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Median summer LST">
                      <b>Neighbourhood median surface temperature</b>
                      <span>
                        Median of observed source-raster pixels inside the neighbourhood land area. This is surface temperature.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Evidence">
                      <b>Coverage warning</b>
                      <span>
                        Amsterdam requires published income, at least 99% land-cover coverage, at least 50% observed land-temperature coverage. These are analyst coverage choices.
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
                      <td>{r.incomeEur == null ? "—" : `€${r.incomeEur.toLocaleString("en-GB")}`}</td>
                      <td>{r.coverage.toFixed(0)}%</td>
                      <td>
                        <b>{(Number.isFinite(r.priority) ? r.priority.toFixed(1) : "—")}</b>
                      </td>
                      <td>{formatScore(r.surface)}</td>
                      <td>{formatScore(r.green)}</td>
                      <td>{true ? (r.income == null ? "—" : r.income.toFixed(0)) : formatScore(r.lowIncome)}</td>
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
                        A 0–100 within-city composite derived from surface temperature, green deficit and lower median income.
                      </span>
                    </ColumnHelp>
                  </th>
                  <th>
                    <ColumnHelp label="Surface">
                      <b>Observed surface temperature</b>
                      <span>
                        A within-city 0–100 percentile of observed Landsat summer surface temperature. Higher temperature gives a higher score.
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
                    <ColumnHelp label={true ? "Lower median income" : "Lower median income"}>
                      <b>{true ? "Lower income gives a higher score" : "Lower median income"}</b>
                      <span>
                        {true ? "Inverse income-proxy percentile among complete-coverage Amsterdam cells; higher means lower income. It is not a poverty rate." : "A within-city 0–100 score derived from CBS neighbourhood income for 2023."}
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
                            surface: Number(p.score_surface_temperature),
                            green: Number(p.score_green_deficit),
                            lowIncome: Number(p.score_income_deprivation),
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
                      <td>{Number(p.score_surface_temperature).toFixed(0)}</td>
                      <td>{Number(p.score_green_deficit).toFixed(0)}</td>
                      <td>{true ? (p.score_income_deprivation == null ? "—" : Number(p.score_income_deprivation).toFixed(0)) : Number(p.score_income_deprivation).toFixed(0)}</td>
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
            priority signal within {cityLabel(city)}. They do not establish that an area should automatically
            receive investment.
          </p>
        </div>
        <div>
          <span>Method</span>
          <p>
            Indicators are calculated directly for official neighbourhoods in both cities. Income is joined by code, and physical indicators come from raster pixels inside each polygon. The four weighted scores use neighbourhood percentiles.
          </p>
        </div>
        <div>
          <span>Evidence boundary</span>
          <p>
            All scenarios use lower neighbourhood median income as a relative income indicator. The income definition differs by city. The ranking does not fully measure health, housing quality, land feasibility,
            displacement risk or residents’ preferences. Landsat records land-surface—not
            air—temperature.
          </p>
        </div>
        <div>
          <span>Sources · O&S API period 2024 / IBSA income 2023</span>
          <p>
            ESA WorldCover 2021 ·
            Landsat 8/9 JJA 2019–2023 · Amsterdam O&S IHHINK_MED · IBSA/Statbel indicator 2498 · official Amsterdam 2022 and Brussels Monitoring boundaries.
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
              Neighbourhood medians and cover shares can conceal differences between streets and households. They do not describe every resident’s circumstances.
            </p>
          </article>
          <article>
            <b>03 · Boundaries shape the result</b>
            <p>
              Official neighbourhoods group continuous urban conditions. Different boundaries or spatial scales can change both indicator values and rank order.
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
