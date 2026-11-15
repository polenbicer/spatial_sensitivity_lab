"""Index Monitoring des Quartiers indicator pages (id, title, default-year geodata table) and download
the tables of heat-relevant indicators (density, age, living alone, young children, overcrowding, green).

Writes data/source/extra/mdq_indicator_index.json and data/source/extra/mdq_tables/<indicator>_<table>.xlsx.
"""
from pathlib import Path
import re, json, html, time, urllib.request, http.cookiejar
root = Path(__file__).resolve().parents[1]
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
UA = {'User-Agent': 'Mozilla/5.0 (research; spatial_sensitivity_lab)'}
def get(url):
    try:
        with opener.open(urllib.request.Request(url, headers=UA), timeout=40) as r:
            return r.read()
    except Exception:
        return None
index = {}
for i in range(1, 2700):
    b = get(f'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/{i}?tab=Sheet'); time.sleep(0.03)
    if not b: continue
    s = b.decode('utf-8', 'ignore')
    t = re.search(r'stat-sheet-title">\s*<h3[^>]*>([^<]*)</h3>', s)
    table = re.search(r'client/mdq/fr/(\d+)', s)
    if not t and not table: continue
    unit = re.search(r'Unit[ée]\s*</h5>\s*<div[^>]*>([^<]*)<', s)
    index[i] = {'title': html.unescape(t.group(1)).strip() if t else None,
                'table_default_year': int(table.group(1)) if table else None,
                'years': re.findall(r'<option[^>]*value="(\d{4})"', s)[:30]}
(root / 'data/source/extra/mdq_indicator_index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1))
print(len(index), 'indicator pages indexed')
want = re.compile(r"densit|65 ans|80 ans|personnes âgées|isolé|seules|0-2 ans|moins de 3|enfants|surpeupl|espaces? verts?|verdur", re.I)
out = root / 'data/source/extra/mdq_tables'; out.mkdir(parents=True, exist_ok=True)
for i, v in index.items():
    if v['title'] and v['table_default_year'] and want.search(v['title']):
        b = get(f"https://geodata.perspective.brussels/api/geodata/mdq/table/{v['table_default_year']}/fr")
        if b:
            (out / f"{i}_{v['table_default_year']}.xlsx").write_bytes(b)
            print('table', i, v['title'], len(b))
