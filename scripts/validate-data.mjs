import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n,import.meta.url),'utf8'));
const grid=read('grid_priority.geojson').features, areas=read('neighbourhood_priority.json').rows;
const weights={priority_balanced:[.4,.3,.3],priority_income_led:[.25,.2,.55],priority_heat_led:[.6,.2,.2],priority_nature_deficit_led:[.25,.55,.2]};
const criteria=['score_surface_temperature','score_green_deficit','score_income_deprivation'];
assert.equal(grid.length,1783);assert.equal(new Set(grid.map(f=>f.properties.grid_id)).size,grid.length);assert.equal(areas.length,664);
const counts={Amsterdam:0,Brussels:0};
for(const f of grid){const p=f.properties;
 for(const key of ['score_population','score_impervious','priority_population_led','priority_income','population_2020']) assert(!(key in p),'Retired field '+key);
 const valid=p.eligible===1&&criteria.every(k=>Number.isFinite(p[k]));
 for(const [key,w] of Object.entries(weights)){
  if(!valid) assert.equal(p[key],null,'Incomplete cell has a score');
  else {assert(Math.abs(p[key]-criteria.reduce((v,k,i)=>v+p[k]*w[i],0))<.0002,'Formula mismatch '+key);assert(p[key]>=0&&p[key]<=100);}
 }
 if(valid){counts[p.city]++;const scores=Object.keys(weights).map(k=>p[k]).sort((a,b)=>a-b);assert(Math.abs(p.priority_consensus-(scores[1]+scores[2])/2)<.0002);}else assert.equal(p.priority_consensus,null);
}
assert.deepEqual(counts,{Amsterdam:307,Brussels:0});
for(const r of areas){if(r.ranking_eligible){assert(r.eligible_coverage_pct>=50);assert(r.model_coverage_pct>=99.9);assert(Object.keys(weights).every(k=>Number.isFinite(r[k])));} if(r.city==='Brussels') assert.equal(r.priority_balanced,null);}
for(const city of ['Amsterdam','Brussels']){
 const rows=grid.map(f=>f.properties).filter(p=>p.city===city&&p.score_surface_temperature!=null).sort((a,b)=>a.summer_lst_median_c-b.summer_lst_median_c);
 for(let i=1;i<rows.length;i++)assert(rows[i].score_surface_temperature>=rows[i-1].score_surface_temperature,'Heat direction reversed');
}
const incomes=grid.map(f=>f.properties).filter(p=>p.score_income_deprivation!=null).sort((a,b)=>a.income_proxy_eur-b.income_proxy_eur);
for(let i=1;i<incomes.length;i++)assert(incomes[i].score_income_deprivation<=incomes[i-1].score_income_deprivation,'Income direction reversed');
for(const path of ['../app/redesign.tsx','../app/rankings/ranking-explorer.tsx','../app/priority-lines/model.ts','../app/priority-lines/priority-lines.tsx','../lib/priority-model.ts']) {
 const text=fs.readFileSync(new URL(path,import.meta.url),'utf8');assert(!/score_population|priority_population_led|population exposure|sealed surfaces|score_impervious/i.test(text),'Retired criterion in '+path);
}
console.log('Validated all four unchanged weight sets: surface temperature + green deficit + low income. Amsterdam 307 cells; Brussels unranked. Missing remains null.');
