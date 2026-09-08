'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

type City = 'Amsterdam' | 'Brussels';
type Scenario = 'priority_consensus'|'priority_balanced'|'priority_population_led'|'priority_surface_led'|'priority_nature_deficit_led';
type Feature = { properties: Record<string, string|number|null> };
type Collection = { features: Feature[] };

const CITIES: City[] = ['Brussels', 'Amsterdam'];
const SCENARIOS: Record<Scenario,{title:string;weights:string;interpretation:string}> = {
  priority_consensus:{title:'Consensus median',weights:'Median of four scenarios',interpretation:'This report aggregates four policy logics through the median. It reduces the influence of any single weighting scheme, but it is not a neutral result. High-ranking cells repeatedly combine sealed surfaces, limited cooling green and population exposure.'},
  priority_balanced:{title:'Equal distributive justice',weights:'40% surface · 30% green deficit · 30% population',interpretation:'This balanced logic distributes attention across built-surface pressure, shortage of cooling green and population exposure. It favours cells where several forms of need overlap rather than allowing one indicator to dominate.'},
  priority_population_led:{title:'Demographic exposure first',weights:'25% surface · 20% green deficit · 55% population',interpretation:'This population-led logic moves densely inhabited cells upward. The result reflects potential exposure, not individual vulnerability: age, health, income and housing conditions are not consistently represented across both cities.'},
  priority_surface_led:{title:'Built environment / sealed surfaces',weights:'60% surface · 20% green deficit · 20% population',interpretation:'This morphological logic moves highly sealed and impervious cells upward. It identifies where the built environment intensifies heat pressure, but does not by itself establish who is most vulnerable or where investment is democratically authorised.'},
  priority_nature_deficit_led:{title:'Ecological compensation',weights:'25% surface · 55% green deficit · 20% population',interpretation:'This ecological logic moves cells with the greatest relative shortage of cooling green upward. It highlights spatial compensation needs while leaving land availability, tenure, displacement risk and local preferences for later public assessment.'},
};

function rankMap(features:Feature[], scenario:Scenario){
  return new Map([...features].sort((a,b)=>Number(b.properties[scenario])-Number(a.properties[scenario])).map((f,i)=>[String(f.properties.grid_id),i+1]));
}

function ColumnHelp({label,children}:{label:string;children:ReactNode}){
  const [open,setOpen]=useState(false);
  return <span className="column-help"><span>{label}</span><button type="button" aria-label={`Explain ${label}`} aria-expanded={open} onClick={()=>setOpen(!open)} onBlur={()=>setOpen(false)}>?</button><span className={`column-tip ${open?'open':''}`} role="tooltip">{children}</span></span>;
}

export default function RankingExplorer(){
  const [data,setData]=useState<Collection|null>(null);
  const [error,setError]=useState('');
  const [city,setCity]=useState<City>('Brussels');
  const [scenario,setScenario]=useState<Scenario>('priority_consensus');
  const [comparison,setComparison]=useState<Scenario>('priority_consensus');
  const [query,setQuery]=useState('');

  useEffect(()=>{fetch('/data/grid_priority.geojson').then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<Collection>}).then(setData).catch(()=>setError('The ranking data could not be loaded.'))},[]);
  const cityCells=useMemo(()=>data?.features.filter(f=>f.properties.city===city&&Boolean(f.properties.eligible))??[],[data,city]);
  const currentRanks=useMemo(()=>rankMap(cityCells,scenario),[cityCells,scenario]);
  const previousRanks=useMemo(()=>rankMap(cityCells,comparison),[cityCells,comparison]);
  const rows=useMemo(()=>[...cityCells].sort((a,b)=>Number(b.properties[scenario])-Number(a.properties[scenario])).filter(f=>{
    const q=query.trim().toLowerCase();return !q||String(f.properties.neighbourhood_name||'').toLowerCase().includes(q)||String(f.properties.grid_id).toLowerCase().includes(q);
  }),[cityCells,scenario,query]);
  const chooseScenario=(next:Scenario)=>{if(next!==scenario){setComparison(scenario);setScenario(next)}};
  const direction=(id:string)=>Number(previousRanks.get(id))-Number(currentRanks.get(id));
  const downloadCsv=()=>{
    const head=['rank','movement_vs_previous_logic','neighbourhood_context','cell_id','priority','surface_pressure','green_deficit','population_exposure','summer_lst_c'];
    const body=rows.map(f=>{const p=f.properties,id=String(p.grid_id);return [currentRanks.get(id),direction(id),p.neighbourhood_name||'Boundary cell',id,Number(p[scenario]).toFixed(1),Number(p.score_impervious).toFixed(0),Number(p.score_green_deficit).toFixed(0),Number(p.score_population).toFixed(0),p.summer_lst_median_c==null?'':Number(p.summer_lst_median_c).toFixed(1)]});
    const csv=[head,...body].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${city.toLowerCase()}-${scenario.replace('priority_','')}-ranking.csv`;a.click();URL.revokeObjectURL(url);
  };

  return <main className="rankings-page">
    <header className="rankings-nav"><a href="/">← Spatial Sensitivity Lab</a><span>Full within-city ranking</span><div><button onClick={downloadCsv}>Download CSV</button><button onClick={()=>window.print()}>Save as PDF</button></div></header>
    <section className="rankings-title"><p>Decision report · 500 m cells</p><h1>{city}<br/><em>{SCENARIOS[scenario].title}</em></h1><div><b>{cityCells.length}</b><span>eligible cells ranked</span></div></section>
    <section className="rankings-controls">
      <fieldset><legend>01 · City</legend>{CITIES.map(x=><button key={x} className={x===city?'active':''} onClick={()=>{setCity(x);setQuery('')}}>{x}</button>)}</fieldset>
      <fieldset><legend>02 · Policy logic</legend>{(Object.keys(SCENARIOS) as Scenario[]).map(x=><button key={x} className={x===scenario?'active':''} onClick={()=>chooseScenario(x)}>{SCENARIOS[x].title}</button>)}</fieldset>
      <label>03 · Find a neighbourhood or cell<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type to filter…"/></label>
    </section>
    <section className="report-note"><div><span>Selected weights</span><strong>{SCENARIOS[scenario].weights}</strong></div><p>{SCENARIOS[scenario].interpretation}</p><small>Rank movement compares this selection with the previously selected policy logic: {SCENARIOS[comparison].title}. On first load, consensus is the reference.</small></section>
    {error?<div className="ranking-status error">{error}</div>:!data?<div className="ranking-status">Loading full city ranking…</div>:<div className="full-table"><table><thead><tr>
      <th><ColumnHelp label="Rank"><b>Within-city order</b><span>Eligible 500 m cells sorted from the highest to lowest selected-policy score. It is not a neighbourhood league table.</span></ColumnHelp></th>
      <th><ColumnHelp label={`Δ vs ${SCENARIOS[comparison].title}`}><b>Rank movement</b><span>Previous rank minus current rank. A positive number means the cell moved up after the policy logic changed; a negative number means it moved down.</span></ColumnHelp></th>
      <th><ColumnHelp label="Neighbourhood context"><b>Orientation label</b><span>The neighbourhood name helps locate a cell. Repeated names are expected because several 500 m cells may fall within the same neighbourhood. Values are not neighbourhood averages.</span></ColumnHelp></th>
      <th><ColumnHelp label="Cell ID"><b>Stable spatial unit</b><span>The identifier of the 500 m European analysis-grid cell. It allows the table row to be traced back to the downloadable GeoJSON.</span></ColumnHelp></th>
      <th><ColumnHelp label="Priority"><b>Selected-policy score</b><span>A 0–100 within-city composite derived from surface pressure, green deficit and population exposure using the selected weights. Consensus is the median of four policy scenarios.</span></ColumnHelp></th>
      <th><ColumnHelp label="Surface"><b>Impervious-surface pressure</b><span>A within-city 0–100 score derived from Copernicus 2021 sealed-surface data. Higher means greater relative surface sealing; it is not the raw sealed percentage.</span></ColumnHelp></th>
      <th><ColumnHelp label="Green deficit"><b>Relative cooling-green shortage</b><span>A within-city 0–100 deficit score derived from ESA WorldCover 2021 cooling-green classes. Higher means less cooling green relative to other cells in the same city.</span></ColumnHelp></th>
      <th><ColumnHelp label="Population"><b>Population exposure</b><span>A within-city 0–100 score derived from JRC GHSL population density for 2020. It represents potential exposure, not social or health vulnerability.</span></ColumnHelp></th>
      <th><ColumnHelp label="Summer LST"><b>Observed surface temperature</b><span>Median daytime land-surface temperature in °C from valid Landsat 8/9 observations for June–August 2019–2023. It is not air temperature or personal heat exposure.</span></ColumnHelp></th>
    </tr></thead><tbody>{rows.map(f=>{const p=f.properties,id=String(p.grid_id),delta=direction(id);return <tr key={id}><td>{currentRanks.get(id)}</td><td className={delta>0?'up':delta<0?'down':'same'}>{delta>0?`+${delta}`:String(delta)}</td><td>{String(p.neighbourhood_name||'Boundary cell')}</td><td>{id}</td><td><b>{Number(p[scenario]).toFixed(1)}</b></td><td>{Number(p.score_impervious).toFixed(0)}</td><td>{Number(p.score_green_deficit).toFixed(0)}</td><td>{Number(p.score_population).toFixed(0)}</td><td>{p.summer_lst_median_c==null?'—':`${Number(p.summer_lst_median_c).toFixed(1)} °C`}</td></tr>})}</tbody></table></div>}
    <section className="reading-limits"><header><p>How to read this ranking</p><h2>Four limits remain visible.</h2></header><div><article><b>01 · Relative, not absolute</b><p>Scores are within-city percentiles. A score of 90 in Brussels is not directly equivalent to 90 in Amsterdam.</p></article><article><b>02 · Surface heat, not lived heat</b><p>Landsat measures land-surface temperature—not indoor conditions, air temperature, health outcomes or residents’ adaptive capacity.</p></article><article><b>03 · The grid shapes the result</b><p>Five-hundred-metre cells simplify continuous urban conditions. Boundaries and rank order may change at another spatial resolution: a form of the modifiable areal unit problem.</p></article><article><b>04 · Evidence, not authorization</b><p>Rank movement exposes the effect of policy weights. It does not identify a politically legitimate budget winner without participation, review and appeal.</p></article></div></section>
    <footer className="rankings-footer"><span>Spatial Sensitivity Lab · Polen Biçer · 2026</span><span>Within-city relative scores · research demonstrator · not an allocation decision</span></footer>
  </main>;
}
