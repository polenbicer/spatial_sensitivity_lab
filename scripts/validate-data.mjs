import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n,import.meta.url),'utf8'));
const grid=read('grid_priority.geojson').features,areas=read('neighbourhood_priority.json').rows,geo=read('neighbourhood_priority.geojson').features;
const amsterdam=areas.filter(r=>r.city==='Amsterdam'),ranked=amsterdam.filter(r=>r.ranking_eligible),brussels=areas.filter(r=>r.city==='Brussels');
const weights={priority_balanced:[.4,.3,.3],priority_income_led:[.25,.2,.55],priority_heat_led:[.6,.2,.2],priority_nature_deficit_led:[.25,.55,.2]};
const fields=['score_surface_temperature','score_green_deficit','score_income_deprivation'];
assert.equal(amsterdam.length,110);assert.equal(new Set(amsterdam.map(r=>r.id)).size,110);
assert.equal(amsterdam.filter(r=>r.income_status==='published').length,108);assert.equal(ranked.length,108);
assert.equal(grid.length,0,'No 500 m cell rankings remain published');
assert.equal(brussels.length,145);assert.equal(brussels.filter(r=>r.income_status==='published').length,118);assert.equal(brussels.filter(r=>r.ranking_eligible).length,116);
assert.equal(geo.length,255);assert.deepEqual(geo.map(f=>f.properties),areas);
for(const r of [...areas,...grid.map(f=>f.properties)]){
 for(const k of ['score_population','score_impervious','priority_population_led','priority_income','population_2020'])assert(!(k in r),'Retired field '+k);
 const rawIncome=r.city==='Brussels'?'income_median_equivalised_after_tax_eur':'income_median_disposable_eur';
 assert.equal(r.spatial_unit,r.city==='Brussels'?'monitoring_neighbourhood':'wijk');
 if(r.city==='Brussels')assert(!('income_median_disposable_eur' in r),'Do not label fiscal income as disposable');assert(!('grid_id' in r));assert(!('income_proxy_eur' in r));
 for(const [k,w] of Object.entries(weights)){
  if(!r.ranking_eligible)assert.equal(r[k],null,'Incomplete neighbourhood scored');
  else assert(Math.abs(r[k]-fields.reduce((sum,f,i)=>sum+r[f]*w[i],0))<.000002,'Wrong formula '+k);
 }
 if(r.ranking_eligible){assert(r.thermal_coverage_pct>=50);assert(r.land_cover_coverage_pct>=99);assert(r[rawIncome]>0);const v=Object.keys(weights).map(k=>r[k]).sort((a,b)=>a-b);assert(Math.abs(r.priority_consensus-(v[1]+v[2])/2)<.000002);}
 else assert.equal(r.priority_consensus,null);
 if(r.income_status!=='published')assert.equal(r[rawIncome],null,'Missing income must stay null');
}
for(const city of ['Amsterdam','Brussels']){
 const complete=areas.filter(r=>r.city===city&&r.ranking_eligible);
 const income=city==='Brussels'?'income_median_equivalised_after_tax_eur':'income_median_disposable_eur';
 for(const [raw,score,sign] of [[income,'score_income_deprivation',-1],['summer_lst_median_c','score_surface_temperature',1],['green_deficit_pct','score_green_deficit',1]]){
  const sorted=[...complete].sort((a,b)=>a[raw]-b[raw]);
  assert(complete.every(r=>r[score]>=0&&r[score]<=100));assert(Math.abs(complete.reduce((sum,r)=>sum+r[score],0)/complete.length-50)<.000002,'Average-rank percentile reference changed');
  for(let i=1;i<sorted.length;i++){assert(sign*(sorted[i][score]-sorted[i-1][score])>=0,'Reversed score '+score);if(sorted[i][raw]===sorted[i-1][raw])assert.equal(sorted[i][score],sorted[i-1][score]);}
 }
}
const ibsa=JSON.parse(fs.readFileSync(new URL('../data/source/brussels_neighbourhood/income_2498_2023.json',import.meta.url),'utf8')).rows;
assert.equal(ibsa.length,145);
for(const r of brussels){const source=ibsa.find(x=>x.code===r.neighbourhood_code);assert(source);assert.equal(r.income_median_equivalised_after_tax_eur,source.value,'Income join failed');}
const current=read('amsterdam_income.json');assert(!('grid_rows' in current));assert.equal(current.metadata.grid_used,false);
assert(!fs.existsSync(new URL('../public/data/amsterdam_income_grid.csv',import.meta.url)));
console.log('Validated native neighbourhood models: Amsterdam 108/110; Brussels 116/145; independent city percentiles, exact source income joins, unchanged weights, null missing data, no grid scores.');

const osSource=JSON.parse(fs.readFileSync(new URL('../data/source/amsterdam_wijk/income_2024.json',import.meta.url),'utf8'))._embedded.cijfers.filter(r=>r.gebiedType==='Wijk');
assert.equal(osSource.length,108);
for(const row of amsterdam){const source=osSource.find(r=>r.gebiedCode===row.neighbourhood_code);assert.equal(row.income_median_disposable_eur,source?.waarde??null,'Use the published wijk median, never average buurt medians');}

const publicGreen=JSON.parse(fs.readFileSync(new URL('../data/source/amsterdam_wijk/public_green_2025.json',import.meta.url),'utf8')).rows;
assert.equal(Object.keys(publicGreen).length,110);
for(const row of amsterdam){
 const source=publicGreen[row.neighbourhood_code];assert(source);
 assert.equal(row.green_indicator,'ORPUBGROEN_P');
 assert(Math.abs(row.cooling_green_pct-100*source.ORPUBGROEN_P)<0.000001);
 assert(Math.abs(row.green_deficit_pct-(100-100*source.ORPUBGROEN_P))<0.000001);
 assert(Math.abs(source.ORPUBGROEN/source.ORLAND-source.ORPUBGROEN_P)<1e-10);
}
console.log('Verified Amsterdam public-green source joins, fraction-to-percent conversion, denominator and deficit direction for all 110 wijken.');

assert.equal(brussels.filter(r=>r.green_deficit_pct===null).length,2);
for(const row of brussels){
 assert.equal(row.green_indicator,'public_inventory_area_share');
 if(row.green_deficit_pct===null){assert.equal(row.ranking_eligible,false);assert(row.public_green_unknown_area_m2>0);}
 else {assert(Math.abs(row.cooling_green_pct-100*row.public_green_area_m2/row.green_denominator_area_m2)<.000001);assert(row.cooling_green_pct>=0&&row.cooling_green_pct<=100);}
}
