"""Aggregate the existing social scenario using projected polygon overlap areas.

Uses committed inputs only; no downloads or changes to the social weighting.
Run after build_social_diagnostic.py (requires shapely and pyproj).
"""
import json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree

OUT = Path(__file__).resolve().parents[1] / 'public/data'
FIELDS = ['age65_pct', 'one_person_pct', 'social_diagnostic', 'priority_vulnerability_informed']

def main():
    grid = json.loads((OUT/'grid_priority.geojson').read_text())['features']
    social = {r[0]: dict(zip(FIELDS, [r[1], r[2], r[4], r[5]]))
              for r in json.loads((OUT/'social_diagnostic.json').read_text())}
    project = Transformer.from_crs(4326, 3035, always_xy=True).transform
    cells = [f for f in grid if f['properties']['eligible']]
    polygons = [transform(project, shape(f['geometry'])) for f in cells]
    tree = STRtree(polygons)
    results = []
    for f in json.loads((OUT/'neighbourhood_priority.geojson').read_text())['features']:
        p = f['properties']
        polygon = transform(project, shape(f['geometry']))
        overlaps = []
        for i in tree.query(polygon, predicate='intersects'):
            cell = cells[i]['properties']
            if cell['city'] != p['city']:
                continue
            area = polygon.intersection(polygons[i]).area
            values = social.get(cell['grid_id'], {})
            if area > 0 and values.get('priority_vulnerability_informed') is not None:
                overlaps.append((area, values))
        covered = sum(a for a, _ in overlaps)
        row = {'id': p['id'], 'social_coverage_pct': round(100*covered/polygon.area, 2)}
        for field in FIELDS:
            row[field] = round(sum(a*v[field] for a, v in overlaps)/covered, 3) if covered else None
        # Never turn missing social evidence into a zero vulnerability score.
        if row['social_coverage_pct'] < 50:
            row['priority_vulnerability_informed'] = None
        results.append(row)
    (OUT/'social_neighbourhoods.json').write_text(json.dumps(results, separators=(',', ':')))
    print(f'Built {len(results)} social neighbourhood summaries')

if __name__ == '__main__':
    main()
