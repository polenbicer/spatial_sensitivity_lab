#!/usr/bin/env python3
"""Build a transparent neighbourhood-to-grid diagnostic from IBSA 2025 and CBS 2025.

Run after placing the IBSA table at data/source/ibsa_neighbourhood_2025.json.
The script fetches public CBS OData 86165NED and records its source URL.
"""
import json, math, urllib.request, urllib.parse
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform
from pyproj import Transformer
from scipy.stats import spearmanr,kendalltau

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/source/ibsa_neighbourhood_2025.json'
OUT=ROOT/'public/data'
CBS='https://opendata.cbs.nl/ODataApi/OData/86165NED/TypedDataSet'
params=urllib.parse.urlencode({'$filter':"startswith(WijkenEnBuurten,'BU0363')",'$select':'WijkenEnBuurten,AantalInwoners_5,k_65JaarOfOuder_12,HuishoudensTotaal_29,Eenpersoonshuishoudens_30','$top':'1000'})
CBS_URL=CBS+'?'+params

def percentile(v,values):
    values=sorted(values)
    return 100*sum(x<=v for x in values)/len(values)

def main():
    raw=json.loads(SOURCE.read_text())
    income_raw=json.loads((ROOT/'data/source/ibsa_income_2023.json').read_text())
    income={r[0]:float(r[2]) if r[2].isdigit() else None for r in income_raw[4:]}
    ibsa={}
    for row in raw[5:]:
        code,name,*vals=row
        def n(x):
            try:return float(x.replace(',','.'))
            except:return None
        a,b,c=map(n,vals)
        ibsa[str(int(code))]={'name':name,'age65_pct':a,'one_person_pct':None if b is None or c is None else b+c,'source_status':','.join(vals) if a is None else 'reported','median_taxable_income_eur':income.get(str(int(code)))}
    with urllib.request.urlopen(CBS_URL,timeout=30) as response:cbsrows=json.load(response)['value']
    cbs={}
    for x in cbsrows:
        pop,old,hh,one=[x.get(k) for k in ('AantalInwoners_5','k_65JaarOfOuder_12','HuishoudensTotaal_29','Eenpersoonshuishoudens_30')]
        cbs[x['WijkenEnBuurten'].strip()]={'age65_pct':100*old/pop if pop and old is not None else None,'one_person_pct':100*one/hh if hh and one is not None else None,'population':pop,'households':hh}
    boundaries=json.loads((OUT/'neighbourhood_priority.geojson').read_text())['features']
    boundary_path=ROOT/'data/source/ibsa_boundaries.geojson'
    if boundary_path.exists(): official_brussels=json.loads(boundary_path.read_text())['features']
    else:
        with urllib.request.urlopen('https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/exports/geojson',timeout=30) as response: official_brussels=json.load(response)['features']
    grid=json.loads((OUT/'grid_priority.geojson').read_text())
    forward=Transformer.from_crs(4326,3035,always_xy=True).transform
    by_city={city:[] for city in ('Brussels','Amsterdam')}
    for f in boundaries:
        p=f['properties'];city=p['city'];code=str(p['neighbourhood_code'])
        if city=='Brussels':continue
        record=ibsa.get(str(int(float(code)))) if city=='Brussels' else cbs.get(code)
        if not record:continue
        by_city[city].append((shape(f['geometry']),record,code,p['neighbourhood_name']))
    for f in official_brussels:
        p=f['properties'];code=str(int(p['mdzone']));record=ibsa.get(code)
        if record:by_city['Brussels'].append((shape(f['geometry']),record,code,p['namefre']))
    # Project both layers to EPSG:3035 for valid overlap areas in square metres.
    projected={city:[(transform(forward,g),r,c,n) for g,r,c,n in rows] for city,rows in by_city.items()}
    unmatched=[]
    for city in ('Brussels','Amsterdam'):
        used={str(int(float(c))) if city=='Brussels' else c for _,_,c,_ in by_city[city]}
        source=ibsa if city=='Brussels' else cbs
        unmatched += [{'city':city,'code':code,'name':r.get('name',''),'reason':'No matching boundary'} for code,r in source.items() if code not in used]
    for f in grid['features']:
        p=f['properties'];city=p['city'];geom=transform(forward,shape(f['geometry']))
        overlaps=[]
        for poly,r,code,name in projected[city]:
            if geom.intersects(poly):
                area=geom.intersection(poly).area
                if area>0:overlaps.append((area,r,code,name))
        p['social_overlap_count']=len(overlaps)
        for field in ('age65_pct','one_person_pct','median_taxable_income_eur'):
            usable=[(a,r.get(field)) for a,r,_,_ in overlaps if r.get(field) is not None]
            p[field]=round(sum(a*v for a,v in usable)/sum(a for a,_ in usable),3) if usable else None
            p[field+'_covered_area_pct']=round(100*sum(a for a,_ in usable)/geom.area,2) if usable else 0
        if city=='Brussels' and overlaps and any(r['age65_pct'] is None for _,r,_,_ in overlaps):
            p['social_missing_neighbourhoods']=[name for _,r,_,name in overlaps if r['age65_pct'] is None]
    for city in ('Brussels','Amsterdam'):
        eligible=[f['properties'] for f in grid['features'] if f['properties']['city']==city and f['properties']['eligible']]
        for field in ('age65_pct','one_person_pct','median_taxable_income_eur'):
            vals=[p[field] for p in eligible if p[field] is not None]
            for p in [f['properties'] for f in grid['features'] if f['properties']['city']==city]:
                p['score_'+field]=round(percentile(p[field],vals),2) if p[field] is not None else None
        for p in [f['properties'] for f in grid['features'] if f['properties']['city']==city]:
            a,b=p['score_age65_pct'],p['score_one_person_pct']
            p['social_diagnostic']=round((a+b)/2,2) if a is not None and b is not None else None
            p['priority_vulnerability_informed']=round(.30*p['score_impervious']+.20*p['score_green_deficit']+.20*p['score_population']+.30*p['social_diagnostic'],2) if p['social_diagnostic'] is not None and all(p.get(k) is not None for k in ('score_impervious','score_green_deficit','score_population')) else None
    # Preserve missingness: cells without both social measures have no new scenario score.
    overlay=[[p['grid_id'],p.get('age65_pct'),p.get('one_person_pct'),p.get('median_taxable_income_eur'),p.get('social_diagnostic'),p.get('priority_vulnerability_informed'),p.get('age65_pct_covered_area_pct'),p.get('one_person_pct_covered_area_pct'),p.get('social_overlap_count')] for p in (f['properties'] for f in grid['features'])]
    (OUT/'social_diagnostic.json').write_text(json.dumps(overlay,separators=(',',':')))
    e=json.loads((OUT/'evidence.json').read_text())
    sensitivity=[]
    for city in ('Brussels','Amsterdam'):
        rows=[f['properties'] for f in grid['features'] if f['properties']['city']==city and f['properties']['eligible'] and f['properties']['priority_vulnerability_informed'] is not None]
        a=[p['priority_balanced'] for p in rows]; b=[p['priority_vulnerability_informed'] for p in rows]
        k=max(1,math.ceil(.2*len(rows))); topa=set(sorted(range(len(rows)),key=lambda i:a[i],reverse=True)[:k]);topb=set(sorted(range(len(rows)),key=lambda i:b[i],reverse=True)[:k])
        sensitivity.append({'city':city,'n_complete_cells':len(rows),'spearman_balanced_vs_vulnerability':round(float(spearmanr(a,b).statistic),4),'kendall_balanced_vs_vulnerability':round(float(kendalltau(a,b).statistic),4),'top20_overlap_fraction':round(len(topa&topb)/k,4)})
    e['social_sensitivity_metrics']=sensitivity
    e['social_diagnostic_provenance']={'version':'v0.3','downloaded_utc':'2026-09-29','ibsa_source':'https://monitoringdesquartiers.brussels/tableaux','brussels_boundary_source':'https://opendata.brussels.be/explore/dataset/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/','brussels_boundary_license':'CC0 1.0; attribution requested to IBSA/perspective.brussels, Brussels City portal','brussels_boundary_processed_utc':'2026-09-29T06:02:01Z','ibsa_indicators':{'2333':'65+ share of total population, %, 2025','2316':'one-person households under 30 share of private households, %, 2025','2379':'one-person households 30+ share of private households, %, 2025','2336':'median net taxable income per tax declaration, EUR, 2023; diagnostic only'},'cbs_source':CBS_URL,'cbs_table':'86165NED, neighbourhoods 2025','transfer':'area-weighted polygon intersections in EPSG:3035; no within-neighbourhood household counts inferred','scenario_weights':{'impervious':.30,'green_deficit':.20,'population':.20,'social_diagnostic':.30},'unmatched':unmatched,'brussels_missing_codes':[{'code':c,**r} for c,r in ibsa.items() if r['age65_pct'] is None]}
    (OUT/'evidence.json').write_text(json.dumps(e,separators=(',',':')))
    print('CBS rows',len(cbs),'IBSA rows',len(ibsa),'unmatched',len(unmatched))
    for city in ('Brussels','Amsterdam'):
        rows=[f['properties'] for f in grid['features'] if f['properties']['city']==city and f['properties']['eligible']]
        print(city,'eligible',len(rows),'diagnostic coverage',sum(p['social_diagnostic'] is not None for p in rows),'new scenario',sum(p['priority_vulnerability_informed'] is not None for p in rows))
if __name__=='__main__':main()
