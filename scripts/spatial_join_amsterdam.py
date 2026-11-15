"""Spatial join of the municipal heat-risk buurten (risicokaarten_tauw, layer 0) to the lab's 110 wijk polygons.

Fetches buurt geometry (EPSG:4326, GeoJSON) and computes, for every buurt, the share of its area that falls in each
wijk (areas in EPSG:28992 approximated by a local equal-area projection). Output:
data/source/extra/ams_buurt_wijk_overlap.json  {OBJECTID: {"name":..., "parts": {wijk_code: area_share}}}.
Runs in GitHub Actions (needs internet and shapely).
"""
import json, math, urllib.request, urllib.parse, pathlib
from shapely.geometry import shape
from shapely.ops import transform
from shapely.validation import make_valid

ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = 'https://services.arcgis.com/ZFXfOvgBZpGWrLdH/arcgis/rest/services/risicokaarten_tauw/FeatureServer/0/query'
feats, off = [], 0
while True:
    q = urllib.parse.urlencode({'where': '1=1', 'outFields': 'OBJECTID,NAME,HI_BS_AANTAL_INWONERS_V,HI_TOTAAL_S',
                                'returnGeometry': 'true', 'outSR': '4326', 'f': 'geojson',
                                'resultOffset': off, 'resultRecordCount': 200})
    page = json.load(urllib.request.urlopen(URL + '?' + q, timeout=120))['features']
    feats += page; off += len(page)
    if len(page) < 200: break
raw = ROOT / 'data/source/extra/raw/ams_risk_fs_layer0_geom.geojson'
raw.write_text(json.dumps({'type': 'FeatureCollection', 'features': feats}))

LAT0 = math.radians(52.37)
def proj(x, y, z=None):  # local equirectangular in metres; area error < 0.1% over Amsterdam
    return (math.radians(x) * 6371008.8 * math.cos(LAT0), math.radians(y) * 6371008.8)
fix = lambda g: transform(proj, make_valid(g)).buffer(0)

wijk = [(f['properties']['neighbourhood_code'], fix(shape(f['geometry'])))
        for f in json.loads((ROOT / 'public/data/amsterdam_neighbourhoods.geojson').read_text())['features']]
out, unmatched = {}, 0
for f in feats:
    if not f.get('geometry'): unmatched += 1; continue
    g = fix(shape(f['geometry'])); A = g.area
    parts = {c: round(g.intersection(w).area / A, 4) for c, w in wijk if A > 0 and g.intersects(w)}
    parts = {c: s for c, s in parts.items() if s >= 0.001}
    p = f['properties']
    out[str(p['OBJECTID'])] = {'name': p['NAME'], 'parts': parts, 'covered': round(sum(parts.values()), 4)}
(ROOT / 'data/source/extra/ams_buurt_wijk_overlap.json').write_text(json.dumps(out, ensure_ascii=False, indent=0))
cov = [v['covered'] for v in out.values()]
print(len(feats), 'buurten;', sum(c >= 0.95 for c in cov), '>=95% inside wijk polygons;',
      sum(len(v['parts']) == 1 for v in out.values()), 'in a single wijk; no geometry', unmatched)
