"use client";
import {SCENARIOS, CITY_INCOME, INCOME_COMPARABILITY, INCOME_MEANING, cityLabel, type Scenario} from "../lib/priority-model";
import { buildCellLabels } from "../lib/cell-labels";
import { useEffect, useMemo, useState } from "react";

type City = "Amsterdam" | "Brussels";

type Feature = {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, string | number | null>;
};
type Collection = { type: "FeatureCollection"; features: Feature[] };

const CITIES: City[] = ["Brussels", "Amsterdam"];

const SOURCES = [
  ["Brussels neighbourhood boundaries", "IBSA / perspective.brussels via Brussels Open Data · CC0 1.0", "https://opendata.brussels.be/explore/dataset/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/"],
  [
    "Amsterdam boundaries",
    "Amsterdam municipality · wijken valid on 24 March 2022",
    "https://api.data.amsterdam.nl/v1/gebieden/wijken?_format=geojson&_pageSize=1000&geldigOp=2022-03-24",
  ],
  [
    "Brussels boundaries",
    "Brussels UrbIS open data",
    "https://datastore.brussels/web/urbis-download",
  ],
  ["Land cover", "ESA WorldCover 2021 · 10 m", "https://worldcover2021.esa.int/"],
  [
    "Surface temperature",
    "Landsat 8/9 C2 L2 · JJA 2019–2023",
    "https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2",
  ],

  ["Amsterdam income · all four scenarios", "Amsterdam O&S · median disposable household income · API period 2024", "https://api.data.amsterdam.nl/v1/statistieken/v2/indicatoren?naam=IHHINK_MED"],
  ["Amsterdam income · original records", "O&S · IHHINK_MED · native neighbourhood records", "https://api.data.amsterdam.nl/v1/statistieken/v2/cijfers?indicator.id=3196&heeftBetrekkingOp=2024&_pageSize=1000"],
  ["Brussels income · all four scenarios", "IBSA/Statbel 2498 · median equivalised after-tax income · 2023", "https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet&SubTheme=28"],
  ["Brussels income · original table", "145 official areas · 118 published income observations", "https://geodata.perspective.brussels/api/geodata/mdq/table/65707/fr"],
  ["Brussels neighbourhood boundaries", "IBSA / perspective.brussels · official polygons", "https://opendata.brussels.be/explore/dataset/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/"],

];
function colour(v: number | null) {
  return v == null
    ? "#777"
    : v < 20 ? "#440154" : v < 40 ? "#3b528b" : v < 60 ? "#21918c" : v < 80 ? "#5ec962" : "#8a7300";
}

function MapFrame({
  city,
  scenario,
  selected,
  onSelect,
  cellLabels,
}: {
  city: City;
  scenario: Scenario;
  selected: string;
  onSelect: (id: string) => void;
  cellLabels: Map<string, string>;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;margin:0}.leaflet-container{font:13px Arial,sans-serif;background:#dce3df}.leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0}.legend{background:#fff;border:1px solid #111;padding:9px;line-height:19px}.legend i{display:inline-block;width:14px;height:14px;margin-right:7px;vertical-align:-2px}</style></head><body><div id="map"></div><script>
 const cellLabels=${JSON.stringify(Object.fromEntries(cellLabels))};const city=${JSON.stringify(city)},field=${JSON.stringify(scenario)},selected=${JSON.stringify(selected)};const map=L.map('map',{zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
 Promise.all([fetch('/data/neighbourhood_priority.geojson').then(r=>{if(!r.ok)throw Error('grid');return r.json()}),fetch('/data/project_context.geojson').then(r=>{if(!r.ok)throw Error('context');return r.json()})]).then(([grid,projects])=>{grid.features.forEach(f=>{f.properties.grid_id=f.properties.id;f.properties.income_proxy_eur=f.properties.income_median_disposable_eur??f.properties.income_median_equivalised_after_tax_eur;cellLabels[f.properties.id]=f.properties.neighbourhood_name});const vals=[['#440154','0–20'],['#3b528b','20–40'],['#21918c','40–60'],['#5ec962','60–80'],['#fde725','80–100']];const layer=L.geoJSON(grid,{filter:f=>f.properties.city===city,style:f=>{const v=f.properties[field],c=v==null?'#777':v<20?'#440154':v<40?'#3b528b':v<60?'#21918c':v<80?'#5ec962':'#fde725';return{fillColor:c,fillOpacity:f.properties.eligible?.76:.35,color:f.properties.grid_id===selected?'#111':'rgba(255,255,255,.72)',weight:f.properties.grid_id===selected?3:.55}},onEachFeature:(f,l)=>{const p=f.properties,v=p[field];l.bindPopup('<b>'+(cellLabels[p.grid_id]||p.neighbourhood_name||'Neighbourhood')+'</b><br>'+'Priority'+' '+(v==null?'No data':Number(v).toFixed(1)+'/100')+'<br>Surface temperature '+fmt(p.score_surface_temperature)+'<br>Green deficit '+fmt(p.score_green_deficit)+(true?'<br>Lower median income '+fmt(p.score_income_deprivation)+'<br>'+(city==='Brussels'?'Median equivalised after-tax income':'Median disposable household income')+' '+(p.income_proxy_eur==null?'Not scored':'€'+Number(p.income_proxy_eur).toLocaleString('en-GB'))+'<br>Income status '+(p.income_status||'Not available'):'<br>Lower median income '+fmt(p.score_income_deprivation))+'<br>Summer surface temperature '+(p.summer_lst_median_c==null?'Not available':Number(p.summer_lst_median_c).toFixed(1)+' °C')+'<br>Top-quintile scenarios '+(p.score_ge_80_scenario_count??'—')+'/4');l.on('click',()=>parent.postMessage({type:'grid-select',id:p.grid_id},'*'));l.on('add',()=>{const el=l.getElement();if(el){el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',(cellLabels[p.grid_id]||p.neighbourhood_name||'Neighbourhood')+' '+(v==null?'no data':Number(v).toFixed(1)+' out of 100'));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();l.openPopup();parent.postMessage({type:'grid-select',id:p.grid_id},'*')}})}})}}).addTo(map);map.fitBounds(layer.getBounds(),{padding:[12,12]});L.control.scale({imperial:false}).addTo(map);L.geoJSON(projects,{filter:f=>f.properties.city===city,style:{color:'#5b22b4',weight:3,fillOpacity:.06,dashArray:'7 4'}}).addTo(map);const legend=L.control({position:'bottomright'});legend.onAdd=()=>{const d=L.DomUtil.create('div','legend');d.innerHTML='<b>'+'Relative priority'+'</b><br>'+vals.map(x=>'<i style="background:'+x[0]+'"></i>'+x[1]).join('<br>');return d};legend.addTo(map)}).catch(()=>{document.getElementById('map').textContent='Map data could not be loaded. Refresh the page to retry.'});function fmt(v){return v==null?'No data':Number(v).toFixed(0)+'/100'}function percent(v){return v==null?'No data':Number(v).toFixed(1)+'%'}
 </script></body></html>`
        .replace("Top-quintile scenarios", "Scenarios scoring ≥80")
        .replaceAll("#f07a4b", "#5ec962"),
    );
  }, [city, scenario, selected, cellLabels]);
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
  const [city, setCity] = useState<City>("Amsterdam"),
    [scenario, setScenario] = useState<Scenario>("priority_balanced"),
    [comparisonScenario, setComparisonScenario] = useState<Scenario>("priority_income_led"),
    [data, setData] = useState<Collection | null>(null),
    [evidence, setEvidence] = useState<any>(null),
    [selected, setSelected] = useState(""),
    [challengeReason, setChallengeReason] = useState(""),
    [challengeRecorded, setChallengeRecorded] = useState(false),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/data/neighbourhood_priority.geojson").then(r => { if (!r.ok) throw new Error('neighbourhoods'); return r.json() as Promise<Collection>; }),
      fetch("/data/evidence.json").then((r) => {
        if (!r.ok) throw new Error("evidence");
        return r.json();
      }),
    ])
      .then(([g, e]) => {
        setData({...g, features:g.features.map(f => ({...f, properties:{...f.properties,grid_id:f.properties.id,income_proxy_eur:f.properties.income_median_disposable_eur ?? f.properties.income_median_equivalised_after_tax_eur}}))});
        setEvidence(e);
      })
      .catch(() => setLoadError("Spatial data could not be loaded. Please refresh the page."));
  }, []);
  useEffect(() => {
    const revealTarget = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (!target) return;
      let ancestor: HTMLElement | null = target;
      while (ancestor) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
      requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
    };
    revealTarget();
    window.addEventListener('hashchange', revealTarget);
    return () => window.removeEventListener('hashchange', revealTarget);
  }, []);
  const workedExample = useMemo(() => {
    const rows = data?.features.filter(f => f.properties.city === 'Brussels' && f.properties.eligible) ?? [];
    const selected = rows.find(f => f.properties.neighbourhood_name === 'Kapelleveld');
    if (!selected) return null;
    const rank = (field: Scenario) => 1 + rows.filter(f => Number(f.properties[field]) - Number(selected.properties[field]) > 0.000001).length;
    return {balanced: rank('priority_balanced'), income: rank('priority_income_led'), total: rows.length};
  }, [data]);
  const cellLabels = useMemo(() => buildCellLabels(data?.features ?? []), [data]);
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
    scale = evidence?.scale_sensitivity_metrics?.find((x: any) => x.city === city);
  return (
    <main className="site-shell">
      <section className="intro" id="top">
        <header className="site-header">
          <a className="hero-brand" href="#top">SPATIAL SENSITIVITY LAB</a>
          <a className="hero-credit" href="https://polenbicer.dev">POLENBICER.DEV</a>
        </header>

        <div className="hero-register">
          <p>[AMS] [+] &nbsp; [BRU] [+]</p>
          <p>URBAN COOLING &nbsp; NEIGHBOURHOOD PRIORITIES</p>
          <p>[2026] &nbsp; [RESEARCH INTERFACE]</p>
        </div>

        <nav className="hero-nav" aria-label="Primary navigation">
          <a href="#explore">[01] EXPLORE</a>
          <a href="/rankings">[02] RANKINGS</a>
          <a href="/priority-lines">[03] PRIORITY LINES</a>
          <a href="#evidence">[04] EVIDENCE</a>
          <a href="#method">[05] METHOD</a>
          <a href="#participation">[06] DEMOCRACY</a>
          <a href="#legitimacy">[07] LEGITIMACY</a>
          <a href="#opendata">[08] DATA</a>
          <a href="#procurement">[09] FURTHER STAGES</a>
          <a href="/methods.html">[10] METHODS &amp; REPRODUCIBILITY</a>
        </nav>

        <div className="diagram-field" aria-hidden="true">
          <img className="reference-drawing topo-drawing" src="/topography-reference.svg" alt="" />
          <img className="reference-drawing synoptic-drawing" src="/synoptic-reference.svg" alt="" />
          <div className="diagram-grid grid-a" />
          <div className="diagram-grid grid-b" />
          <div className="measure measure-x">NEED / SPATIAL PRIORITIES</div>
          <div className="measure measure-y">NEED → EVIDENCE → PRIORITY</div>
        </div>

        <div className="hero-title">
          <span>SPATIAL</span>
          <strong>SENSITIVITY</strong>
          <span>LAB</span>
        </div>
      </section>
      <section className="lab-chapter" id="about" aria-labelledby="about-title">
        <div className="lab-heading"><p className="eyebrow">Urban cooling · Brussels-Capital Region &amp; Amsterdam · Research demonstrator</p><h1>Who is prioritized?</h1><p>How values become spatial priorities.</p></div>
        <header className="chapter-header"><p className="eyebrow">01 · About the lab</p><h2 id="about-title">What this lab is for</h2></header>
        <p className="lab-purpose">Choose a city and change the weights given to surface temperature, green deficit and lower median income. See how neighbourhoods move in the ranking. This research prototype helps discuss the choices behind urban cooling priorities; it does not select investments.</p>
        <p className="scope-note">Brussels means the <b>Brussels-Capital Region</b>, not the City of Brussels municipality. Each city is ranked separately. Amsterdam uses 110 official wijken; Brussels uses 145 Monitoring neighbourhoods. These units are not identical in size or definition.</p>
        <details className="reading-detail"><summary>Research context and why two cities</summary><div className="reading-body">
        <p className="research-context">Spatial Sensitivity Lab is a critical research tool, rather than a proposed model for allocating urban cooling investment. Using data from Brussels and Amsterdam, it compares how different indicator weights change the priority rankings within each city. Both cities use official neighbourhood boundaries and directly calculated physical indicators. Their income definitions differ and are documented below. The scenarios make selected value priorities explicit; they do not reproduce particular political ideologies. The aim is to examine how ideological commitments and competing understandings of need can shape apparently technical decisions. This also opens a question about technopopulism: what happens when a ranking gains authority through both claims to technical expertise and claims to represent what people need? The lab makes these choices visible for explanation, debate and challenge.</p>

      <section className="case-note">
        <div>
          <p className="eyebrow">Why two cities?</p>
          <h3>Cases, not a league table.</h3>
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
        </div></details>
        <ol className="lab-instructions"><li><b>Choose a city and a scenario.</b> Each scenario assigns different weights to the available indicators.</li><li><b>Inspect the map and compare rankings.</b> Scores describe relative conditions within the selected city.</li><li><b>Examine the choices behind the result.</b> Review missing data, alternative priorities and opportunities for contestation.</li></ol>
      </section>
      <section className="lab-chapter" id="explore-chapter" aria-labelledby="explore-chapter-title">
        <header className="chapter-header"><p className="eyebrow">02 · Explore &amp; compare</p><h2 id="explore-chapter-title">Explore &amp; compare</h2><p>Choose a model, inspect a location, then compare priorities.</p></header>
      <section className="workspace" id="explore">
        <aside className="controls">
          <p className="eyebrow">01 · City</p>
          <div className="segmented">
            {CITIES.map((x) => (
              <button
                className={x === city ? "active" : ""}
                onClick={() => {
                  setCity(x);
                  setScenario("priority_balanced");
                  setSelected("");
                  setComparisonScenario("priority_balanced");
                }}
                key={x}
              >
                {x === "Brussels" ? "Brussels region" : x}
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
          <p className="scope-note"><b>{cityLabel(city)}</b> · {city === "Amsterdam" ? "official wijken" : "Monitoring neighbourhoods"}</p>
          <p className="income-meaning">{INCOME_MEANING}</p>
          <details className="reading-detail compact"><summary>Income definition, coverage and sources</summary><div className="reading-body"><p>{CITY_INCOME[city].description}</p><p>{INCOME_COMPARABILITY}</p><a href="/methods.html">Method and coverage</a></div></details>
          <div className="policy-note">
            <b>{SCENARIOS[scenario].title}</b>
            <p>{SCENARIOS[scenario].note}</p>
            <small>Weights change the political definition of priority—not its objectivity.</small>
          </div>
        </aside>
        <div className="map-wrap">
          <div className="panel-head">
            <span>{city === "Amsterdam" ? "Official wijk boundaries · 2022" : "Official Monitoring neighbourhood boundaries"}</span>
            <span>
              {data ? `${cells.length} neighbourhoods · ${eligible.length} ranked` : "Loading spatial evidence…"}
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
              selected={String(p?.grid_id ?? "")}
              onSelect={setSelected}
              cellLabels={cellLabels}
            />
          )}
        </div>
        <aside className="decision-rail">
          {!data ? (
            <div className="load-copy">Results appear after the verified spatial files load.</div>
          ) : (
            <>
              <section className="inspect">
                <p className="eyebrow">Selected area</p>
                <div className="inspect-title">
                  <h3>{cellLabels.get(String(p?.grid_id)) || "Highest-ranked neighbourhood"}</h3>
                  <div className="score" style={{ color: colour(p?.[scenario] == null ? null : Number(p[scenario])) }}>
                    {p?.[scenario] == null ? "N/A" : Number(p[scenario]).toFixed(1)}
                    <small>/100</small>
                  </div>
                </div>
                {[
                  ["Surface temperature", "score_surface_temperature"],
                  ["Green deficit", "score_green_deficit"],
                  true ? ["Lower median income", "score_income_deprivation"] : ["Lower median income", "score_income_deprivation"],
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
                  <><div><dt>{CITY_INCOME[city].label}</dt><dd>{p?.income_proxy_eur == null ? "Not scored" : `€${Number(p.income_proxy_eur).toLocaleString("en-GB")}`}</dd></div><div><dt>Income publication status</dt><dd>{p?.income_status === "published" ? "Published" : "Not available"}</dd></div></>
                  <div><dt>Summer LST</dt>
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
                  <span>Relative scores, not investment decisions</span>
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
                        <b>{cellLabels.get(String(f.properties.grid_id)) || "Boundary cell"}</b>
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
      <p className="full-ranking-link"><a href="/rankings">Open the full within-city ranking →</a></p>
      <section className="scenario-comparator" aria-labelledby="compare-title">
        <header>
          <p className="eyebrow">Compare value choices</p>
          <h3 id="compare-title">How do the rankings change?</h3>
        <p>Compare two weighting scenarios for the selected city. The six rows below show the areas whose ranks change the most. Each city is ranked separately by official neighbourhood. Select a name to highlight its boundary on the map.</p>
        </header>
        <div className="compare-controls">
          <label>Starting scenario<strong>{SCENARIOS[scenario].title}</strong></label>
          <label>
            Alternative scenario
            <select value={comparisonScenario} onChange={(e) => setComparisonScenario(e.target.value as Scenario)}>
              {(Object.keys(SCENARIOS) as Scenario[]).filter((key) => key !== scenario).map((key) => (
                <option key={key} value={key}>{SCENARIOS[key].title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="rank-comparison-table" role="table" aria-label="Neighbourhood rank changes between the starting and alternative scenarios">
          <div className="rank-comparison-row comparison-head" role="row"><b role="columnheader">Neighbourhood</b><b role="columnheader">Starting rank</b><b role="columnheader">Alternative rank</b><b role="columnheader">Change</b></div>
          {comparisonRows.map((row) => (
            <div className="rank-comparison-row" role="row" key={row.id}>
              <span role="cell"><a className="cell-link" href="#explore" onClick={() => setSelected(row.id)}>{cellLabels.get(row.id) || row.name}</a><small>Show this area on the map</small></span>
              <span role="cell">{row.a}</span>
              <span role="cell">{row.b}</span>
              <strong role="cell" className={row.shift > 0 ? "up" : "down"}>{Math.abs(row.shift)} places {row.shift > 0 ? "higher" : row.shift < 0 ? "lower" : "unchanged"}</strong>
            </div>
          ))}
        </div>
        <p className="comparison-example">The two rank columns follow the scenario selections above. Only neighbourhoods with all three indicators are compared.</p>
        <p className="comparison-foot">Movement is evidence of value sensitivity, not evidence that either scenario is politically correct.</p>
      </section>
      </section>
      <section className="lab-chapter worked-example" aria-labelledby="worked-example-title">
        <header className="chapter-header"><p className="eyebrow">From the prototype to the thesis</p><h2 id="worked-example-title">One neighbourhood, three research steps.</h2><p>Kapelleveld · Brussels-Capital Region. An illustrative case, not a representative sample.</p></header>
        <ol className="example-steps">
          <li><h3>01 · Result</h3><p>{workedExample ? <>Kapelleveld moves from rank <b>{workedExample.balanced}</b> under balanced weighting to <b>{workedExample.income}</b> when lower median income receives more weight, among {workedExample.total} ranked neighbourhoods.</> : 'Loading the neighbourhood example…'} The data and boundaries stay fixed; the weights change from 40/30/30 to 25/20/55 (temperature / green deficit / lower median income).</p><a href="/priority-lines?city=Brussels">Inspect the four scenario ranks →</a></li>
          <li><h3>02 · Interview question</h3><p>First ask how officials define cooling need and set priorities. If the prototype is then introduced: who could justify giving income more weight, whose knowledge would inform that choice, and who could request a revision?</p></li>
          <li><h3>03 · Use in the thesis</h3><p>Use the rank change to make a weighting choice concrete. Compare interview answers with institutional documents to examine justification, participation, contestation and responsibility. The rank change alone does not establish democratic legitimacy or actual municipal practice.</p></li>
        </ol>
        <details className="reading-detail"><summary>Evidence and interview-use limits</summary><div className="reading-body"><p>The ranks are calculated from the same neighbourhood dataset as the map. Introduce the example only after open questions about existing practice, to reduce the risk of steering the interview. This is a proposed use in future interviews, not a reported interview finding.</p><a href="/data/brussels_neighbourhoods.csv">Brussels indicators and scores (CSV)</a> · <a href="/methods.html">Definitions, calculation and sources</a></div></details>
      </section>
      <section className="lab-chapter" id="data-evidence" aria-labelledby="data-evidence-title">
        <header className="chapter-header"><p className="eyebrow">03 · Data &amp; evidence</p><h2 id="data-evidence-title">Data &amp; evidence</h2><p>What the three indicators measure and where evidence is missing.</p></header>
      <details className="reading-detail"><summary>Coverage and what the map cannot see</summary><div className="reading-body">
      <section className="blindspot">
        <p className="eyebrow">What the map cannot see</p>
        <h3>Income coverage limits what this map can show.</h3>
        <div><p>Amsterdam uses published O&S median household income directly for each neighbourhood. Temperature and green cover are recalculated from the original rasters within the same official boundaries. Grey means unranked, not low priority; the map retains areas with missing income.</p><p>Every scenario combines surface temperature, green deficit and lower median income. Only the weights change. Brussels uses its published neighbourhood after-tax income; Amsterdam uses disposable household income. Each city is ranked independently. Health, housing and residents’ knowledge need separate evidence.</p></div>
      </section>
      </div></details>
      <details className="reading-detail"><summary>Data availability by city</summary><div className="reading-body">
      <section className="data-legibility" aria-labelledby="legibility-title">
        <header>
          <p className="eyebrow">Data legibility audit</p>
          <h3 id="legibility-title">What is included in this release?</h3>
          <p>Included does not mean complete; unavailable does not mean unimportant.</p>
        </header>
        <div className="legibility-table" role="table" aria-label="Data availability by city">
          <div className="legibility-row head" role="row">
            <b role="columnheader">Dimension</b><b role="columnheader">Brussels</b><b role="columnheader">Amsterdam</b>
          </div>
          {[
            
            ["Cooling green", "Included", "Included"],
            ["Lower median income", "IBSA 2498: equivalised after-tax median · 2023 · 118 ranked", "O&S: disposable household median · API 2024 · 108 ranked"],
            ["Observed summer surface heat", "Included", "Included"],
            
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
      </div></details>
      <section className="evidence" id="evidence"><div><p className="eyebrow">Three indicators</p><h3>Surface temperature, green deficit and lower median income.</h3><p>Summer land-surface temperature is observed by Landsat. Green deficit measures a shortage of cooling green cover. Income is the published neighbourhood median, used directly without transfer to a grid. Brussels uses equivalised after-tax income; Amsterdam uses disposable household income. Both rankings are within-city only. Changing weights changes how these three signals contribute to priority.</p><details className="reading-detail compact"><summary>Validation and spatial-scale limits</summary><div className="reading-body"><p>The revised index has no new predictive-validation or 500 m / 1 km sensitivity result. Earlier model metrics do not validate this index.</p></div></details></div></section>
      <section className="ai-role"><div><h3>A ranking still needs public justification.</h3></div><div><p>The index uses explicit weights, not machine learning, to rank places. The thesis examines how such tools should be explained, challenged and governed.</p></div>
      </section>
      </section>
      <section className="lab-chapter" id="politics" aria-labelledby="politics-title">
        <header className="chapter-header"><p className="eyebrow">04 · Politics &amp; legitimacy</p><h2 id="politics-title">Politics &amp; legitimacy</h2><p>From value choices in a model to justification, participation and public responsibility.</p></header>
      <section className="research-frame">
        <p className="eyebrow">Research question</p>
        <h3>
          How does data-driven spatial prioritization define urban cooling needs, and under what conditions can such prioritization be considered democratically legitimate in light of the AI and algorithm governance frameworks of Brussels and Amsterdam?
        </h3>
        <p>The prototype examines sensitivity to analytical choices. Institutional documents and interviews address how those choices are justified, governed and contested.</p>
        <div className="research-subquestions">
          <p><b>01 · Value choices</b> With indicators and neighbourhood boundaries held fixed, how do the four weightings change within-city rankings, and which areas remain stable? Indicator definitions, missing data and spatial scale are examined as limitations; the current prototype does not test alternative indicators or scales.</p>
          <p><b>02 · Institutional frameworks</b> How do Amsterdam, Brussels, and relevant EU documents define transparency, oversight, and responsibility for AI and algorithmic tools that may inform public decisions? What can be established about the implementation of these stated principles?</p>
          <p><b>03 · Democratic legitimacy</b> If a technical ranking is used to justify intervention priorities, whose knowledge should count, who should explain the choices behind it, and how should affected residents be able to challenge and revise them?</p>
        </div>
      </section>
      <details className="reading-detail"><summary>AI governance and technopopulism: context and sources</summary><div className="reading-body">
      <section className="research-bridge" aria-label="AI governance and the political question">
        <article id="ai-governance">
          <p className="eyebrow">AI governance in context</p>
          <h3>What rules should govern a tool that informs a public decision?</h3>
          <p>This prototype is not a municipal AI system. Its priority rankings come from explicit indicators and weights; the revised ranking is an explicit three-indicator calculation; it does not use machine learning.</p>
          <p>The research also examines <a href="https://www.amsterdam.nl/innovatie/ai-innovatie/" target="_blank" rel="noreferrer">Amsterdam’s AI vision and algorithm governance tools</a>, <a href="https://admin.be.brussels/sites/default/files/2024-10/Paradigm_livre%20blanc_2024_FR_240910.pdf" target="_blank" rel="noreferrer">Brussels’ regional AI policy documents</a>, and <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-27" target="_blank" rel="noreferrer">relevant EU rules</a>. These sources do not show that either city uses this prototype, or AI, to allocate urban cooling resources. They show how public institutions define transparency, oversight and responsibility when computational tools enter decision-making.</p>
        </article>
        <article id="political-question">
          <p className="eyebrow">Technopopulism as a research question</p>
          <h3>Can a single score stand in for public debate?</h3>
          <p>A map can make competing needs appear to have a single answer. Yet a ranking depends on prior choices: what counts as need, whose experience becomes data, and how different needs are weighed.</p>
          <p>This research asks whether a technically persuasive ranking can come to stand in for public debate. It examines a possible connection between technocratic claims to a single correct solution and political claims to a single public interest. Here, technopopulism refers to the combination of appeals to expertise and claims to represent “the people”; changing a model weight is not, by itself, evidence of technopopulism. That connection is a question for the thesis, not a finding about Brussels or Amsterdam.</p>
          <p>The democratic test is whether a model’s choices can be explained, challenged and revised, and whether a public institution takes responsibility for decisions made with its help.</p>
        </article>
      </section>
      </div></details>
      <section className="participation" id="participation">
        <header>
          <p className="eyebrow">Democratic participation</p>
          <h3>Who should decide the weights?</h3>
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
      </section>
      <section className="contestability" aria-labelledby="contest-title">
        <div>
          <p className="eyebrow">Contest this classification</p>
          <h3 id="contest-title">What might this neighbourhood be missing?</h3>
          <p>This is a demonstrator of an objection route. It does not send data or contact a municipality.</p>
        </div>
        <div className="challenge-panel">
          <strong>{cellLabels.get(String(p?.grid_id)) || "Select a mapped area"}</strong>
          <div className="challenge-options">
            {["Local heat experience is missing", "The indicators misrepresent need", "The weighting is unacceptable", "The proposed unit or boundary is wrong", "Residents were not involved"].map((reason) => (
              <button key={reason} className={challengeReason === reason ? "active" : ""} onClick={() => { setChallengeReason(reason); setChallengeRecorded(false); }}>{reason}</button>
            ))}
          </div>
          <button className="record-challenge" disabled={!challengeReason} onClick={() => setChallengeRecorded(true)}>Create a local challenge record</button>
          {challengeRecorded && <p className="challenge-result"><b>Challenge recorded in this browser session:</b> {challengeReason}. A legitimate operational system would now identify a responsible official, response deadline, evidence route and appeal body.</p>}
        </div>
      </section>
      <section className="legitimacy" id="legitimacy">
        <header>
          <p className="eyebrow">Institutional interpretation</p>
          <h3>A ranking does not make a decision.</h3>
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
      </section>
      <section className="lab-chapter" id="methods-sources" aria-labelledby="methods-sources-title">
        <header className="chapter-header"><p className="eyebrow">05 · Methods &amp; sources</p><h2 id="methods-sources-title">Methods &amp; sources</h2></header>
      <section className="method" id="method">
        <header>
          <p className="eyebrow">Method & sources</p>
          <h3>Follow every choice from source to score.</h3>
        </header>
        <div className="chain">
          {[
            ["Source", "Official boundaries and dated public datasets"],
            ["Pre-process", "Use official neighbourhood polygons and align the source rasters"],
            ["Measure", "Extract temperature and green cover inside each neighbourhood; join median income by official code"],
            ["Check coverage", "Keep missing values unavailable and select neighbourhoods with all three indicators"],
            ["Normalise", "Convert the three indicators to within-city percentile scores; reverse income"],
            ["Weight & combine", "Calculate the four weighted sums, then their scenario median"],
            ["Verify", "Check source joins, score direction, ties and weighted formulas"],
            ["Interpret", "Examine institutional interpretation, feasibility, participation and intervention priorities"],
          ].map(([x, detail], i) => (
            <div key={x}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{x}</b><small>{detail}</small>
            </div>
          ))}
        </div>
        <details className="reading-detail"><summary>All source links</summary><div className="reading-body">
        <div className="sources">
          {SOURCES.map(([a, b, url]) => (
            <a href={url} target="_blank" rel="noreferrer" key={url}>
              <span>{a}</span>
              <b>{b}</b>
              <i>↗</i>
            </a>
          ))}
        </div>
        </div></details>
        <p className="method-foot">
          Priority scores are within-city percentiles, not temperatures, uncertainty intervals or
          cross-city performance rankings. The scenario median aggregates the four three-indicator scenarios; it
          reduces the influence of a single weighting scheme but does not create democratic
          consensus or a neutral result. The current weighted index does not use machine learning to choose priorities.
        </p>
      </section>
      <details className="reading-detail" id="opendata"><summary>Downloads, attribution and reuse terms</summary><div className="reading-body">
      <section className="open-data">
        <p className="eyebrow">Open data & assumptions</p>
        <h3>Inspect neighbourhood indicators, boundaries and sources.</h3>
        <div>
          <a href="/data/neighbourhood_priority.geojson" download>
            ↓ Neighbourhood priority GeoJSON <small>Both city neighbourhood models · cite Biçer v0.3 and mapped data providers; source terms below.</small>
          </a>
          <a href="/data/amsterdam_income.json" download>↓ Amsterdam income JSON <small>Neighbourhood indicators, source definitions, coverage and unchanged weights.</small></a>
          <a href="/data/amsterdam_neighbourhoods.csv" download>↓ Amsterdam neighbourhood CSV <small>Disposable household median and direct raster statistics. Missing values remain blank.</small></a>
          <a href="/data/brussels_neighbourhoods.csv" download>↓ Brussels neighbourhood CSV <small>Equivalised after-tax median and direct raster statistics. Missing values remain blank.</small></a>
          <a href="/data/brussels_income.json" download>↓ Brussels model and sources <small>Income definition, source links, coverage, weights and file hashes.</small></a>
          <a href="/data/evidence.json" download>
            ↓ Evidence metrics JSON <small>Source definitions, file hashes, coverage rules and scenario weights.</small>
          </a>
        </div>
        <p>For neighbourhood and evidence downloads, cite Biçer (2026), Spatial Sensitivity Lab and the source providers listed in Methods. </p><p>Source attribution and reuse terms: PDOK and UrbIS boundaries; ESA WorldCover 2021, Landsat 8/9 JJA 2019–2023. Check each provider’s current licence before redistribution. The GeoJSON contains derived values; underlying imagery is not included. <a href="/methods.html">Methods, provenance and citation status</a>.</p>
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
      </div></details>
      <details className="reading-detail" id="procurement"><summary>Later stages: procurement, contracts and sources</summary><div className="reading-body">
      <section className="procurement">
        <header><p className="eyebrow">Possible later stages · outside the core study</p><h3>What happens after priorities are proposed?</h3><p>Procurement and budget decisions can later fix or alter priorities. They are prompts for further inquiry, not stages this study sets out to trace systematically. Neither city is asserted to procure this demonstrator.</p></header>
        <div className="procurement-details"><h3>Procurement questions and the contract clause demonstrator</h3>
        <ol className="procurement-chain">{["Data", "Indicator", "Weight", "Model", "Tender specification", "Contract", "Budget allocation", "Appeal"].map((step) => <li key={step}><b>{step}</b><small>Who decides? What is visible? Can residents challenge?</small></li>)}</ol>
        <div className="procurement-table" role="table" aria-label="Procurement comparison"><div role="row"><b role="columnheader">Question</b><b role="columnheader">Amsterdam</b><b role="columnheader">Brussels</b><b role="columnheader">Verification status</b></div>
          <div role="row"><span>Algorithm register</span><span><a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/algoritmes/">Municipal algorithm descriptions</a> are public; relevance to cooling procurement requires inquiry.</span><span>Equivalent register for this use case not established.</span><span>Verified (Amsterdam publication); To verify (Brussels)</span></div>
          <div role="row"><span>Standard procurement terms</span><span><a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/inkoopvoorwaarden-algoritmes/">Algorithmic procurement terms</a> published.</span><span>Equivalent standard terms not established.</span><span>Verified (Amsterdam publication); Interview needed (Brussels use)</span></div>
          <div role="row"><span>EU model clauses</span><span>EU full and light versions draw on Amsterdam's earlier approach; applicability depends on the system and contract.</span><span>Potential reference, with adoption unverified.</span><span>Verified (model text); Interview needed (adoption)</span></div>
        </div>
        <div className="clause-simulator"><h3>Contract clause simulator · demonstrator</h3><p>If <b>{SCENARIOS[scenario].title}</b> were fixed in a tender specification, {SCENARIOS[scenario].weights.toLowerCase()} would become a contractual baseline. A draft could require disclosure of the weights and source data, a version record for changes, independent audit access, a route for residents to challenge outputs, and a narrowly justified treatment of trade secrets. These are questions for a real procurement, not existing clauses in either city's cooling contract.</p><p>Compare the <a href="https://www.amsterdam.nl/innovatie/digitalisering-technologie/algoritmes-ai/inkoopvoorwaarden-algoritmes/">Amsterdam terms</a> and <a href="https://public-buyers-community.ec.europa.eu/communities/procurement-ai/resources/updated-eu-ai-model-contractual-clauses">EU model clauses and commentary</a> for the actual wording.</p></div>
        <p><b>AI Act classification: to be assessed.</b> The current demonstrator uses explicit weighted sums, with no machine-learning or predictive-validation component. Its legal classification is not established here. Whether the Act applies, and whether any full or light clauses are appropriate, requires expert assessment. See <a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng">Regulation (EU) 2024/1689</a>.</p>
        <p><b>If the weighting sits in a tender specification, who can still contest it?</b> Return to <a href="#participation">democratic participation</a>.</p>
        </div>
      </section>
      </div></details>
      </section>
      <footer>
        <b>Spatial Sensitivity Lab</b>
        <span>Research demonstrator · developed by Polen Biçer · 2026</span>
        <span>Not an operational allocation system</span>
      </footer>
    </main>
  );
}
