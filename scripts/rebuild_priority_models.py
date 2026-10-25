"""Rebuild every published ranking with LST, green deficit and low income only."""
from pathlib import Path
import json, csv
from collections import Counter
from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer
from scipy.stats import rankdata
R=Path(__file__).resolve().parents[1];O=R/'public/data'
WEIGHTS={'priority_balanced':[.4,.3,.3],'priority_income_led':[.25,.2,.55],'priority_heat_led':[.6,.2,.2],'priority_nature_deficit_led':[.25,.55,.2]}
FIELDS=['score_surface_temperature','score_green_deficit','score_income_deprivation']
def main():
 grid=json.loads((O/'grid_priority.geojson').read_text());geo=json.loads((O/'neighbourhood_priority.geojson').read_text());income=json.loads((O/'amsterdam_income.json').read_text());inc={r['grid_id']:r for r in income['grid_rows']}
 for f in grid['features']:
  p=f['properties'];p.update({k:v for k,v in inc.get(p['grid_id'],{}).items() if not k.startswith('priority_')})
  for k in list(p):
   if k.startswith('priority_') or k in ['score_population','population_2020','population_density_km2','score_impervious','sealed_surface_pct','top20_scenario_count','robust_high_priority','score_ge_80_scenario_count']:p.pop(k)
  p['score_surface_temperature']=None
  if p['city']=='Brussels':p.update(score_income_deprivation=None,income_proxy_eur=None,income_status='comparable_income_unavailable',income_coverage_pct=None)
 for city in ['Amsterdam','Brussels']:
  observed=[f['properties'] for f in grid['features'] if f['properties']['city']==city and f['properties']['eligible']==1 and f['properties']['summer_lst_median_c'] is not None]
  ranks=rankdata([p['summer_lst_median_c'] for p in observed],method='average');n=len(observed)
  for p,r in zip(observed,ranks):p['score_surface_temperature']=round(100*(r-1)/(n-1),4) if n>1 else 50
 for f in grid['features']:
  p=f['properties'];valid=p['eligible']==1 and all(p.get(k) is not None for k in FIELDS)
  p['model_status']='complete' if valid else 'outside_analysis' if not p['eligible'] else 'missing_income' if p.get('score_income_deprivation') is None else 'missing_surface_temperature'
  for key,w in WEIGHTS.items():p[key]=round(sum(p[k]*v for k,v in zip(FIELDS,w)),4) if valid else None
  a=sorted(p[k] for k in WEIGHTS) if valid else []
  p['priority_consensus']=round((a[1]+a[2])/2,4) if valid else None
  p['priority_range']=round(a[-1]-a[0],4) if valid else None
  p['score_ge_80_scenario_count']=int(sum(v>=80 for v in a)) if valid else None
 project=Transformer.from_crs(4326,3035,always_xy=True).transform
 bycity={}
 for city in ['Amsterdam','Brussels']:
  rows=[f for f in grid['features'] if f['properties']['city']==city and f['properties']['eligible']==1];polys=[transform(project,shape(f['geometry'])) for f in rows];bycity[city]=(rows,polys,STRtree(polys))
 sourceareas={r['id']:r for r in income['neighbourhood_rows']}
 allareas=[]
 for f in geo['features']:
  p=f['properties'];city=p['city'];rows,polys,tree=bycity[city];g=transform(project,shape(f['geometry']));pairs=[]
  for i in tree.query(g,predicate='intersects'):
   area=g.intersection(polys[i]).area
   if area>1e-6:pairs.append((area,rows[i]['properties']))
  total=sum(a for a,r in pairs);valid=[(a,r) for a,r in pairs if r['priority_balanced'] is not None];completearea=sum(a for a,r in valid);coverage=100*completearea/total if total else 0;complete=coverage>=99.9 and bool(valid)
  for k in list(p):
   if k.startswith('priority_') or 'population' in k or 'impervious' in k or k=='priority_income':p.pop(k)
  for key in [*FIELDS,*WEIGHTS,'priority_consensus','priority_range']:
   p[key]=round(sum(a*r[key] for a,r in valid)/completearea,4) if complete else None
  p['model_coverage_pct']=round(coverage,4);p['income_coverage_pct']=round(coverage,4);p['model_status']='complete' if complete else 'incomplete_three_indicator_coverage'
  p['ranking_eligible']=bool(p['eligible_coverage_pct']>=50 and complete)
  p['data_quality']='sufficient three-indicator coverage' if p['ranking_eligible'] else 'insufficient three-indicator coverage'
  p['income_median_standardized_eur']=sourceareas.get(p['id'],{}).get('income_median_standardized_eur')
  p['income_status']=sourceareas.get(p['id'],{}).get('income_status','comparable_income_unavailable')
  allareas.append(p)
 metadata=income['metadata'];metadata.update(version='three-indicator-model-v2',publication='all four scenarios use surface temperature, green deficit and low income; no separate income scenario',scenario_weights=WEIGHTS,criteria=FIELDS,heat_source='Landsat 8/9 Collection 2 Level 2 JJA 2019–2023; observed median land-surface temperature; within-city average-rank percentile among eligible cells with observed LST',heat_reference_counts={'Amsterdam':843,'Brussels':732},income_reference_count=365,scored_eligible_cells=307,unscored_eligible_cells=642,brussels='no ranking until comparable income is available',not_in_scenario=['population','imperviousness','age','one-person households'],neighbourhood_summary='exact area-weighted mean of complete three-indicator cell scores; >=99.9% eligible overlap coverage and >=50% mapped neighbourhood coverage required')
 
 for obsolete in ['not_in_scenario','neighbourhoods_with_scenario','grid_sha256','boundary_sha256']:metadata.pop(obsolete,None)
 metadata['excluded_indicators']=['population','imperviousness','age','one-person households']
 metadata['counts']={city:{'eligible':sum(f['properties']['city']==city and f['properties']['eligible']==1 for f in grid['features']),'ranked_cells':sum(f['properties']['city']==city and f['properties']['priority_balanced'] is not None for f in grid['features']),'ranked_neighbourhoods':sum(p['city']==city and p['ranking_eligible'] for p in allareas)} for city in bycity}
 # The original model validation and scale sensitivity concern a superseded index.
 evidence={'current_model':metadata,'validation_status':'No predictive validation or 500m/1km sensitivity result is claimed for this revised three-indicator index.'}
 (O/'grid_priority.geojson').write_text(json.dumps(grid,separators=(',',':')))
 (O/'neighbourhood_priority.geojson').write_text(json.dumps(geo,separators=(',',':')))
 (O/'neighbourhood_priority.json').write_text(json.dumps({'method':'exact polygon overlap; complete three-indicator cell scores; >=99.9% score coverage and >=50% mapped area','rows':allareas},separators=(',',':')))
 (O/'evidence.json').write_text(json.dumps(evidence,separators=(',',':')))
 publicrows=[f['properties'] for f in grid['features'] if f['properties']['city']=='Amsterdam']
 (O/'amsterdam_income.json').write_text(json.dumps({'metadata':metadata,'grid_rows':[{k:v for k,v in p.items() if k in ['grid_id','city','eligible','model_status','summer_lst_median_c',*FIELDS,*WEIGHTS,'priority_consensus','priority_range'] or k.startswith('income_')} for p in publicrows],'neighbourhood_rows':[p for p in allareas if p['city']=='Amsterdam']},separators=(',',':')))
 with (O/'amsterdam_income_grid.csv').open('w') as h:
  keys=['grid_id','eligible','summer_lst_median_c',*FIELDS,'income_proxy_eur','income_coverage_pct','model_status',*WEIGHTS,'priority_consensus'];w=csv.DictWriter(h,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(publicrows)
 (R/'data/prepared/amsterdam_income/grid_audit.json').write_text(json.dumps(metadata,indent=2))
 print(json.dumps(metadata['counts'],indent=2))
if __name__=='__main__':main()
