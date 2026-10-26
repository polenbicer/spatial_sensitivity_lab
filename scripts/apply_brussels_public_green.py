"""Replace Brussels green indicator with explicitly public inventory polygons.
Run after the native neighbourhood builders. Retains existing income and heat.
"""
from pathlib import Path
import json,csv,hashlib,gzip,base64
from shapely.geometry import shape
from shapely.ops import transform,unary_union
from shapely import make_valid
from pyproj import Transformer
from scipy.stats import rankdata
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/data';SRC=ROOT/'data/source/brussels_neighbourhood'
raw=SRC/'public_green_spaces_2026-10-26.geojson.gz.b64'
raw_bytes=gzip.decompress(base64.b64decode(raw.read_bytes()))
source=json.loads(raw_bytes);assert len(source['features'])==1305
selected=[f for f in source['features'] if f['properties']['status_foncier']=='Public' and f['properties']['type_f'] in ['Espace vert','Espace public végétalisé']]
assert len(selected)==1204
known=unary_union([make_valid(shape(f['geometry'])) for f in selected])
unknown=unary_union([make_valid(shape(f['geometry'])) for f in source['features'] if f['properties']['status_foncier'] is None])
project=Transformer.from_crs(4326,31370,always_xy=True).transform
combined=json.loads((OUT/'neighbourhood_priority.geojson').read_text());features=[f for f in combined['features'] if f['properties']['city']=='Brussels']
weights={'priority_balanced':[.4,.3,.3],'priority_income_led':[.25,.2,.55],'priority_heat_led':[.6,.2,.2],'priority_nature_deficit_led':[.25,.55,.2]};fields=['score_surface_temperature','score_green_deficit','score_income_deprivation']
for f in features:
 p=f['properties'];g=make_valid(transform(project,shape(f['geometry'])));area=g.intersection(known).area;uncertain=g.intersection(unknown).area
 p.update(public_green_area_m2=round(area,6),public_green_unknown_area_m2=round(uncertain,6),green_denominator_area_m2=round(g.area,6),green_indicator='public_inventory_area_share',green_period='downloaded 2026-10-26; inventory reference year not verified',green_source='Bruxelles Environnement WFS public_green_spaces; status_foncier=Public',green_coverage_status='unresolved_inventory_features' if uncertain>.01 else 'classified_public_inventory')
 p['cooling_green_pct']=round(100*area/g.area,6) if uncertain<=.01 else None
 p['green_deficit_pct']=round(100-p['cooling_green_pct'],6) if p['cooling_green_pct'] is not None else None
 issues=[]
 if p['income_status']!='published':issues.append('income_not_published')
 if uncertain>.01:issues.append('unresolved_green_inventory')
 if p['summer_lst_median_c'] is None or p['thermal_coverage_pct']<50:issues.append('insufficient_observed_temperature')
 p.update(ranking_eligible=not issues,eligible=int(not issues),model_status='complete' if not issues else ';'.join(issues),data_quality='public-green inventory; income and observed temperature present' if not issues else ';'.join(issues),aggregation='polygon intersection with union of classified public-green inventory; native income and raster temperature')
complete=[f['properties'] for f in features if f['properties']['ranking_eligible']]
for key,rawkey,inverse in zip(fields,['summer_lst_median_c','green_deficit_pct','income_median_equivalised_after_tax_eur'],[False,False,True]):
 ranks=rankdata([p[rawkey] for p in complete],method='average');n=len(complete)
 for f in features:f['properties'][key]=None
 for p,r in zip(complete,ranks):p[key]=round(100*((n-r) if inverse else r-1)/(n-1),6)
for f in features:
 p=f['properties'];ok=p['ranking_eligible']
 for key,w in weights.items():p[key]=round(sum(p[x]*v for x,v in zip(fields,w)),6) if ok else None
 values=sorted(p[k] for k in weights) if ok else []
 p['priority_consensus']=round((values[1]+values[2])/2,6) if ok else None
 p['priority_range']=round(values[-1]-values[0],6) if ok else None
 p['score_ge_80_scenario_count']=int(sum(v>=80 for v in values)) if ok else None
income=json.loads((OUT/'brussels_income.json').read_text());m=income['metadata'];m.update(version='brussels-public-green-v2',retrieved='2026-10-26',ranked_neighbourhoods=len(complete),green_method='Union of 1204 classified Public-ownership polygons in official public_green_spaces WFS; clip by neighbourhood, divide by total polygon area (including water). Private and mixed ownership excluded. Two unclassified polygons cause null green values in affected neighbourhoods; no imputation. Not accessibility or cooling performance.',green_denominator_limit='Brussels denominator is full neighbourhood polygon area; Amsterdam provider uses land area excluding water. Area shares are not directly comparable across cities.',green_source_feature_count=1305,green_selected_feature_count=len(selected),green_missing_neighbourhoods=[f['properties']['neighbourhood_name'] for f in features if f['properties']['green_deficit_pct'] is None]);m['sources']['public_green']='https://ows.environnement.brussels/green?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=public_green_spaces&OUTPUTFORMAT=application%2Fvnd.geo%2Bjson&SRSNAME=EPSG%3A31370';m['sha256']['public_green_spaces_2026-10-26.geojson']=hashlib.sha256(raw_bytes).hexdigest()
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,separators=(',',':')))
write(OUT/'neighbourhood_priority.geojson',combined);write(OUT/'neighbourhood_priority.json',{'method':'Native neighbourhood public-green, temperature and income; separate city percentiles','rows':[f['properties'] for f in combined['features']]});write(OUT/'brussels_neighbourhoods.geojson',{'type':'FeatureCollection','features':features});write(OUT/'brussels_income.json',{'metadata':m,'neighbourhood_rows':[f['properties'] for f in features]})
e=json.loads((OUT/'evidence.json').read_text());e['city_models']['Brussels']=m;write(OUT/'evidence.json',e)
write(ROOT/'data/prepared/brussels_neighbourhood/audit.json',m)
a=json.loads((OUT/'amsterdam_income.json').read_text());a['metadata']['counts']['Brussels']['ranked_neighbourhoods']=len(complete);write(OUT/'amsterdam_income.json',a)
with (OUT/'brussels_neighbourhoods.csv').open('w',newline='',encoding='utf-8-sig') as h:
 w=csv.DictWriter(h,fieldnames=list(features[0]['properties']));w.writeheader();w.writerows(f['properties'] for f in features)
print(json.dumps({'selected_polygons':len(selected),'ranked':len(complete),'unknown_green':m['green_missing_neighbourhoods']},ensure_ascii=False))
