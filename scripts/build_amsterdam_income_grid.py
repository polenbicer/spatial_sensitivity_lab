"""Transfer 2023 CBS neighbourhood income to the site's 500 m analytical cells.

The result is an overlap-area-weighted proxy of neighbourhood medians, NOT a
cell household median. No household distribution or missing incomes are inferred.
"""
from pathlib import Path
import json, csv, hashlib
from collections import Counter
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from pyproj import Transformer
from scipy.stats import rankdata

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data'
SRC=ROOT/'data/prepared/amsterdam_income'
MIN_COVERAGE=99.9  # explicit analytical completeness threshold, not a CBS rule

def main():
    grid=json.loads((OUT/'grid_priority.geojson').read_text())['features']
    boundaries=json.loads((OUT/'neighbourhood_priority.geojson').read_text())['features']
    source={r['neighbourhood_code']:r for r in json.loads((SRC/'amsterdam_income_website_overlay.json').read_text())}
    forward=Transformer.from_crs(4326,3035,always_xy=True).transform
    areas=[]
    for f in boundaries:
        p=f['properties']
        if p['city']=='Amsterdam':
            geom=transform(forward,shape(f['geometry']))
            assert geom.is_valid, p['id']
            areas.append((geom,source[p['neighbourhood_code']]))
    assert len(areas)==519
    polygons=[g for g,r in areas];tree=STRtree(polygons)
    gridrows=[];intersections={};eligible_geoms={}
    for f in grid:
        p=f['properties']
        if p['city']!='Amsterdam':continue
        g=transform(forward,shape(f['geometry']));overlaps=[]
        assert g.area>0 and g.is_valid,p['grid_id']
        for i in tree.query(g,predicate='intersects'):
            poly,r=areas[i];a=g.intersection(poly).area
            if a>0.000001:overlaps.append((a,r,poly))
        allarea=sum(a for a,r,poly in overlaps)
        assert allarea<=g.area*1.001,('overlapping boundaries',p['grid_id'],allarea/g.area)
        known=[(a,r,poly) for a,r,poly in overlaps if r['income_median_standardized_eur'] is not None]
        knownarea=sum(a for a,r,poly in known)
        coverage=min(100,100*knownarea/g.area)
        complete=coverage>=MIN_COVERAGE
        proxy=sum(a*r['income_median_standardized_eur'] for a,r,poly in known)/knownarea if knownarea and complete else None
        record={'grid_id':p['grid_id'],'city':'Amsterdam','eligible':p['eligible'],'income_proxy_eur':round(proxy,2) if proxy is not None else None,'income_coverage_pct':round(coverage,4),'income_boundary_coverage_pct':round(min(100,100*allarea/g.area),4),'income_status':'complete_proxy' if complete else 'no_published_income' if not knownarea else 'incomplete_income_coverage','income_year':2023,'income_boundary_year':2025,'income_source_codes':[r['neighbourhood_code'] for a,r,poly in overlaps],'income_missing_codes':[r['neighbourhood_code'] for a,r,poly in overlaps if r['income_median_standardized_eur'] is None],'score_income_deprivation':None,'priority_income':None}
        gridrows.append(record)
        if p['eligible']==1:eligible_geoms[p['grid_id']]=(g,p)
    ranked=[r for r in gridrows if r['grid_id'] in eligible_geoms and r['income_proxy_eur'] is not None]
    # Equal-cell, within-Amsterdam reference; same rounded proxy gets same score.
    n=len(ranked);ranks=rankdata([r['income_proxy_eur'] for r in ranked],method='average')
    for r,rank in zip(ranked,ranks):
        score=100*(n-rank)/(n-1) if n>1 else 50
        r['score_income_deprivation']=round(float(score),4)
        p=eligible_geoms[r['grid_id']][1]
        r['priority_income']=round(.4*p['score_impervious']+.3*p['score_green_deficit']+.3*score,4)
    bygrid={r['grid_id']:r for r in gridrows}
    cellids=list(eligible_geoms);cellpolys=[eligible_geoms[k][0] for k in cellids];celltree=STRtree(cellpolys)
    neighrows=[]
    for poly,source_row in areas:
        overlap=[]
        for i in celltree.query(poly,predicate='intersects'):
            a=poly.intersection(cellpolys[i]).area
            if a>0.000001:overlap.append((a,bygrid[cellids[i]]))
        total=sum(a for a,r in overlap);known=[(a,r) for a,r in overlap if r['priority_income'] is not None]
        coverage=100*sum(a for a,r in known)/total if total else 0
        complete=coverage>=MIN_COVERAGE
        def mean(key):return round(sum(a*r[key] for a,r in known)/sum(a for a,r in known),4) if complete and known else None
        neighrows.append({'id':source_row['id'],'income_median_standardized_eur':source_row['income_median_standardized_eur'],'income_status':source_row['income_status'],'income_scenario_coverage_pct':round(coverage,4),'income_coverage_pct':round(coverage,4),'score_income_deprivation':mean('score_income_deprivation'),'priority_income':mean('priority_income'),'income_year':2023})
    metadata=json.loads((SRC/'metadata.json').read_text())
    boundary_audit=json.loads((SRC/'boundary_audit.json').read_text())
    assert boundary_audit['minimum_same_code_geometry_iou']>=.99
    metadata['boundary_verification']=boundary_audit
    metadata.update({'version':'amsterdam-income-grid-v1','publication':'income scenario enabled for Amsterdam only','grid_transfer':'exact polygon overlap in EPSG:3035; area-weighted mean of published neighbourhood medians; NOT a cell median or household estimate','boundary_source':'site CBS 2025 neighbourhood polygons, export_web_data.py layer amsterdam_neighbourhoods_2025','boundary_sha256':hashlib.sha256((OUT/'neighbourhood_priority.geojson').read_bytes()).hexdigest(),'grid_sha256':hashlib.sha256((OUT/'grid_priority.geojson').read_bytes()).hexdigest(),'minimum_income_coverage_pct':MIN_COVERAGE,'coverage_rule':'minimum 99.9% of clipped cell area; within 0.1% is a geometric tolerance, not income imputation; partial values remain unscored','score':'inverse average-rank percentile of rounded income proxy among eligible, complete-coverage Amsterdam cells; ties equal; lower income = higher score','scenario_weights':{'score_impervious':.4,'score_green_deficit':.3,'score_income_deprivation':.3},'neighbourhood_summary':'area-weighted mean of eligible cell scores, only if >=99.9% of eligible-cell overlap area has income scenario scores; direct source median also shown separately','not_in_scenario':['population','age','one-person households'],'reference_count':n,'grid_counts':dict(Counter(r['income_status'] for r in gridrows)),'eligible_cells':len(eligible_geoms),'scored_eligible_cells':n,'unscored_eligible_cells':len(eligible_geoms)-n,'neighbourhoods_with_scenario':sum(r['priority_income'] is not None for r in neighrows),'brussels':'no comparable neighbourhood income integrated; no income scenario score'})
    result={'metadata':metadata,'grid_rows':gridrows,'neighbourhood_rows':neighrows}
    (OUT/'amsterdam_income.json').write_text(json.dumps(result,separators=(',',':')))
    with (OUT/'amsterdam_income_grid.csv').open('w') as stream:
        fields=['grid_id','city','eligible','income_proxy_eur','income_coverage_pct','income_status','score_income_deprivation','priority_income','income_year','income_boundary_year']
        w=csv.DictWriter(stream,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(gridrows)
    (SRC/'grid_audit.json').write_text(json.dumps(metadata,indent=2))
    print(json.dumps({k:metadata[k] for k in ['grid_counts','eligible_cells','scored_eligible_cells','unscored_eligible_cells','neighbourhoods_with_scenario']},indent=2))

if __name__=='__main__':main()
