'use client';
import { useEffect, useMemo, useState } from 'react';

type City='Amsterdam'|'Brussels';
type Scenario='priority_consensus'|'priority_balanced'|'priority_population_led'|'priority_surface_led'|'priority_nature_deficit_led';
type Feature={type:'Feature';geometry:any;properties:Record<string,string|number|null>};
type Collection={type:'FeatureCollection';features:Feature[]};

const CITIES:City[]=['Brussels','Amsterdam'];
const SCENARIOS:Record<Scenario,{title:string;weights:string;note:string}>={
 priority_consensus:{title:'Consensus',weights:'Median of four scenarios',note:'The median score across all policy logics.'},
 priority_balanced:{title:'Balanced',weights:'40% surface · 30% green deficit · 30% population',note:'Distributes attention across physical pressure, nature deficit and population exposure.'},
 priority_population_led:{title:'Population-led',weights:'25% surface · 20% green deficit · 55% population',note:'Prioritises where more residents are potentially exposed.'},
 priority_surface_led:{title:'Surface-led',weights:'60% surface · 20% green deficit · 20% population',note:'Prioritises sealed and impervious urban surfaces.'},
 priority_nature_deficit_led:{title:'Nature-deficit-led',weights:'25% surface · 55% green deficit · 20% population',note:'Prioritises the greatest relative shortage of cooling green cover.'},
};
const SOURCES=[
 ['City boundaries','PDOK and Brussels Open Data','https://www.pdok.nl/introductie/-/article/bestuurlijke-gebieden'],
 ['Land cover','ESA WorldCover 2021 · 10 m','https://worldcover2021.esa.int/'],
 ['Imperviousness','Copernicus HRL 2021 · 10 m','https://land.copernicus.eu/en/products/high-resolution-layer-imperviousness/imperviousness-density-2021'],
 ['Population','JRC GHSL GHS-POP 2020 · 100 m','https://data.jrc.ec.europa.eu/collection/ghsl'],
 ['Surface temperature','Landsat 8/9 C2 L2 · JJA 2019–2023','https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2'],
];

function colour(v: number | null) {
  return v == null ? '#777' : v < 20 ? '#1046ca' : v < 50 ? '#111111' : v < 80 ? '#c80032' : '#880022';
}

function MapFrame({
  city,
  scenario,
  selected,
  topRankedIds,
  onSelect
}:{
  city: City;
  scenario: Scenario;
  selected: string;
  topRankedIds: string[];
  onSelect: (id: string) => void;
}){
 const [html, setHtml] = useState('');

 useEffect(() => {
   const topList = JSON.stringify(topRankedIds || []);
   const doc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { font: 11px monospace; background: #dce3df; }
    .leaflet-popup-content-wrapper, .leaflet-popup-tip { border-radius: 0; border: 1px solid #111; }
    .legend { background: #fff; border: 1px solid #111; padding: 6px 8px; line-height: 16px; font-size: 10px; }
    .legend i { display: inline-block; width: 11px; height: 11px; margin-right: 5px; vertical-align: -1px; }
    
    .rank-badge {
      display: flex !important;
      align-items: center;
      justify-content: center;
      background: #c80032;
      color: #ffffff;
      font-family: Arial, sans-serif;
      font-weight: 800;
      font-size: 11px;
      border: 1.5px solid #111;
      box-shadow: 2px 2px 0px #111;
      border-radius: 2px;
      pointer-events: none;
    }
    .rank-badge.active-badge {
      background: #111111;
      color: #ffffff;
      transform: scale(1.15);
      border-color: #ffffff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const city = ${JSON.stringify(city)};
    const field = ${JSON.stringify(scenario)};
    const selected = ${JSON.stringify(selected)};
    const topIds = ${topList};

    const map = L.map('map', { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    function fmt(v) { return v == null ? '—' : Number(v).toFixed(0) + '/100'; }

    Promise.all([
      fetch('/data/grid_priority.geojson').then(r => r.json()),
      fetch('/data/project_context.geojson').then(r => r.json()).catch(() => null)
    ]).then(([grid, projects]) => {
      const vals = [
        ['#1046ca', '0–20'],
        ['#55a8c8', '20–40'],
        ['#ecebe5', '40–60'],
        ['#c80032', '60–80'],
        ['#880022', '80–100']
      ];

      const layer = L.geoJSON(grid, {
        filter: function(f) { return f.properties && f.properties.city === city; },
        style: function(f) {
          const v = f.properties[field];
          const isSel = f.properties.grid_id === selected;
          const rankIdx = topIds.indexOf(f.properties.grid_id);
          const isTop = rankIdx !== -1;

          let baseColor = '#ecebe5';
          if (v != null) {
            baseColor = v < 20 ? '#1046ca' : v < 40 ? '#55a8c8' : v < 60 ? '#ecebe5' : v < 80 ? '#c80032' : '#880022';
          }

          return {
            fillColor: isTop ? '#c80032' : baseColor,
            fillOpacity: isSel ? 0.95 : isTop ? 0.85 : (f.properties.eligible ? 0.45 : 0.15),
            color: isSel ? '#111111' : isTop ? '#111111' : 'rgba(255,255,255,.65)',
            weight: isSel ? 3.5 : isTop ? 2.5 : 0.5
          };
        },
        onEachFeature: function(f, l) {
          const p = f.properties;
          const v = p[field];
          const rankIdx = topIds.indexOf(p.grid_id);

          if (rankIdx !== -1) {
            try {
              const center = l.getBounds().getCenter();
              const isSel = p.grid_id === selected;
              const badge = L.divIcon({
                className: 'rank-badge' + (isSel ? ' active-badge' : ''),
                html: String(rankIdx + 1).padStart(2, '0'),
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              L.marker(center, { icon: badge, interactive: false }).addTo(map);
            } catch(e){}
          }

          l.bindPopup('<b>' + (p.neighbourhood_name || '500 m cell') + '</b><br>' +
            (rankIdx !== -1 ? '<b style="color:#c80032">Top Rank #' + (rankIdx + 1) + '</b><br>' : '') +
            'Priority ' + (v == null ? 'Excluded' : Number(v).toFixed(1) + '/100') + '<br>' +
            'Surface pressure ' + fmt(p.score_impervious) + '<br>' +
            'Green deficit ' + fmt(p.score_green_deficit) + '<br>' +
            'Population exposure ' + fmt(p.score_population) + '<br>' +
            'Summer surface temp ' + (p.summer_lst_median_c == null ? '—' : Number(p.summer_lst_median_c).toFixed(1) + ' °C')
          );

          l.on('click', function() {
            parent.postMessage({ type: 'grid-select', id: p.grid_id }, '*');
          });
        }
      }).addTo(map);

      try {
        map.fitBounds(layer.getBounds(), { padding: [10, 10] });
      } catch(e){}

      if (projects) {
        try {
          L.geoJSON(projects, {
            filter: function(f) { return f.properties && f.properties.city === city; },
            style: { color: '#111', weight: 2, fillOpacity: 0.04, dashArray: '5 3' }
          }).addTo(map);
        } catch(e){}
      }

      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = function() {
        const d = L.DomUtil.create('div', 'legend');
        d.innerHTML = '<b>Relative priority</b><br>' +
          vals.map(x => '<i style="background:' + x[0] + '"></i>' + x[1]).join('<br>') +
          '<br><i style="background:#c80032; border:1px solid #111;"></i><b>01-10 Top rank</b>';
        return d;
      };
      legend.addTo(map);
    }).catch(err => {
      console.error('GeoJSON yükleme hatası:', err);
    });
  </script>
</body>
</html>`;
   setHtml(doc);
 }, [city, scenario, selected, topRankedIds]);

 useEffect(() => {
   const h = (e: MessageEvent) => {
     if (e.data?.type === 'grid-select') onSelect(e.data.id);
   };
   window.addEventListener('message', h);
   return () => window.removeEventListener('message', h);
 }, [onSelect]);

 return <iframe title={`${city} urban cooling priority map`} srcDoc={html} />;
}
 const [html,setHtml]=useState('');

 useEffect(()=>{
   setHtml(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>
   html,body,#map{height:100%;margin:0}
   .leaflet-container{font:11px monospace;background:#dce3df}
   .leaflet-popup-content-wrapper,.leaflet-popup-tip{border-radius:0;border:1px solid #111}
   .legend{background:#fff;border:1px solid #111;padding:6px 8px;line-height:16px;font-size:10px}
   .legend i{display:inline-block;width:11px;height:11px;margin-right:5px;vertical-align:-1px}
   /* Harita üzerindeki sıra numarası rozetleri */
   .rank-marker{
     display:flex;
     align-items:center;
     justify-content:center;
     background:#c80032;
     color:#ffffff;
     font-family:Arial,sans-serif;
     font-weight:900;
     font-size:11px;
     border:1.5px solid #111111;
     box-shadow:2px 2px 0px #111111;
     border-radius:2px;
     pointer-events:none;
   }
   .rank-marker.selected-marker{
     background:#111111;
     color:#ffffff;
     transform:scale(1.2);
     border-color:#ffffff;
   }
   </style></head><body><div id="map"></div><script>
   const city=${JSON.stringify(city)},
         field=${JSON.stringify(scenario)},
         selected=${JSON.stringify(selected)},
         topIds=${JSON.stringify(topRankedIds)};

   const map=L.map('map',{zoomControl:true});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);

   Promise.all([
     fetch('/data/grid_priority.geojson').then(r=>r.json()),
     fetch('/data/project_context.geojson').then(r=>r.json())
   ]).then(([grid,projects])=>{
     const vals=[['#1046ca','0–20'],['#55a8c8','20–40'],['#ecebe5','40–60'],['#c80032','60–80'],['#880022','80–100']];
     let selectedBounds = null;

     const layer=L.geoJSON(grid,{
       filter: f => f.properties.city === city,
       style: f => {
         const v = f.properties[field];
         const isSelected = f.properties.grid_id === selected;
         const rankIndex = topIds.indexOf(f.properties.grid_id);
         const isTop = rankIndex !== -1;

         const baseColor = v < 20 ? '#1046ca' : v < 40 ? '#55a8c8' : v < 60 ? '#ecebe5' : v < 80 ? '#c80032' : '#880022';

         return {
           fillColor: isTop ? '#c80032' : baseColor,
           fillOpacity: isSelected ? 0.95 : isTop ? 0.85 : (f.properties.eligible ? 0.45 : 0.15),
           color: isSelected ? '#111' : isTop ? '#111' : 'rgba(255,255,255,.6)',
           weight: isSelected ? 3.5 : isTop ? 2.5 : 0.5,
           dashArray: isTop && !isSelected ? '3 2' : null
         };
       },
       onEachFeature: (f, l) => {
         const p = f.properties;
         const v = p[field];
         const rankIdx = topIds.indexOf(p.grid_id);

         // İlk 10 hücre için harita üzerine numara rozeti yerleştir
         if (rankIdx !== -1) {
           const bounds = l.getBounds();
           const center = bounds.getCenter();
           const isSel = p.grid_id === selected;

           const icon = L.divIcon({
             className: 'rank-marker' + (isSel ? ' selected-marker' : ''),
             html: String(rankIdx + 1).padStart(2, '0'),
             iconSize: [22, 22],
             iconAnchor: [11, 11]
           });
           L.marker(center, { icon }).addTo(map);
         }

         if (p.grid_id === selected) {
           selectedBounds = l.getBounds();
         }

         l.bindPopup('<b>' + (p.neighbourhood_name || '500 m cell') + '</b><br>' +
           (rankIdx !== -1 ? '<b style="color:#c80032">Top Rank #' + (rankIdx + 1) + '</b><br>' : '') +
           'Priority ' + (v == null ? 'Excluded' : Number(v).toFixed(1) + '/100') + '<br>' +
           'Surface pressure ' + fmt(p.score_impervious) + '<br>' +
           'Green deficit ' + fmt(p.score_green_deficit) + '<br>' +
           'Population exposure ' + fmt(p.score_population) + '<br>' +
           'Summer surface temp ' + (p.summer_lst_median_c == null ? '—' : Number(p.summer_lst_median_c).toFixed(1) + ' °C')
         );

         l.on('click', () => parent.postMessage({ type: 'grid-select', id: p.grid_id }, '*'));
       }
     }).addTo(map);

     if (selectedBounds) {
       map.panTo(selectedBounds.getCenter());
     } else {
       map.fitBounds(layer.getBounds(), { padding: [10, 10] });
     }

     L.geoJSON(projects, {
       filter: f => f.properties.city === city,
       style: { color: '#111', weight: 2, fillOpacity: 0.04, dashArray: '5 3' }
     }).addTo(map);

     const legend = L.control({ position: 'bottomright' });
     legend.onAdd = () => {
       const d = L.DomUtil.create('div', 'legend');
       d.innerHTML = '<b>Relative priority</b><br>' +
         vals.map(x => '<i style="background:' + x[0] + '"></i>' + x[1]).join('<br>') +
         '<br><i style="background:#c80032; border:1px solid #000;"></i><b>01-10 Top rank</b>';
       return d;
     };
     legend.addTo(map);
   });

   function fmt(v){ return v == null ? '—' : Number(v).toFixed(0) + '/100'; }
   </script></body></html>`);
 }, [city, scenario, selected, topRankedIds]);

 useEffect(()=>{
   const h=(e:MessageEvent)=>{
     if(e.data?.type==='grid-select') onSelect(e.data.id);
   };
   addEventListener('message',h);
   return()=>removeEventListener('message',h);
 },[onSelect]);

 return <iframe title={`${city} urban cooling priority map`} srcDoc={html}/>;
}

export default function ResearchInterface(){
 const [city,setCity]=useState<City>('Brussels'),
       [scenario,setScenario]=useState<Scenario>('priority_consensus'),
       [data,setData]=useState<Collection|null>(null),
       [evidence,setEvidence]=useState<any>(null),
       [selected,setSelected]=useState('');

 useEffect(()=>{
   Promise.all([
     fetch('/data/grid_priority.geojson').then(r=>r.json() as Promise<Collection>),
     fetch('/data/evidence.json').then(r=>r.json())
   ]).then(([g,e])=>{
     setData(g);
     setEvidence(e);
   });
 },[]);

 const cells = useMemo(()=>data?.features.filter(f=>f.properties.city===city)??[], [data,city]);
 const eligible = useMemo(()=>cells.filter(f=>f.properties.eligible).sort((a,b)=>Number(b.properties[scenario]??-1)-Number(a.properties[scenario]??-1)), [cells,scenario]);
 
 const ranked = useMemo(()=>eligible.slice(0, 10), [eligible]);
 const topRankedIds = useMemo(()=>ranked.map(f=>String(f.properties.grid_id)), [ranked]);

 const active = cells.find(f=>f.properties.grid_id===selected) ?? eligible[0];
 const p = active?.properties;
 const metric = evidence?.ml_validation_metrics?.find((x:any)=>x.city===city);
 const scale = evidence?.scale_sensitivity_metrics?.find((x:any)=>x.city===city);

 return (
  <main className="site-shell">
   <header className="site-header">
    <a href="#top">spatial sensitivity lab</a>
    <nav>
     <a href="#explore">Explore</a>
     <a href="#evidence">Evidence</a>
     <a href="#method">Method</a>
     <a href="#legitimacy">Legitimacy</a>
    </nav>
    <span>polenbicer.dev</span>
   </header>
   
   <section className="intro" id="top">
    <p className="eyebrow">Amsterdam / Brussels · Urban cooling · 2026</p>
    <h1>Spatial <em>Sensitivity</em> Lab</h1>
    <div className="intro-copy">
     <p>A research interface for seeing how data, policy weights and AI validation make urban cooling priorities visible.</p>
     <small>Not neutral. Not automatic. Not an allocation system.</small>
    </div>
    <div className="orbit-mark" aria-hidden="true">◎</div>
   </section>

   {/* ÇALIŞMA ALANI & HARİTA */}
   <section className="workspace" id="explore">
    <aside className="controls">
     <div>
      <p className="eyebrow">01 · City</p>
      <div className="segmented">
        {CITIES.map(x=><button className={x===city?'active':''} onClick={()=>{setCity(x);setSelected('')}} key={x}>{x}</button>)}
      </div>
      <p className="eyebrow">02 · Policy logic</p>
      <div className="scenario-list">
        {(Object.keys(SCENARIOS) as Scenario[]).map(k=><button className={k===scenario?'active':''} onClick={()=>setScenario(k)} key={k}><b>{SCENARIOS[k].title}</b><span>{SCENARIOS[k].weights}</span></button>)}
      </div>
     </div>
     <div className="policy-note">
      <b>{SCENARIOS[scenario].title}</b>
      <p>{SCENARIOS[scenario].note}</p>
      <small>Weights define political priority, not objective truth.</small>
     </div>
    </aside>

    <div className="map-wrap">
     <div className="panel-head">
       <span>500 m decision surface</span>
       <span>{cells.length} cells · top 10 marked</span>
     </div>
     <MapFrame 
       city={city} 
       scenario={scenario} 
       selected={String(p?.grid_id??'')} 
       topRankedIds={topRankedIds} 
       onSelect={setSelected}
     />
    </div>

    <aside className="inspect">
     <p className="eyebrow">Selected cell</p>
     <h2>{String(p?.neighbourhood_name||'Highest-ranked cell')}</h2>
     <div className="score">{Number(p?.[scenario]??0).toFixed(1)}<small>/100</small></div>
     {[['Surface pressure','score_impervious'],['Green deficit','score_green_deficit'],['Population exposure','score_population']].map(([label,key])=><div className="meter" key={key}><span>{label}<b>{Number(p?.[key]??0).toFixed(0)}</b></span><i><u style={{width:`${Number(p?.[key]??0)}%`}}/></i></div>)}
     <dl>
      <div><dt>Summer surface temp</dt><dd>{p?.summer_lst_median_c==null?'—':`${Number(p.summer_lst_median_c).toFixed(1)} °C`}</dd></div>
      <div><dt>Top-quintile scenarios</dt><dd>{String(p?.top20_scenario_count??'—')} / 4</dd></div>
      <div><dt>Weight sensitivity</dt><dd>{p?.priority_range==null?'—':Number(p.priority_range).toFixed(1)}</dd></div>
     </dl>
    </aside>
   </section>

   {/* HARİTAYLA EŞLEŞEN İLK 10 SIRALAMA LİSTESİ */}
   <section className="ranking">
    <div>
     <p className="eyebrow">Highest mapped need</p>
     <h2>Where does priority concentrate?</h2>
     <p>Select any ranked cell below to locate its numbered boundary on the map.</p>
    </div>
    <ol>
     {ranked.map((f,i)=><li key={String(f.properties.grid_id)}>
      <button 
        style={{
          background: f.properties.grid_id === p?.grid_id ? 'var(--paper-tint)' : undefined,
          borderLeft: f.properties.grid_id === p?.grid_id ? '4px solid var(--accent)' : undefined
        }} 
        onClick={()=>setSelected(String(f.properties.grid_id))}
      >
       <span>{String(i+1).padStart(2,'0')}</span>
       <b>{String(f.properties.neighbourhood_name||'Unnamed cell')}</b>
       <i style={{width:`${Number(f.properties[scenario])}%`}}/>
       <strong>{Number(f.properties[scenario]).toFixed(1)}</strong>
      </button>
     </li>)}
    </ol>
   </section>

   <section className="evidence" id="evidence">
    <div>
     <p className="eyebrow">Independent thermal validation</p>
     <h2>Does the model correspond to observed heat?</h2>
     <p>Random Forest predicts Landsat summer land-surface temperature from sealed surface, cooling green, trees, grass, water and population density. Validation uses five-fold spatial blocks, not random cell splits.</p>
     <blockquote>Predictive accuracy validates a relationship with observed surface temperature. It does not determine which neighbourhood deserves investment.</blockquote>
    </div>
    <div className="metric-grid">
     <article><span>Spatial CV R²</span><strong>{metric?.r2_spatial_cv?.toFixed(3)??'—'}</strong></article>
     <article><span>Mean absolute error</span><strong>{metric?.mae_c_spatial_cv?.toFixed(2)??'—'} °C</strong></article>
     <article><span>Baseline MAE</span><strong>{metric?.baseline_mae_c?.toFixed(2)??'—'} °C</strong></article>
     <article><span>500 m ↔ 1 km correlation</span><strong>{scale?.spearman_priority_500m_vs_1km?.toFixed(3)??'—'}</strong></article>
    </div>
   </section>

   <section className="blindspot">
    <p className="eyebrow">What the map cannot see</p>
    <h2>Missing data do not mean missing vulnerability.</h2>
    <div>
     <p>Amsterdam includes a limited diagnostic context based on residents aged 65+ and one-person households. It is not a complete social vulnerability index.</p>
     <p>For Brussels, no comparable small-area social score is asserted in this release. The gap remains visible rather than being filled with an undocumented proxy.</p>
     <p>This asymmetry is itself a finding: unequal data infrastructures shape which people and needs become legible to decision systems.</p>
    </div>
   </section>

   <section className="method" id="method">
    <header><p className="eyebrow">Method & sources</p><h2>Follow every choice from source to score.</h2></header>
    <div className="chain">{['Official boundaries','Aligned 500 m grid','Surface + nature + population','Four normative scenarios','Independent Landsat validation','Spatial robustness tests','Human interpretation'].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,'0')}</span><b>{x}</b></div>)}</div>
    <div className="sources">{SOURCES.map(([a,b,url])=><a href={url} target="_blank" rel="noreferrer" key={url}><span>{a}</span><b>{b}</b><i>↗</i></a>)}</div>
    <p className="method-foot">Priority scores are within-city percentiles, not temperatures and not cross-city performance rankings. The main index is a transparent multi-criteria decision analysis. AI is used only for explainable thermal validation—not to choose policy weights or define justice.</p>
   </section>

   <section className="legitimacy" id="legitimacy">
    <header><p className="eyebrow">AI/data-supported policy legitimacy audit</p><h2>Accuracy is not authorization.</h2><p>A technically strong model can still depoliticise contested choices. Before acting, every stage needs public justification and an accountable decision-maker.</p></header>
    <div>{evidence?.ai_policy_legitimacy_audit?.map((x:any)=><article key={x.stage}><span>{String(x.stage).padStart(2,'0')}</span><h3>{x.legitimacy_stage}</h3><p>{x.current_evidence}</p></article>)}</div>
   </section>

   <footer>
    <b>Spatial Sensitivity Lab</b>
    <span>Research demonstrator · developed by Polen Biçer · 2026</span>
    <span>Not an operational allocation system</span>
   </footer>
  </main>
 );
}
