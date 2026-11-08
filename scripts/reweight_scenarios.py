"""Reweight the published observations without repeating raster/source extraction.

No raw indicators, percentile scores, boundaries or eligibility rules change.
The legacy field priority_balanced now denotes exactly equal weighting.
"""
from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data'
WEIGHTS = json.loads((ROOT / 'lib/scenario-weights.json').read_text())
FIELDS = ['score_surface_temperature', 'score_green_deficit', 'score_income_deprivation']
REVISION = {
    'date': '2026-11-08',
    'definition': 'Equal baseline: exactly one third each. Heat, green deficit and income scenarios: symmetric 60/20/20.',
    'field_compatibility': 'priority_balanced now means equal weighting; priority_consensus remains a supplementary median of four scores.',
    'scope': 'Weights and derived scores only. Raw indicators, percentile normalization, boundaries, eligibility and missing values unchanged.',
}


def update(value):
    if isinstance(value, list):
        for item in value:
            update(item)
    elif isinstance(value, dict):
        if all(field in value for field in FIELDS) and 'city' in value:
            eligible = value.get('ranking_eligible', bool(value.get('eligible')))
            for key, weights in WEIGHTS.items():
                value[key] = round(sum(value[field] * weight for field, weight in zip(FIELDS, weights)), 6) if eligible else None
            scores = sorted(value[key] for key in WEIGHTS) if eligible else []
            value['priority_consensus'] = round((scores[1] + scores[2]) / 2, 6) if eligible else None
            value['priority_range'] = round(scores[-1] - scores[0], 6) if eligible else None
            value['score_ge_80_scenario_count'] = sum(score >= 80 for score in scores) if eligible else None
        if 'scenario_weights' in value:
            value['scenario_weights'] = WEIGHTS
            value['scenario_revision'] = REVISION
        for item in list(value.values()):
            if isinstance(item, (dict, list)):
                update(item)


def main():
    paths = list(OUT.glob('*.json')) + list(OUT.glob('*.geojson'))
    paths += [ROOT / 'data/prepared' / folder / 'audit.json' for folder in ['amsterdam_wijk', 'brussels_neighbourhood']]
    for path in paths:
        original = path.read_text()
        value = json.loads(original)
        update(value)
        content = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
        if json.loads(original) != value:
            path.write_text(content)
    geo = json.loads((OUT / 'neighbourhood_priority.geojson').read_text())
    for city in ['Amsterdam', 'Brussels']:
        rows = [feature['properties'] for feature in geo['features'] if feature['properties']['city'] == city]
        with (OUT / f'{city.lower()}_neighbourhoods.csv').open('w', newline='', encoding='utf-8-sig') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator='\n')
            writer.writeheader()
            writer.writerows(rows)
    print('Reweighted Amsterdam and Brussels; published JSON, GeoJSON, CSV and scenario metadata synchronized.')


if __name__ == '__main__':
    main()
