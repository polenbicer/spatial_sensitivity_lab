"""Brussels Monitoring neighbourhood model. Native income and direct raster statistics.

Source: IBSA/Statbel indicator 2498, income 2023. Separate within-city model.
Pixel centres define polygon membership; missing observations remain null.
"""
from pathlib import Path
import csv, hashlib, json, warnings, numbers
import openpyxl
warnings.filterwarnings("ignore", category=DeprecationWarning)
import numpy as np
import rasterio
from rasterio.features import geometry_mask, geometry_window
from rasterio.warp import reproject, Resampling
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer
from scipy.stats import rankdata

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'data/source/brussels_neighbourhood'
OUT=ROOT/'public/data'
PREP=ROOT/'data/prepared/brussels_neighbourhood'
WEIGHTS={'priority_balanced':[.4,.3,.3],'priority_income_led':[.25,.2,.55],'priority_heat_led':[.6,.2,.2],'priority_nature_deficit_led':[.25,.55,.2]}
FIELDS=['score_surface_temperature','score_green_deficit','score_income_deprivation']
URLS={
 'income':'https://geodata.perspective.brussels/api/geodata/mdq/table/65707/fr',
 'definition':'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet&SubTheme=28',
 'definition_report':'https://ibsa.brussels/sites/default/files/publication/documents/Pano_SE25_FR.pdf',
 'boundaries':'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/exports/geojson',
 'worldcover':'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N48E003_Map.tif',
 'landsat':'https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2',
}

def window_data(ds, geom):
    try:win=geometry_window(ds,[mapping(geom)])
    except rasterio.errors.WindowError:return None
    a=ds.read(1,window=win);tr=ds.window_transform(win)
    inside=geometry_mask([mapping(geom)],a.shape,tr,invert=True,all_touched=False)
    return a,tr,inside,win

def main():
    PREP.mkdir(parents=True,exist_ok=True)
    boundaries=json.loads((SRC/'boundaries.geojson').read_text())['features']
    workbook=openpyxl.load_workbook(SRC/'income_2498_2023.xlsx',read_only=True,data_only=True)
    records=[row for row in workbook.active.values if row[0] is not None and str(row[0])!='code']
    income={str(int(row[0])):{'code':str(int(row[0])),'name':row[1],'value':float(row[2]) if isinstance(row[2],numbers.Real) else None,'source_value':row[2]} for row in records}
    assert len(income)==145 and sum(r['value'] is not None for r in income.values())==118
    assert len(boundaries)==145
    assert set(income)==set(str(int(f['properties']['mdzone'])) for f in boundaries)
    (SRC/'income_2498_2023.json').write_text(json.dumps({'indicator':2498,'year':2023,'unit':'EUR','definition':'Median equivalised after-tax income of residents','rows':list(income.values())},ensure_ascii=False,indent=2))
    project=Transformer.from_crs(4326,3035,always_xy=True).transform
    features=[]
    with rasterio.open(SRC/'worldcover_2021.tif') as wc,rasterio.open(ROOT/'data/source/amsterdam_neighbourhood/landsat_lst_2019_2023_jja.tif') as lst:
        assert lst.descriptions[0]=='summer_lst_median_c' and lst.crs.to_epsg()==3035
        for f in boundaries:
            b=f['properties'];code=str(int(b['mdzone']));g=shape(f['geometry']);gp=transform(project,g)
            a,tr,inside,win=window_data(wc,g)
            # Geographic raster rows have different pixel areas. Cos(latitude)
            # weights preserve area proportions without changing class membership.
            latitude=tr.f+(np.arange(a.shape[0])+.5)*tr.e
            weights=np.broadcast_to(np.cos(np.deg2rad(latitude))[:,None],a.shape)
            observed=inside&(a!=0);total=float(weights[inside].sum());valid=float(weights[observed].sum())
            water=float(weights[observed&(a==80)].sum())
            green=float(weights[observed&np.isin(a,[10,30])].sum())
            landweight=valid-water
            green_pct=100*green/landweight if landweight>0 else None
            water_pct=100*water/valid if valid else None
            thermal=window_data(lst,gp);temperature=None;tcov=0.;nvalid=0;nland=0
            if thermal:
                t,tt,ti,tw=thermal
                landclass=np.zeros(t.shape,dtype='uint8')
                reproject(rasterio.band(wc,1),landclass,src_transform=wc.transform,src_crs=wc.crs,dst_transform=tt,dst_crs=lst.crs,resampling=Resampling.nearest)
                land=ti&(landclass!=0)&(landclass!=80)
                count=lst.read(2,window=tw)
                usable=land&np.isfinite(t)&np.isfinite(count)&(count>0)
                nland=int(land.sum());nvalid=int(usable.sum())
                tcov=100*nvalid/nland if nland else 0.
                temperature=float(np.median(t[usable])) if nvalid else None
            inc=income.get(code);value=inc['value'] if inc else None
            coverage=100*valid/total if total else 0
            issues=[]
            if value is None:issues.append('income_not_published')
            if coverage<99 or green_pct is None:issues.append('insufficient_land_cover')
            if temperature is None or tcov<50:issues.append('insufficient_observed_temperature')
            p={
                'id':'Brussels:'+code+'.0','city':'Brussels','neighbourhood_code':code,'neighbourhood_name':inc['name'],
                'official_area_m2':round(gp.area,2),'boundary_snapshot_date':'2026-10-25','spatial_unit':'monitoring_neighbourhood',
                'income_median_equivalised_after_tax_eur':value,'income_period':'2023','income_indicator':'IBSA_2498',
                'income_record_id':code,'income_status':'published' if value is not None else 'not_published_in_source',
                'income_coverage_pct':100 if value is not None else 0,
                'cooling_green_pct':round(green_pct,6) if green_pct is not None else None,
                'green_deficit_pct':round(100-green_pct,6) if green_pct is not None else None,
                'water_pct':round(water_pct,6) if water_pct is not None else None,
                'summer_lst_median_c':round(temperature,6) if temperature is not None else None,
                'land_cover_coverage_pct':round(coverage,6),'thermal_coverage_pct':round(tcov,6),
                'thermal_observed_pixels':nvalid,'thermal_land_pixels':nland,
                'ranking_eligible':not issues,'eligible':int(not issues),
                'model_status':'complete' if not issues else ';'.join(issues),
                'data_quality':'sufficient raster and income coverage' if not issues else '; '.join(issues).replace('_',' '),
                'aggregation':'native neighbourhood income; direct raster zonal statistics',
            }
            features.append({'type':'Feature','geometry':f['geometry'],'properties':p})
    complete=[f['properties'] for f in features if f['properties']['ranking_eligible']]
    for key,raw,inverse in zip(FIELDS,['summer_lst_median_c','green_deficit_pct','income_median_equivalised_after_tax_eur'],[False,False,True]):
        ranks=rankdata([p[raw] for p in complete],method='average');n=len(complete)
        for f in features:f['properties'][key]=None
        for p,r in zip(complete,ranks):p[key]=round(100*((n-r) if inverse else (r-1))/(n-1),6) if n>1 else 50.
    for f in features:
        p=f['properties'];ok=p['ranking_eligible']
        for k,w in WEIGHTS.items():p[k]=round(sum(p[x]*v for x,v in zip(FIELDS,w)),6) if ok else None
        vals=sorted(p[k] for k in WEIGHTS) if ok else []
        p['priority_consensus']=round((vals[1]+vals[2])/2,6) if ok else None
        p['priority_range']=round(vals[-1]-vals[0],6) if ok else None
        p['score_ge_80_scenario_count']=int(sum(x>=80 for x in vals)) if ok else None
    metadata={
        'version':'brussels-native-neighbourhood-v1','retrieved':'2026-10-25','spatial_unit':'monitoring_neighbourhood',
        'official_neighbourhoods':145,'published_income_neighbourhoods':118,'ranked_neighbourhoods':len(complete),
        'missing_income_neighbourhoods':27,'scenario_weights':WEIGHTS,'criteria':FIELDS,
        'normalization':'average-rank percentiles 0–100 among the same complete eligible Brussels neighbourhoods; income reversed; ties equal',
        'income_definition':'IBSA/Statbel indicator 2498: median equivalised after-tax income of residents, 2023. Household composition adjusted. Based on tax statistics and National Register; not administrative disposable income.',
        'income_scope_limit':'Tax-exempt income such as child allowances and social integration income is not included. Some international-employment and property/capital income is absent or underestimated. See IBSA Panorama 2025 pp.50–54 for the definition and its limitations.',
        'income_comparability':'Different definition from Amsterdam O&S IHHINK_MED (non-equivalised disposable household income). Each city is normalized and ranked separately; euros and scores must not be used as a cross-city income or performance comparison.',
        'income_missing_note':'27 of 145 source rows contain a dash. Preserve as null. The Monitoring geography includes 118 residential neighbourhoods and 27 other areas; do not infer zero income or zero need.',
        'green_method':'ESA WorldCover 2021 v200; classes 10 tree cover + 30 grassland / observed non-water polygon pixels; deficit=100-green%; cos(latitude) row weights',
        'heat_method':'Median of finite band-1 summer LST pixels with band-2 valid_count>0 inside the polygon and non-water WorldCover mask; native 30 m raster',
        'raster_membership':'pixel-centre inclusion, all_touched=False; nearest-neighbour WorldCover thermal mask',
        'analyst_coverage_rules':{'land_cover_min_pct':99,'thermal_land_min_pct':50},
        'coverage_note':'Thresholds are analyst choices. Spatial coverage is not household coverage.',
        'grid_used':False,'sources':URLS,
        'landsat_limit':'Existing project composite JJA 2019–2023; original scene-selection/cloud-mask script is unavailable. Zonal extraction is reproducible from the supplied composite.',
        'sha256':{n:hashlib.sha256((SRC/n).read_bytes()).hexdigest() for n in ['boundaries.geojson','income_2498_2023.xlsx','worldcover_2021.tif']},
    }
    metadata['landsat_sha256']=hashlib.sha256((ROOT/'data/source/amsterdam_neighbourhood/landsat_lst_2019_2023_jja.tif').read_bytes()).hexdigest()
    existing=json.loads((OUT/'neighbourhood_priority.geojson').read_text())
    amsterdam=[f for f in existing['features'] if f['properties']['city']=='Amsterdam']
    combined={'type':'FeatureCollection','features':amsterdam+features}
    def write(path,payload):path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
    write(OUT/'neighbourhood_priority.geojson',combined)
    write(OUT/'neighbourhood_priority.json',{'method':'Native neighbourhood income and direct raster zonal statistics; each city normalized independently with its explicitly different income definition','rows':[f['properties'] for f in combined['features']]})
    write(OUT/'brussels_neighbourhoods.geojson',{'type':'FeatureCollection','features':features})
    write(OUT/'brussels_income.json',{'metadata':metadata,'neighbourhood_rows':[f['properties'] for f in features]})
    write(PREP/'audit.json',metadata)
    with (OUT/'brussels_neighbourhoods.csv').open('w',newline='',encoding='utf-8-sig') as h:
        w=csv.DictWriter(h,fieldnames=list(features[0]['properties']));w.writeheader();w.writerows(f['properties'] for f in features)
    a=json.loads((OUT/'amsterdam_income.json').read_text())
    a['metadata']['brussels']='Brussels uses IBSA 2498 equivalised after-tax income in a separate within-city ranking; definitions differ.'
    a['metadata']['counts']['Brussels']={'ranked_neighbourhoods':len(complete)}
    write(OUT/'amsterdam_income.json',a)
    write(ROOT/'data/prepared/amsterdam_neighbourhood/audit.json',a['metadata'])
    write(OUT/'evidence.json',{'version':'native-neighbourhoods-two-income-definitions-v4','city_models':{'Amsterdam':a['metadata'],'Brussels':metadata},'validation_status':'No predictive validation or scale-sensitivity metric is claimed. Each city has its own complete-observation universe and income definition.'})
    write(OUT/'grid_priority.geojson',{'type':'FeatureCollection','features':[]})
    print(json.dumps({k:metadata[k] for k in ['official_neighbourhoods','published_income_neighbourhoods','ranked_neighbourhoods','missing_income_neighbourhoods']},indent=2))

if __name__=='__main__':main()
