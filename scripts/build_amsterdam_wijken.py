"""Amsterdam native-wijk model. Raster zonal statistics, never 500 m scores.

Input snapshots are downloaded by fetch_amsterdam_wijk_sources.py.
Pixel centres define polygon membership; missing observations remain null.
"""
from pathlib import Path
import csv, hashlib, json, warnings
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
SRC=ROOT/'data/source/amsterdam_wijk'
OUT=ROOT/'public/data'
PREP=ROOT/'data/prepared/amsterdam_wijk'
WEIGHTS={'priority_balanced':[.4,.3,.3],'priority_income_led':[.25,.2,.55],'priority_heat_led':[.6,.2,.2],'priority_nature_deficit_led':[.25,.55,.2]}
FIELDS=['score_surface_temperature','score_green_deficit','score_income_deprivation']
URLS={
 'income':'https://api.data.amsterdam.nl/v1/statistieken/v2/cijfers?indicator.id=3196&heeftBetrekkingOp=2024&_pageSize=1000',
 'definition':'https://api.data.amsterdam.nl/v1/statistieken/v2/indicatoren?naam=IHHINK_MED',
 'boundaries':'https://api.data.amsterdam.nl/v1/gebieden/wijken?_format=geojson&_pageSize=1000&geldigOp=2022-03-24',
 'worldcover':'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N51E003_Map.tif',
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
    boundaries=json.loads((SRC/'boundaries_2022.geojson').read_text())['features']
    records=json.loads((SRC/'income_2024.json').read_text())['_embedded']['cijfers']
    income={r['gebiedCode']:r for r in records if r['gebiedType']=='Wijk'}
    assert len(income)==108 and len(boundaries)==110
    assert len({f['properties']['code'] for f in boundaries})==len(boundaries)
    assert set(income)<=set(f['properties']['code'] for f in boundaries)
    project=Transformer.from_crs(4326,3035,always_xy=True).transform
    features=[]
    with rasterio.open(SRC/'worldcover_2021.tif') as wc,rasterio.open(SRC/'landsat_lst_2019_2023_jja.tif') as lst:
        assert lst.descriptions[0]=='summer_lst_median_c' and lst.crs.to_epsg()==3035
        for f in boundaries:
            b=f['properties'];code=b['code'];g=shape(f['geometry']);gp=transform(project,g)
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
            inc=income.get(code);value=inc['waarde'] if inc else None
            coverage=100*valid/total if total else 0
            issues=[]
            if value is None:issues.append('income_not_published')
            if coverage<99 or green_pct is None:issues.append('insufficient_land_cover')
            if temperature is None or tcov<50:issues.append('insufficient_observed_temperature')
            p={
                'id':'Amsterdam:'+code,'city':'Amsterdam','neighbourhood_code':code,'neighbourhood_name':b['naam'],
                'official_area_m2':round(gp.area,2),'boundary_date':'2022-03-24','spatial_unit':'wijk',
                'income_median_disposable_eur':value,'income_period':'2024','income_indicator':'IHHINK_MED',
                'income_record_id':inc['id'] if inc else None,'income_status':'published' if value is not None else 'not_published_in_source',
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
    for key,raw,inverse in zip(FIELDS,['summer_lst_median_c','green_deficit_pct','income_median_disposable_eur'],[False,False,True]):
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
        'version':'amsterdam-native-wijk-v3','retrieved':'2026-10-26','spatial_unit':'wijk','boundary_date':'2022-03-24',
        'official_neighbourhoods':len(features),'published_income_neighbourhoods':len(income),'ranked_neighbourhoods':len(complete),
        'missing_income_neighbourhoods':len(features)-len(income),'scenario_weights':WEIGHTS,'criteria':FIELDS,
        'normalization':'average-rank percentiles 0–100 among the same complete eligible Amsterdam neighbourhoods; income reversed; ties equal',
        'income_definition':'O&S IHHINK_MED: median disposable household income, not equivalised/standardised; student households and institutional residents excluded',
        'income_period_note':'API heeftBetrekkingOp=2024; tijdType=Peildatum; begindatum=2024-01-01. Do not infer a verified tax-income reference year.',
        'income_rounding_note':'Metadata describes rounding to hundreds; API values are not all multiples of 100. Published values retained unchanged.',
        'income_missing_note':'No 2024 Wijk record in the complete indicator response. Indicator metadata suppresses areas with fewer than 100 households; absence does not prove the reason for each neighbourhood.',
        'green_method':'ESA WorldCover 2021 v200; classes 10 tree cover + 30 grassland / observed non-water polygon pixels; green deficit=100-green%; geographic row-area weights cos(latitude)',
        'heat_method':'Median of finite band-1 summer LST composite pixels with band-2 valid_count>0, within each polygon and non-water WorldCover land mask; native 30 m raster',
        'raster_membership':'pixel-centre inclusion, all_touched=False; WorldCover nearest-neighbour resampled only for thermal land mask',
        'analyst_coverage_rules':{'land_cover_min_pct':99,'thermal_land_min_pct':50},
        'coverage_note':'Coverage thresholds are analyst choices, not provider rules. Coverage is spatial, not household coverage.',
        'grid_used':False,'sources':URLS,
        'landsat_composite_file':'ams_bru_landsat_lst_2019_2023_jja.tif',
        'landsat_limit':'Existing project composite, JJA 2019–2023. Original scene selection/cloud-mask script is not supplied; zonal extraction is reproducible from the supplied composite.',
        'brussels':'145 Monitoring areas; 118 ranked independently using equivalised after-tax income; income definitions differ',
        'counts':{'Amsterdam':{'ranked_neighbourhoods':len(complete)},'Brussels':{'ranked_neighbourhoods':118}},
        'sha256':{n:hashlib.sha256((SRC/n).read_bytes()).hexdigest() for n in ['boundaries_2022.geojson','income_2024.json','income_indicator.json','landsat_lst_2019_2023_jja.tif','worldcover_2021.tif']},
    }
    # Brussels observations are preserved without enabling its income ranking.
    existing=json.loads((OUT/'neighbourhood_priority.geojson').read_text())
    other=[f for f in existing['features'] if f['properties']['city']!='Amsterdam']
    combined={'type':'FeatureCollection','features':features+other}
    def write(path,payload):path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
    write(OUT/'neighbourhood_priority.geojson',combined)
    write(OUT/'neighbourhood_priority.json',{'method':'Amsterdam official wijken; Brussels Monitoring neighbourhoods; independent within-city rankings','rows':[f['properties'] for f in combined['features']]})
    write(OUT/'amsterdam_neighbourhoods.geojson',{'type':'FeatureCollection','features':features})
    write(OUT/'amsterdam_income.json',{'metadata':metadata,'neighbourhood_rows':[f['properties'] for f in features]})
    evidence=json.loads((OUT/'evidence.json').read_text());evidence['city_models']['Amsterdam']=metadata;write(OUT/'evidence.json',evidence)
    write(PREP/'audit.json',metadata)
    with (OUT/'amsterdam_neighbourhoods.csv').open('w',newline='',encoding='utf-8-sig') as h:
        w=csv.DictWriter(h,fieldnames=list(features[0]['properties']),lineterminator="\n");w.writeheader();w.writerows(f['properties'] for f in features)
    # Published grid is Brussels-only. Amsterdam has no cell ranking or income transfer.
    grid=json.loads((OUT/'grid_priority.geojson').read_text());grid['features']=[f for f in grid['features'] if f['properties']['city']!='Amsterdam'];write(OUT/'grid_priority.geojson',grid)
    (OUT/'amsterdam_income_grid.csv').unlink(missing_ok=True)
    print(json.dumps({k:metadata[k] for k in ['official_neighbourhoods','published_income_neighbourhoods','ranked_neighbourhoods','missing_income_neighbourhoods']},indent=2))

if __name__=='__main__':main()
