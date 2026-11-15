"""Download raw source files listed in scripts/extra_sources.txt into data/source/extra/raw.

Each line: name<TAB>url. Responses are saved unchanged; a log records status, size and content type.
Used by .github/workflows/fetch-sources.yml because the analysis environment has no direct network access.
"""
from pathlib import Path
import json, urllib.request, datetime, http.cookiejar
root = Path(__file__).resolve().parents[1]
out = root / 'data/source/extra/raw'
out.mkdir(parents=True, exist_ok=True)
log = []
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
for line in (root / 'scripts/extra_sources.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'):
        continue
    name, url = line.split('\t', 1)
    entry = {'name': name, 'url': url, 'retrieved': datetime.datetime.utcnow().isoformat() + 'Z'}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (research; spatial_sensitivity_lab)', 'Accept': '*/*'})
        with opener.open(req, timeout=90) as r:
            body = r.read()
            entry.update(status=r.status, content_type=r.headers.get('Content-Type'), bytes=len(body))
        ext = 'json' if 'json' in (entry['content_type'] or '') else 'html' if 'html' in (entry['content_type'] or '') else 'csv' if 'csv' in (entry['content_type'] or '') else 'bin'
        (out / f'{name}.{ext}').write_bytes(body)
    except Exception as e:
        entry.update(status='error', error=repr(e)[:300])
    log.append(entry)
    print(entry)
(out / '_log.json').write_text(json.dumps(log, indent=1, ensure_ascii=False))
