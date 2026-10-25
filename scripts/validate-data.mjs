import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n,import.meta.url),'utf8'));
const grid=read('grid_priority.geojson').features,areas=read('neighbourhood_priority.json').rows,geo=read('neighbourhood_priority.geojson').features;
const amsterdam=areas.filter(r=>r.city==='Amsterdam'),ranked=amsterdam.filter(r=>r.ranking_eligible);
const weights={priority_balanced:[.4,.3,.3],priority_income_led:[.25,.2,.55],priority_heat_led:[.6,.2,.2],priority_nature_deficit_led:[.25,.55,.2]};
const fields=['score_surface_temperature','score_green_deficit','score_income_deprivation'];
assert.equal(amsterdam.length,518);assert.equal(new Set(amsterdam.map(r=>r.id)).size,518);
assert.equal(amsterdam.filter(r=>r.income_status==='published').length,418);assert.equal(ranked.length,411);
assert.equal(grid.filter(f=>f.properties.city==='Amsterdam').length,0,'Amsterdam grid must not remain published');
assert.equal(geo.length,663);assert.deepEqual(geo.map(f=>f.properties),areas);
for(const r of [...areas,...grid.map(f=>f.properties)]){
 for(const k of ['score_population','score_impervious','priority_population_led','priority_income','population_2020'])assert(!(k in r),'Retired field '+k);
 if(r.city==='Brussels'){assert.equal(r.priority_balanced,null);continue;}
 assert.equal(r.spatial_unit,'buurt');assert(!('grid_id' in r));assert(!('income_proxy_eur' in r));
 for(const [k,w] of Object.entries(weights)){
  if(!r.ranking_eligible)assert.equal(r[k],null,'Incomplete neighbourhood scored');
  else assert(Math.abs(r[k]-fields.reduce((sum,f,i)=>sum+r[f]*w[i],0))<.000002,'Wrong formula '+k);
 }
 if(r.ranking_eligible){assert(r.thermal_coverage_pct>=50);assert(r.land_cover_coverage_pct>=99);assert(r.income_median_disposable_eur>0);const v=Object.keys(weights).map(k=>r[k]).sort((a,b)=>a-b);assert(Math.abs(r.priority_consensus-(v[1]+v[2])/2)<.000002);}
 else assert.equal(r.priority_consensus,null);
 if(r.income_status!=='published')assert.equal(r.income_median_disposable_eur,null,'Missing income must stay null');
}
for(const [raw,score,sign] of [['income_median_disposable_eur','score_income_deprivation',-1],['summer_lst_median_c','score_surface_temperature',1],['green_deficit_pct','score_green_deficit',1]]){
 const sorted=[...ranked].sort((a,b)=>a[raw]-b[raw]);
 for(let i=1;i<sorted.length;i++){assert(sign*(sorted[i][score]-sorted[i-1][score])>=0,'Reversed score '+score);if(sorted[i][raw]===sorted[i-1][raw])assert.equal(sorted[i][score],sorted[i-1][score]);}
}
const current=read('amsterdam_income.json');assert(!('grid_rows' in current));assert.equal(current.metadata.grid_used,false);
assert(!fs.existsSync(new URL('../public/data/amsterdam_income_grid.csv',import.meta.url)));
console.log('Validated Amsterdam: 518 official buurten; 418 published incomes; 411 complete neighbourhood rankings. Native raster calculations, unchanged four weight sets, no Amsterdam grid, missing stays null. Brussels unchanged and unranked.');
