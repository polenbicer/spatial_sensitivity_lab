"use client";
import { useEffect, useMemo, useState } from "react";

type City = "Amsterdam" | "Brussels";
type Scenario =
  | "priority_consensus"
  | "priority_balanced"
  | "priority_population_led"
  | "priority_surface_led"
  | "priority_nature_deficit_led"
  | "priority_vulnerability_informed";
type Feature = {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, string | number | null>;
};
type Collection = { type: "FeatureCollection"; features: Feature[] };

const CITIES: City[] = ["Brussels", "Amsterdam"];
const SCENARIOS: Record<Scenario, { title: string; weights: string; note: string }> = {
  priority_consensus: {
    title: "Scenario median",
    weights: "Median of four scenarios",
    note: "A statistical median across four policy logics—not a political or public consensus. An analyst seeking a compromise summary might defend this choice.",
  },
  priority_balanced: {
    title: "Balanced proxy weighting",
    weights: "40% surface · 30% green deficit · 30% population",
    note: "Distributes attention across three mapped proxies. Equal treatment of indicators is not, by itself, a complete theory of distributive justice. A planner seeking balance among mapped environmental and exposure proxies might defend it.",
  },
  priority_population_led: {
    title: "Population-led",
    weights: "25% surface · 20% green deficit · 55% population",
    note: "Prioritises where more residents are potentially exposed. A decision-maker aiming to reach the largest number of people might defend it.",
  },
  priority_surface_led: {
    title: "Surface-led",
    weights: "60% surface · 20% green deficit · 20% population",
    note: "Prioritises sealed and impervious urban surfaces. An infrastructure or heat-mitigation programme focused on physical surfaces might defend it.",
  },
  priority_nature_deficit_led: {
    title: "Nature-deficit-led",
    weights: "25% surface · 55% green deficit · 20% population",
    note: "Prioritises the greatest relative shortage of cooling green cover. A green-infrastructure equity programme might defend it.",
  },
  priority_vulnerability_informed: {
    title: "Vulnerability-informed",
    weights: "30% surface · 20% green deficit · 20% population · 30% social diagnostic",
    note: "Adds age 65+ and one-person household shares. A policy coalition seeking to account for social exposure might defend this weighting. Cells lacking both social measures remain unscored.",
  },
};
const SOURCES = [
  ["Brussels social indicators", "IBSA Monitoring des Quartiers · 65+ and one-person households 2025; median taxable income 2023 (diagnostic)", "https://monitoringdesquartiers.brussels/indicateurs"],
  ["Brussels neighbourhood boundaries", "IBSA / perspective.brussels via Brussels Open Data · CC0 1.0", "https://opendata.brussels.be/explore/dataset/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/"],
  ["Amsterdam social indicators", "CBS Kerncijfers wijken en buurten 2025", "https://www.cbs.nl/nl-nl/cijfers/detail/86165NED"],
  [
    "Amsterdam boundaries",
    "PDOK · Administrative Areas",
    "https://www.pdok.nl/introductie/-/article/bestuurlijke-gebieden",
  ],
  [
    "Brussels boundaries",
    "Brussels UrbIS open data",
    "https://datastore.brussels/web/urbis-download",
  ],
  ["Land cover", "ESA WorldCover 2021 · 10 m", "https://worldcover2021.esa.int/"],
  [
    "Imperviousness",
    "Copernicus HRL 2021 · 10 m",
    "https://land.copernicus.eu/en/products/high-resolution-layer-imperviousness/imperviousness-density-2021",
  ],
  ["Population", "JRC GHSL GHS-POP 2020 · 100 m", "https://data.jrc.ec.europa.eu/collection/ghsl"],
  [
    "Surface temperature",
    "Landsat 8/9 C2 L2 · JJA 2019–2023",
    "https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2",
  ],
];
function colour(v: number | null) {
  return v == null
    ? "#777"
    : v < 20 ? "#440154" : v < 40 ? "#3b528b" : v < 60 ? "#21918c" : v < 80 ? "#5ec962" : "#8a7300";
}

function MapFrame({
  city,
  scenario,
  showDiagnostic,
  selected,
  onSelect,
}: {
  city: City;
  scenario: Scenario;
  showDiagnostic: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;margin:0}.leaflet-container{font:13px Arial,sans-serif;background:#dce3df}.leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0}.legend{background:#fff;border:1px solid #111;padding:9px;line-height:19px}.legend i{display:inline-block;width:14px;height:14px;margin-right:7px;vertical-align:-2px}</style></head><body><div id="map"></div><script>
 const city=${JSON.stringify(city)},field=${JSON.stringify(scenario)},diagnostic=${JSON.stringify(showDiagnostic)},selected=${JSON.stringify(selected)};const map=L.map('map',{zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
 Promise.all([fetch('/data/grid_priority.geojson').then(r=>{if(!r.ok)throw Error('grid');return r.json()}),fetch('/data/project_context.geojson').then(r=>{if(!r.ok)throw Error('context');return r.json()}),fetch('/data/social_diagnostic.json').then(r=>{if(!r.ok)throw Error('social');return r.json()})]).then(([grid,projects,social])=>{const byId=new Map(social.map(r=>[r[0],r]));for(const f of grid.features){const r=byId.get(f.properties.grid_id);if(r){['age65_pct','one_person_pct','median_taxable_income_eur','social_diagnostic','priority_vulnerability_informed','age65_pct_covered_area_pct','one_person_pct_covered_area_pct','social_overlap_count'].forEach((k,i)=>f.properties[k]=r[i+1])}}const vals=[['#440154','0–20'],['#3b528b','20–40'],['#21918c','40–60'],['#5ec962','60–80'],['#fde725','80–100']];const layer=L.geoJSON(grid,{filter:f=>f.properties.city===city,style:f=>{const v=diagnostic?f.properties.social_diagnostic:f.properties[field],c=v==null?'#777':v<20?'#440154':v<40?'#3b528b':v<60?'#21918c':v<80?'#5ec962':'#fde725';return{fillColor:c,fillOpacity:f.properties.eligible?.76:.35,color:f.properties.grid_id===selected?'#111':'rgba(255,255,255,.72)',weight:f.properties.grid_id===selected?3:.55}},onEachFeature:(f,l)=>{const p=f.properties,v=diagnostic?p.social_diagnostic:p[field];l.bindPopup('<b>'+(p.neighbourhood_name||'500 m cell')+'</b><br>'+(diagnostic?'Social diagnostic':'Priority')+' '+(v==null?'No data':Number(v).toFixed(1)+'/100')+'<br>Surface pressure '+fmt(p.score_impervious)+'<br>Green deficit '+fmt(p.score_green_deficit)+'<br>Population exposure '+fmt(p.score_population)+'<br>Age 65+ '+percent(p.age65_pct)+'<br>One-person households '+percent(p.one_person_pct)+'<br>Social diagnostic '+fmt(p.social_diagnostic)+'<br>Summer surface temperature '+(p.summer_lst_median_c==null?'Not available':Number(p.summer_lst_median_c).toFixed(1)+' °C')+'<br>Top-quintile scenarios '+(p.top20_scenario_count??'—')+'/4');l.on('click',()=>parent.postMessage({type:'grid-select',id:p.grid_id},'*'));l.on('add',()=>{const el=l.getElement();if(el){el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',(p.neighbourhood_name||'Grid cell')+' '+(v==null?'no data':Number(v).toFixed(1)+' out of 100'));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();l.openPopup();parent.postMessage({type:'grid-select',id:p.grid_id},'*')}})}})}}).addTo(map);map.fitBounds(layer.getBounds(),{padding:[12,12]});L.geoJSON(projects,{filter:f=>f.properties.city===city,style:{color:'#5b22b4',weight:3,fillOpacity:.06,dashArray:'7 4'}}).addTo(map);const legend=L.control({position:'bottomright'});legend.onAdd=()=>{const d=L.DomUtil.create('div','legend');d.innerHTML='<b>'+(diagnostic?'Social diagnostic':'Relative priority')+'</b><br>'+vals.map(x=>'<i style="background:'+x[0]+'"></i>'+x[1]).join('<br>');return d};legend.addTo(map)}).catch(()=>{document.getElementById('map').textContent='Map data could not be loaded. Refresh the page to retry.'});function fmt(v){return v==null?'No data':Number(v).toFixed(0)+'/100'}function percent(v){return v==null?'No data':Number(v).toFixed(1)+'%'}
 </script></body></html>`
        .replace("Top-quintile scenarios", "Scenarios scoring ≥80")
        .replaceAll("#f07a4b", "#5ec962"),
    );
  }, [city, scenario, showDiagnostic, selected]);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.data?.type === "grid-select") onSelect(e.data.id);
    };
    addEventListener("message", h);
    return () => removeEventListener("message", h);
  }, [onSelect]);
  return <iframe title={`${city} urban cooling priority map`} srcDoc={html} />;
}

export default function ResearchInterface() {
  const [city, setCity] = useState<City>("Brussels"),
    [scenario, setScenario] = useState<Scenario>("priority_consensus"),
    [comparisonScenario, setComparisonScenario] = useState<Scenario>("priority_population_led"),
    [data, setData] = useState<Collection | null>(null),
    [evidence, setEvidence] = useState<any>(null),
    [selected, setSelected] = useState(""),
    [showDiagnostic, setShowDiagnostic] = useState(false),
    [challengeReason, setChallengeReason] = useState(""),
    [challengeRecorded, setChallengeRecorded] = useState(false),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/data/grid_priority.geojson").then((r) => {
        if (!r.ok) throw new Error("grid");
        return r.json() as Promise<Collection>;
      }),
      fetch("/data/social_diagnostic.json").then((r) => {
        if (!r.ok) throw new Error("social");
        return r.json() as Promise<Array<Array<string | number | null>>>;
      }),
      fetch("/data/evidence.json").then((r) => {
        if (!r.ok) throw new Error("evidence");
        return r.json();
      }),
    ])
      .then(([g, social, e]) => {
        const byId = new Map(social.map((row) => [String(row[0]), row]));
        const fields = ["age65_pct", "one_person_pct", "median_taxable_income_eur", "social_diagnostic", "priority_vulnerability_informed", "age65_pct_covered_area_pct", "one_person_pct_covered_area_pct", "social_overlap_count"];
        for (const feature of g.features) {
          const row = byId.get(String(feature.properties.grid_id));
          if (row) fields.forEach((field, i) => { feature.properties[field] = row[i + 1] as number | null; });
        }
        setData(g);
        setEvidence(e);
      })
      .catch(() => setLoadError("Spatial data could not be loaded. Please refresh the page."));
  }, []);
  const cells = useMemo(
    () => data?.features.filter((f) => f.properties.city === city) ?? [],
    [data, city],
  );
  const eligible = useMemo(
    () =>
      cells
        .filter((f) => f.properties.eligible && f.properties[scenario] != null)
        .sort(
          (a, b) => Number(b.properties[scenario] ?? -1) - Number(a.properties[scenario] ?? -1),
        ),
    [cells, scenario],
  );
  const active = cells.find((f) => f.properties.grid_id === selected) ?? eligible[0],
    ranked = eligible.slice(0, 6),
    p = active?.properties;
  const comparisonRows = useMemo(() => {
    const usable = cells.filter((f) => f.properties.eligible && f.properties[scenario] != null && f.properties[comparisonScenario] != null);
    const rank = (field: Scenario) =>
      new Map(
        [...usable]
          .sort((a, b) => Number(b.properties[field]) - Number(a.properties[field]))
          .map((f, i) => [String(f.properties.grid_id), i + 1]),
      );
    const left = rank(scenario), right = rank(comparisonScenario);
    return usable
      .map((f) => {
        const id = String(f.properties.grid_id), a = left.get(id) ?? 0, b = right.get(id) ?? 0;
        return { id, name: String(f.properties.neighbourhood_name || "Boundary cell"), a, b, shift: a - b };
      })
      .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))
      .slice(0, 6);
  }, [cells, scenario, comparisonScenario]);
  const metric = evidence?.ml_validation_metrics?.find((x: any) => x.city === city),
    scale = evidence?.scale_sensitivity_metrics?.find((x: any) => x.city === city),
    socialSensitivity = evidence?.social_sensitivity_metrics?.find((x: any) => x.city === city);
  return (
    <main className="site-shell">
      <section className="intro" id="top">
        <header className="site-header">
          <a className="hero-brand" href="#top">SPATIAL SENSITIVITY LAB</a>
          <a className="hero-credit" href="https://polenbicer.dev">POLENBICER.DEV</a>
        </header>

        <div className="hero-register">
          <p>[AMS] [+] &nbsp; [BRU] [+]</p>
          <p>URBAN COOLING &nbsp; 500 M CELLS</p>
          <p>[2026] &nbsp; [RESEARCH INTERFACE]</p>
        </div>

        <nav className="hero-nav" aria-label="Primary navigation">
          <a href="#explore">[01] EXPLORE</a>
          <a href="/rankings">[02] RANKINGS</a>
          <a href="#evidence">[03] EVIDENCE</a>
          <a href="#method">[04] METHOD</a>
          <a href="#participation">[05] DEMOCRACY</a>
          <a href="#legitimacy">[06] LEGITIMACY</a>
          <a href="#opendata">[07] DATA</a>
          <a href="#procurement">[08] FURTHER STAGES</a>
          <a href="/methods.html">METHODS & REPRODUCIBILITY</a>
        </nav>

        <div className="diagram-field" aria-hidden="true">
          <img className="reference-drawing topo-drawing" src="/topography-reference.svg" alt="" />
          <img className="reference-drawing synoptic-drawing" src="/synoptic-reference.svg" alt="" />
          <div className="diagram-grid grid-a" />
          <div className="diagram-grid grid-b" />
          <div className="measure measure-x">734 CELLS / PRIORITY SURFACE</div>
          <div className="measure measure-y">NEED → EVIDENCE → PRIORITY</div>
        </div>

        <div className="hero-title">
          <span>SPATIAL</span>
          <strong>SENSITIVITY</strong>
          <span>LAB</span>
        </div>
      </section>
      <section className="research-frame">
        <p className="eyebrow">Who Is Prioritized? The Politics of Data-Driven Urban Cooling and Territorial Governance in Brussels and Amsterdam</p>
        <p>Extreme heat forces cities to decide where limited adaptation resources should go. Spatial priorities depend on choices about indicators, data gaps, spatial units and weights. Who has the authority to define public need?</p>
        <p className="eyebrow">Research question</p>
        <h2>
          How do data-driven approaches translate contested understandings of urban cooling need into spatial and institutional priorities, and under what conditions can this process be considered democratically legitimate?
        </h2>
        <p>The question is examined through Brussels and Amsterdam.</p>
        <div className="research-subquestions"><p><b>01 · Value sensitivity</b> How do the selection and weighting of available indicators change spatial priority rankings in Brussels and Amsterdam, and which areas are most affected?</p><p><b>02 · Decision chain</b> How are cooling needs and spatial priorities defined, interpreted and justified within the relevant institutions? At which stages do contestable choices become difficult to revise?</p><p><b>03 · Democratic legitimacy</b> Whose knowledge can influence these choices, what opportunities exist to question or contest them, and what conditions of justification, participation and responsibility should govern the use of spatial priorities?</p></div>
      </section>
      <section className="workspace" id="explore">
        <aside className="controls">
          <p className="eyebrow">01 · City</p>
          <div className="segmented">
            {CITIES.map((x) => (
              <button
                className={x === city ? "active" : ""}
                onClick={() => {
                  setCity(x);
                  setSelected("");
                }}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <p className="eyebrow">02 · Policy logic</p>
          <div className="scenario-list">
            {(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
              <button
                className={k === scenario ? "active" : ""}
                onClick={() => setScenario(k)}
                key={k}
              >
                <b>{SCENARIOS[k].title}</b>
                <span>{SCENARIOS[k].weights}</span>
              </button>
            ))}
          </div>
          <label className="diagnostic-toggle"><input type="checkbox" checked={showDiagnostic} onChange={(e) => setShowDiagnostic(e.target.checked)} /> Show social diagnostic layer (65+ and one-person households)</label>
          <div className="policy-note">
            <b>{SCENARIOS[scenario].title}</b>
            <p>{SCENARIOS[scenario].note}</p>
            <small>Weights change the political definition of priority—not its objectivity.</small>
          </div>
        </aside>
        <div className="map-wrap">
          <div className="panel-head">
            <span>500 m decision surface</span>
            <span>
              {data ? `${cells.length} cells · ${showDiagnostic ? "social diagnostic" : "within-city scores"}` : "Loading spatial evidence…"}
            </span>
          </div>
          {loadError ? (
            <div className="load-state error">{loadError}</div>
          ) : !data ? (
            <div className="load-state">Loading spatial evidence…</div>
          ) : (
            <MapFrame
              city={city}
              scenario={scenario}
              showDiagnostic={showDiagnostic}
              selected={String(p?.grid_id ?? "")}
              onSelect={setSelected}
            />
          )}
        </div>
        <aside className="decision-rail">
          {!data ? (
            <div className="load-copy">Results appear after the verified spatial files load.</div>
          ) : (
            <>
              <section className="inspect">
                <p className="eyebrow">Selected cell</p>
                <div className="inspect-title">
                  <h2>{String(p?.neighbourhood_name || "Highest-ranked cell")}</h2>
                  <div className="score" style={{ color: colour(Number(p?.[scenario] ?? 0)) }}>
                    {p?.[scenario] == null ? "N/A" : Number(p[scenario]).toFixed(1)}
                    <small>/100</small>
                  </div>
                </div>
                {[
                  ["Surface pressure", "score_impervious"],
                  ["Green deficit", "score_green_deficit"],
                  ["Population exposure", "score_population"],
                  ["Social diagnostic", "social_diagnostic"],
                ].map(([label, key]) => (
                  <div className="meter" key={key}>
                    <span>
                      {label}
                      <b>{p?.[key] == null ? "N/A" : Number(p[key]).toFixed(0)}</b>
                    </span>
                    <i>
                      <u style={{ width: `${Number(p?.[key] ?? 0)}%` }} />
                    </i>
                  </div>
                ))}
                <dl>
                  <div>
                    <dt>Age 65+ · one-person households</dt>
                    <dd>{p?.age65_pct == null ? "N/A" : `${Number(p.age65_pct).toFixed(1)}%`} · {p?.one_person_pct == null ? "N/A" : `${Number(p.one_person_pct).toFixed(1)}%`}</dd>
                  </div><div><dt>Summer LST</dt>
                    <dd>
                      {p?.summer_lst_median_c == null
                        ? "—"
                        : `${Number(p.summer_lst_median_c).toFixed(1)} °C`}
                    </dd>
                  </div>
                  <div>
                    <dt>Scenarios scoring ≥80</dt>
                    <dd>{String(p?.score_ge_80_scenario_count ?? "—")} / 4</dd>
                  </div>
                  <div>
                    <dt>Weight sensitivity</dt>
                    <dd>{p?.priority_range == null ? "—" : Number(p.priority_range).toFixed(1)}</dd>
                  </div>
                </dl>
              </section>
              <section className="rank-rail">
                <header>
                  <p className="eyebrow">Highest mapped need</p>
                  <span>Cells, not neighbourhood verdicts</span>
                </header>
                <ol>
                  {ranked.map((f, i) => (
                    <li key={String(f.properties.grid_id)}>
                      <button
                        className={
                          String(f.properties.grid_id) === String(p?.grid_id) ? "active" : ""
                        }
                        onClick={() => setSelected(String(f.properties.grid_id))}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <b>{String(f.properties.neighbourhood_name || "Boundary cell")}</b>
                        <strong>{Number(f.properties[scenario]).toFixed(1)}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </aside>
      </section>
      <section className="evidence" id="evidence">
        <div>
          <p className="eyebrow">Independent thermal validation</p>
          <h2>Does the model correspond to observed heat?</h2>
          <p>
            Random Forest predicts Landsat summer land-surface temperature from sealed surface,
            cooling green, trees, grass, water and population density. Validation uses five-fold
            spatial blocks, not random cell splits.
          </p>
          {metric && <p>Spatially blocked validation explains {(metric.r2_spatial_cv * 100).toFixed(1)}% of observed temperature variation (R² {metric.r2_spatial_cv.toFixed(3)}); MAE is {metric.mae_c_spatial_cv.toFixed(2)} °C versus {metric.baseline_mae_c.toFixed(2)} °C for the baseline. These are within-city prediction metrics.</p>}
          {!metric && (loadError || evidence) && <p role="alert">Thermal validation metrics are unavailable for this city.</p>}
          <blockquote>
            This validates thermal association—not distributive justice, policy legitimacy, the
            selected weights or an investment decision.
          </blockquote>
        </div>
        <div className="metric-grid" aria-label="Model validation metrics">
          <article tabIndex={0} data-explain="Share of spatial variation in observed summer surface temperature explained by the model during blocked cross-validation. Values closer to 1 indicate a stronger fit.">
            <span>Spatial CV R²</span>
            <strong>{metric?.r2_spatial_cv?.toFixed(3) ?? "Unavailable"}</strong>
            <small>Explained spatial variation · higher is better</small>
          </article>
          <article tabIndex={0} data-explain="The model's average prediction error in degrees Celsius on spatial blocks it did not train on. Lower values indicate more accurate temperature estimates.">
            <span>Mean absolute error</span>
            <strong>{metric ? `${metric.mae_c_spatial_cv.toFixed(2)} °C` : "Unavailable"}</strong>
            <small>Average model error · lower is better</small>
          </article>
          <article tabIndex={0} data-explain="The average error produced by a simple reference prediction without the Random Forest model. It provides the benchmark the model must improve upon.">
            <span>Baseline MAE</span>
            <strong>{metric ? `${metric.baseline_mae_c.toFixed(2)} °C` : "Unavailable"}</strong>
            <small>Reference error without the model</small>
          </article>
          <article tabIndex={0} data-explain="Spearman correlation between priority rankings calculated with 500 metre and 1 kilometre grids. Values closer to 1 mean rankings change less when spatial scale changes.">
            <span>500 m ↔ 1 km rank correlation</span>
            <strong>{scale?.spearman_priority_500m_vs_1km?.toFixed(3) ?? "Unavailable"}</strong>
            <small>Ranking stability across grid scales · higher is steadier</small>
          </article>
        </div>
      </section>
      <section className="blindspot">
        <p className="eyebrow">What the map cannot see</p>
        <h2>Social indicators reveal another view of need.</h2>
        <div>
          <p>
            Both cities now show a diagnostic layer combining 65+ population and one-person household shares. Brussels uses IBSA 2025; Amsterdam uses CBS 2025. This is not a complete social vulnerability index.
          </p>
          <p>
            IBSA age and household measures are transferred from neighbourhoods to 500 m cells by polygon overlap area. Median taxable income (2023) is recorded separately, not treated as a directly comparable household income measure or included in the new weighting.
          </p>
          <p>
            Health, housing quality and residents’ situated knowledge remain outside the index. Park and industrial neighbourhoods with suppressed or unavailable IBSA values leave some cells without a social score; partial intersections may mix distinct local conditions.
          </p>
        </div>
      </section>
      <section className="data-legibility" aria-labelledby="legibility-title">
        <header>
          <p className="eyebrow">Data legibility audit</p>
          <h2 id="legibility-title">What is included in this release?</h2>
          <p>Included does not mean complete; unavailable does not mean unimportant.</p>
        </header>
        <div className="legibility-table" role="table" aria-label="Data availability by city">
          <div className="legibility-row head" role="row">
            <b role="columnheader">Dimension</b><b role="columnheader">Brussels</b><b role="columnheader">Amsterdam</b>
          </div>
          {[
            ["Sealed surface", "Included", "Included"],
            ["Cooling green", "Included", "Included"],
            ["Population exposure", "Included", "Included"],
            ["Observed summer surface heat", "Included", "Included"],
            ["Age 65+ / one-person households", "Included (IBSA 2025); some cells unscored", "Included (CBS 2025); some cells unscored"],
            ["Income", "IBSA median taxable income 2023: diagnostic metadata only", "CBS income differs in definition; not in this scenario"],
            ["Health", "Availability and spatial comparability to verify", "Not represented in this release"],
            ["Housing quality", "Availability and spatial comparability to verify", "Not represented in this release"],
            ["Residents’ situated knowledge", "Not yet represented", "Not yet represented"],
          ].map(([dimension, brussels, amsterdam]) => (
            <div className="legibility-row" role="row" key={dimension}>
              <span role="cell">{dimension}</span><span role="cell">{brussels}</span><span role="cell">{amsterdam}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="scenario-comparator" aria-labelledby="compare-title">
        <header>
          <p className="eyebrow">Compare value choices</p>
          <h2 id="compare-title">The same city. Different priorities.</h2>
        <p>A sensitivity analysis of available indicators and weights. Largest cell-level rank movements between the active logic and another scenario.</p>
        </header>
        <div className="compare-controls">
          <label>Active logic<strong>{SCENARIOS[scenario].title}</strong></label>
          <label>
            Compare with
            <select value={comparisonScenario} onChange={(e) => setComparisonScenario(e.target.value as Scenario)}>
              {(Object.keys(SCENARIOS) as Scenario[]).filter((key) => key !== scenario).map((key) => (
                <option key={key} value={key}>{SCENARIOS[key].title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="compare-list">
          {comparisonRows.map((row) => (
            <article key={row.id}>
              <b>{row.name}</b>
              <span>#{row.a} → #{row.b}</span>
              <strong className={row.shift > 0 ? "up" : "down"}>{row.shift > 0 ? `+${row.shift}` : row.shift}</strong>
            </article>
          ))}
        </div>
        {socialSensitivity && <p>Balanced versus vulnerability-informed on {socialSensitivity.n_complete_cells} complete cells: Spearman ρ {socialSensitivity.spearman_balanced_vs_vulnerability}; Kendall τ {socialSensitivity.kendall_balanced_vs_vulnerability}; top 20% overlap {(socialSensitivity.top20_overlap_fraction * 100).toFixed(1)}%. Rank comparisons above use only cells scored in both selected scenarios.</p>}
        <p className="comparison-foot">Movement is evidence of value sensitivity, not evidence that either scenario is politically correct.</p>
      </section>
      <section className="case-note">
        <div>
          <p className="eyebrow">Why two cities?</p>
          <h2>Cases, not a league table.</h2>
        </div>
        <div>
          <p>
            Amsterdam and Brussels test the same analytical framework in different data and
            governance environments. The project does not rank which city governs better.
          </p>
          <p>
            The two cities provide distinct institutional settings for examining these judgments. The aim is to develop and assess an argument about democratic legitimacy using empirical evidence. The prototype is a critical research instrument, not a representation of either city’s existing decision system or an account of actual public spending.
          </p>
        </div>
      </section>
      <section className="ai-role">
        <div>
          <p className="eyebrow">Where is AI?</p>
          <h2>Validation is not authorization.</h2>
        </div>
        <div>
          <p>
            Machine learning tests whether environmental indicators correspond to observed summer
            surface temperature. The priority index itself is a transparent multi-criteria analysis.
          </p>
          <p>
            Neither component determines a legitimate distribution of public resources. Predictive
            accuracy can support evidence, but it cannot choose policy values, replace participation
            or settle contested claims of need.
          </p>
        </div>
      </section>
      <section className="research-bridge" aria-label="AI governance and the political question">
        <article id="ai-governance">
          <p className="eyebrow">AI governance in context</p>
          <h2>What rules should govern a tool that informs a public decision?</h2>
          <p>This prototype is not a municipal AI system. Its priority rankings come from explicit indicators and weights; machine learning is used only to test their relationship with observed surface temperature.</p>
          <p>The research also examines <a href="https://www.amsterdam.nl/innovatie/ai-innovatie/" target="_blank" rel="noreferrer">Amsterdam’s AI vision and algorithm governance tools</a>, <a href="https://admin.be.brussels/sites/default/files/2024-10/Paradigm_livre%20blanc_2024_FR_240910.pdf" target="_blank" rel="noreferrer">Brussels’ regional AI policy documents</a>, and <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-27" target="_blank" rel="noreferrer">relevant EU rules</a>. These sources do not show that either city uses this prototype, or AI, to allocate urban cooling resources. They show how public institutions define transparency, oversight and responsibility when computational tools enter decision-making.</p>
        </article>
        <article id="political-question">
          <p className="eyebrow">When a ranking speaks for the public</p>
          <h2>Can a single score stand in for public debate?</h2>
          <p>A map can make competing needs appear to have a single answer. Yet a ranking depends on prior choices: what counts as need, whose experience becomes data, and how different needs are weighed.</p>
          <p>This research asks whether a technically persuasive ranking can come to stand in for public debate. It examines a possible connection between technocratic claims to a single correct solution and political claims to a single public interest. That connection is a question for the thesis, not a finding about Brussels or Amsterdam.</p>
          <p>The democratic test is whether a model’s choices can be explained, challenged and revised, and whether a public institution takes responsibility for decisions made with its help.</p>
        </article>
      </section>
      <section className="participation" id="participation">
        <header>
          <p className="eyebrow">Democratic participation</p>
          <h2>Who should decide the weights?</h2>
          <p>
            Heat justice, governing by indicators and democratic legitimacy meet in the question of whose knowledge can influence priorities. The study examines opportunities for affected people to question or contest choices and how institutions justify and take responsibility for decisions.
          </p>
        </header>
        <div className="decision-actors">
          {[
            ["Elected representatives", "Public mandate and political responsibility", "Risk: electoral majorities may overlook locally concentrated harms."],
            ["Technical experts", "Methodological competence and evidence appraisal", "Risk: expertise can turn contestable values into apparently necessary parameters."],
            ["Affected residents", "Situated knowledge and lived consequences", "Risk: unequal time, access and representation can shape who is heard."],
            ["Deliberative hybrid", "Shared judgement across institutions, experts and residents", "Risk: participation becomes symbolic unless it can alter indicators, weights or decisions."],
          ].map(([title, value, risk], i) => (
            <article key={title}><span>{String(i + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{value}</p><small>{risk}</small></article>
          ))}
        </div>
        <aside className="participation-question">
          <b>Research sub-question</b>
          <p>Whose knowledge can influence these choices, what opportunities exist to question or contest them, and what conditions of justification, participation and responsibility should govern the use of spatial priorities?</p>
        </aside>
      </section>
      <section className="contestability" aria-labelledby="contest-title">
        <div>
          <p className="eyebrow">Contest this classification</p>
          <h2 id="contest-title">What might this cell be missing?</h2>
          <p>This is a demonstrator of an objection route. It does not send data or contact a municipality.</p>
        </div>
        <div className="challenge-panel">
          <strong>{String(p?.neighbourhood_name || "Select a mapped cell")}</strong>
          <div className="challenge-options">
            {["Local heat experience is missing", "The indicators misrepresent need", "The weighting is unacceptable", "The proposed unit or boundary is wrong", "Residents were not involved"].map((reason) => (
              <button key={reason} className={challengeReason === reason ? "active" : ""} onClick={() => { setChallengeReason(reason); setChallengeRecorded(false); }}>{reason}</button>
            ))}
          </div>
          <button className="record-challenge" disabled={!challengeReason} onClick={() => setChallengeRecorded(true)}>Create a local challenge record</button>
          {challengeRecorded && <p className="challenge-result"><b>Challenge recorded in this browser session:</b> {challengeReason}. A legitimate operational system would now identify a responsible official, response deadline, evidence route and appeal body.</p>}
        </div>
      </section>
      <section className="method" id="method">
        <header>
          <p className="eyebrow">Method & sources</p>
          <h2>Follow every choice from source to score.</h2>
        </header>
        <div className="chain">
          {[
            ["Source", "Official boundaries and dated public datasets"],
            ["Pre-process", "Reproject, clip and align to a 500 m analytical grid"],
            ["Measure", "Surface pressure, cooling-green deficit and population exposure"],
            ["Normalise", "Convert indicators to within-city relative scores"],
            ["Weight", "Apply four environmental logics and one social diagnostic scenario"],
            ["Aggregate", "Calculate cell scores and overlap-area-weighted neighbourhood summaries"],
            ["Validate", "Test thermal association and spatial-scale sensitivity"],
            ["Interpret", "Examine institutional interpretation, feasibility, participation and intervention priorities"],
          ].map(([x, detail], i) => (
            <div key={x}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{x}</b><small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="decision-chain-research"><h3>Research decision chain</h3><ol><li>Define cooling need</li><li>Select data and indicators</li><li>Model and rank areas</li><li>Interpret spatial evidence</li><li>Set intervention priorities</li></ol><p>At each stage: who decides, what justification is visible, and who can challenge the choice? Procurement and budget decisions may follow; this study does not claim to trace them systematically.</p></div>
        <div className="sources">
          {SOURCES.map(([a, b, url]) => (
            <a href={url} target="_blank" rel="noreferrer" key={url}>
              <span>{a}</span>
              <b>{b}</b>
              <i>↗</i>
            </a>
          ))}
        </div>
        <p className="method-foot">
          Priority scores are within-city percentiles, not temperatures, uncertainty intervals or
          cross-city performance rankings. The scenario median aggregates the original four environmental scenarios; it
          reduces the influence of a single weighting scheme but does not create democratic
          consensus or a neutral result. AI is used for explainable thermal validation—not to choose policy weights
          or define justice.
        </p>
      </section>
      <section className="legitimacy" id="legitimacy">
        <header>
          <p className="eyebrow">Institutional interpretation</p>
          <h2>A ranking does not make a decision.</h2>
          <p>
            Policy and decision documents and semi-structured expert interviews will examine how institutions define cooling needs, interpret spatial evidence and set intervention priorities. The prototype exposes questions for this inquiry; its rankings are not assumed to determine actual spending, and it does not report findings from interviews that have not taken place.
          </p>
        </header>
        <div>
          {[
            ["Define need", "Who decides what counts as cooling need, and whose observations enter the record?"],
            ["Choose evidence", "Which data, indicators and spatial units are selected or left out?"],
            ["Fix weights", "Who authorises the weighting, and when can it still be revised?"],
            ["Interpret rankings", "How do officials read uncertain and incomplete spatial results alongside local knowledge?"],
            ["Set priorities", "What reasons and responsibilities connect a map to proposed interventions and routes for objection?"],
          ].map(([title, question], i) => (
            <article key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{question}</p>
            </article>
          ))}
        </div>
        <aside className="thesis-proposition">
          <b>Working thesis proposition</b>
          <p>
            The accuracy or technical performance of a ranking cannot by itself justify allocating public attention and resources according to it. Legitimacy also depends on whether the judgments behind it can be explained, informed by affected people, questioned and revised, with clear institutional responsibility for the decisions made. Evidence from both cities will develop and assess these conditions and inform a concise checklist for public authorities.
          </p>
        </aside>
      </section>
      <section className="open-data" id="opendata">
        <p className="eyebrow">Open data & assumptions</p>
        <h2>Inspect the mapped cells and validation evidence.</h2>
        <div>
          <a href="/data/grid_priority.geojson" download>
            ↓ Grid priority GeoJSON <small>Environmental grid · cite Biçer v0.3 and mapped environmental providers; source terms below.</small>
          </a>
          <a href="/data/social_diagnostic.json" download>
            ↓ Social diagnostic JSON <small>Derived cell values · IBSA/Statbel 2025 and CBS 2025, CC BY 4.0; cite Biçer v0.3 and both providers. Column order documented on the methods page.</small>
          </a>
          <a href="/data/evidence.json" download>
            ↓ Evidence metrics JSON <small>Derived metrics · cite Biçer v0.3, IBSA/Statbel and CBS; IBSA and CBS CC BY 4.0.</small>
          </a>
        </div>
        <p>Environmental grid GeoJSON: cite Biçer (2026), Spatial Sensitivity Lab v0.3 and mapped sources. Social JSON joins by grid ID and uses the column order given in Methods. Evidence JSON: cite the same release and IBSA/CBS source tables. </p><p>Source attribution and reuse terms: PDOK and UrbIS boundaries; ESA WorldCover 2021, Copernicus HRL 2021, GHSL GHS-POP 2020 and Landsat 8/9 JJA 2019–2023. Check each provider’s current licence before redistribution. The GeoJSON contains derived values; underlying imagery is not included. <a href="/methods.html">Methods, provenance and citation status</a>.</p>
        <p>
          The displayed rankings are research outputs, not administrative decisions. A narrow score
          difference is descriptive and must not be presented as a statistical confidence interval
          without a separate uncertainty analysis.
        </p>
        <p>
          Priority indicates mapped conditions for further review. It does not determine project
          suitability, intervention type, land availability, cost, ownership, displacement risk or
          residents’ preferences.
        </p>
      </section>
      <section className="procurement" id="procurement">
        <header><p className="eyebrow">08 · Possible later stages</p><h2>What happens after priorities are proposed?</h2><p>Procurement and budget decisions can later fix or alter priorities. They are prompts for further inquiry, not stages this study sets out to trace systematically. Neither city is asserted to procure this demonstrator.</p></header>
        <details className="procurement-details"><summary>Explore procurement questions and the contract clause demonstrator</summary>
        <ol className="procurement-chain">{["Data", "Indicator", "Weight", "Model", "Tender specification", "Contract", "Budget allocation", "Appeal"].map((step) => <li key={step}><b>{step}</b><small>Who decides? What is visible? Can residents challenge?</small></li>)}</ol>
        <div className="procurement-table" role="table" aria-label="Procurement comparison"><div role="row"><b role="columnheader">Question</b><b role="columnheader">Amsterdam</b><b role="columnheader">Brussels</b><b role="columnheader">Verification status</b></div>
          <div role="row"><span>Algorithm register</span><span><a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/algoritmes/">Municipal algorithm descriptions</a> are public; relevance to cooling procurement requires inquiry.</span><span>Equivalent register for this use case not established.</span><span>Verified (Amsterdam publication); To verify (Brussels)</span></div>
          <div role="row"><span>Standard procurement terms</span><span><a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/inkoopvoorwaarden-algoritmes/">Algorithmic procurement terms</a> published.</span><span>Equivalent standard terms not established.</span><span>Verified (Amsterdam publication); Interview needed (Brussels use)</span></div>
          <div role="row"><span>EU model clauses</span><span>EU full and light versions draw on Amsterdam's earlier approach; applicability depends on the system and contract.</span><span>Potential reference, with adoption unverified.</span><span>Verified (model text); Interview needed (adoption)</span></div>
        </div>
        <div className="clause-simulator"><h3>Contract clause simulator · demonstrator</h3><p>If <b>{SCENARIOS[scenario].title}</b> were fixed in a tender specification, {SCENARIOS[scenario].weights.toLowerCase()} would become a contractual baseline. A draft could require disclosure of the weights and source data, a version record for changes, independent audit access, a route for residents to challenge outputs, and a narrowly justified treatment of trade secrets. These are questions for a real procurement, not existing clauses in either city's cooling contract.</p><p>Compare the <a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/inkoopvoorwaarden-algoritmes/">Amsterdam terms</a> and <a href="https://public-buyers-community.ec.europa.eu/communities/procurement-ai/resources/updated-eu-ai-model-contractual-clauses">EU model clauses and commentary</a> for the actual wording.</p></div>
        <p><b>AI Act classification: to be assessed.</b> A transparent cooling priority index may fall outside high-risk AI categories, and the thermal validation component has a separate role. Whether the Act applies, and whether any full or light clauses are appropriate, requires expert assessment. See <a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng">Regulation (EU) 2024/1689</a>.</p>
        <p><b>If the weighting sits in a tender specification, who can still contest it?</b> Return to <a href="#participation">democratic participation</a>.</p>
        </details>
      </section>
      <footer>
        <b>Spatial Sensitivity Lab</b>
        <span>Research demonstrator · developed by Polen Biçer · 2026</span>
        <span>Not an operational allocation system</span>
      </footer>
    </main>
  );
}
