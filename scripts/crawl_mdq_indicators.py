"""List Monitoring des Quartiers indicators: id, title, sibling indicators and the geodata table id of the default (latest) year.

Samples indicator pages, then visits every sibling id found, so each subtheme is covered once one of its ids is sampled.
Writes data/source/extra/mdq_indicator_index.json. Only page metadata is stored.
"""
from pathlib import Path
import re, json, html, time, urllib.request, http.cookiejar
root = Path(__file__).resolve().parents[1]
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def get(i):
    req = urllib.request.Request(f'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/{i}?tab=Sheet', headers={'User-Agent': 'Mozilla/5.0 (research; spatial_sensitivity_lab)'})
    try:
        with opener.open(req, timeout=40) as r:
            return r.read().decode('utf-8', 'ignore')
    except Exception:
        return None
index, queue, seen = {}, list(range(1, 3200, 9)) + [2498], set()
while queue:
    i = queue.pop(0)
    if i in seen: continue
    seen.add(i)
    s = get(i); time.sleep(0.05)
    if not s or 'IndicatorSelect' not in s: continue
    seg = s[s.find('IndicatorSelect'):]; seg = seg[:seg.find('</select>')]
    opts = [(int(v), html.unescape(t).strip()) for v, t in re.findall(r'<option[^>]*value="(\d+)"[^>]*>([^<]*)<', seg)]
    table = re.search(r'client/mdq/fr/(\d+)', s)
    years = re.findall(r'<option[^>]*value="(\d{4})"', s)
    title = dict(opts).get(i)
    index[i] = {'title': title, 'table_default_year': int(table.group(1)) if table else None, 'years': years[:30], 'siblings': [o[0] for o in opts]}
    for o, _ in opts:
        if o not in seen: queue.insert(0, o)
out = root / 'data/source/extra/mdq_indicator_index.json'
out.write_text(json.dumps(index, ensure_ascii=False, indent=1))
print(len(index), 'indicator pages indexed')
