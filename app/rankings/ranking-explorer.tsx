'use client';

import { useEffect, useMemo, useState } from 'react';

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

  return <main className="rankings-page">
    <header className="rankings-nav"><a href="/">← Spatial Sensitivity Lab</a><span>Full within-city ranking</span><button onClick={()=>window.print()}>Download / save PDF</button></header>
    <section className="rankings-title"><p>Decision report · 500 m cells</p><h1>{city}<br/><em>{SCENARIOS[scenario].title}</em></h1><div><b>{cityCells.length}</b><span>eligible cells ranked</span></div></section>
    <section className="rankings-controls">
      <fieldset><legend>01 · City</legend>{CITIES.map(x=><button key={x} className={x===city?'active':''} onClick={()=>{setCity(x);setQuery('')}}>{x}</button>)}</fieldset>
      <fieldset><legend>02 · Policy logic</legend>{(Object.keys(SCENARIOS) as Scenario[]).map(x=><button key={x} className={x===scenario?'active':''} onClick={()=>chooseScenario(x)}>{SCENARIOS[x].title}</button>)}</fieldset>
      <label>03 · Find a neighbourhood or cell<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type to filter…"/></label>
    </section>
    <section className="report-note"><div><span>Selected weights</span><strong>{SCENARIOS[scenario].weights}</strong></div><p>{SCENARIOS[scenario].interpretation}</p><small>Rank movement compares this selection with the previously selected policy logic: {SCENARIOS[comparison].title}. On first load, consensus is the reference.</small></section>
    {error?<div className="ranking-status error">{error}</div>:!data?<div className="ranking-status">Loading full city ranking…</div>:<div className="full-table"><table><thead><tr><th>Rank</th><th>Movement</th><th>Neighbourhood context</th><th>Cell ID</th><th>Priority</th><th>Surface</th><th>Green deficit</th><th>Population</th><th>Summer LST</th></tr></thead><tbody>{rows.map(f=>{const p=f.properties,id=String(p.grid_id),delta=direction(id);return <tr key={id}><td>{currentRanks.get(id)}</td><td className={delta>0?'up':delta<0?'down':'same'}>{delta>0?`+${delta}`:String(delta)}</td><td>{String(p.neighbourhood_name||'Boundary cell')}</td><td>{id}</td><td><b>{Number(p[scenario]).toFixed(1)}</b></td><td>{Number(p.score_impervious).toFixed(0)}</td><td>{Number(p.score_green_deficit).toFixed(0)}</td><td>{Number(p.score_population).toFixed(0)}</td><td>{p.summer_lst_median_c==null?'—':`${Number(p.summer_lst_median_c).toFixed(1)} °C`}</td></tr>})}</tbody></table></div>}
    <footer className="rankings-footer"><span>Spatial Sensitivity Lab · Polen Biçer · 2026</span><span>Within-city relative scores · research demonstrator · not an allocation decision</span></footer>
  </main>;
}
