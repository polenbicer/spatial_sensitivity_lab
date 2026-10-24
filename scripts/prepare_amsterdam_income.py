"""Prepare CBS neighbourhood income for the website; do not transfer to grid or publish.

Standard library only. Input: official CBS income time series workbook.
2023 incomes, 2025 regional division. Raw source values and missing markers retained.
"""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/source/amsterdam_income/CBS_income_time_series.xlsx'
OUT = ROOT / 'data/prepared/amsterdam_income'
URL = 'https://download.cbs.nl/regionale-kaarten/Tijdreeks_wijken_en_buurten_inkomenvermogen2.XLSX'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    with zipfile.ZipFile(SOURCE) as z:
        strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        for _, row in ET.iterparse(z.open('xl/worksheets/sheet1.xml'), events=['end']):
            if row.tag != '{' + NS['m'] + '}row':
                continue
            values = {}
            for cell in row.findall('m:c', NS):
                v = cell.find('m:v', NS)
                v = v.text if v is not None else ''
                if cell.attrib.get('t') == 's' and v:
                    v = strings[int(v)]
                values[re.sub(r'\d', '', cell.attrib['r'])] = v
            if values.get('A', '').startswith('BU0363') and values.get('C') == '2023':
                raw = values.get('F', '')
                try:
                    number = float(raw)
                    assert math.isfinite(number) and number >= 0
                    income = round(number * 1000, 2)
                except ValueError:
                    income = None
                rows.append({
                    'id': 'Amsterdam:' + values['A'], 'city': 'Amsterdam',
                    'neighbourhood_code': values['A'], 'neighbourhood_name': values['B'],
                    'income_median_standardized_eur': income,
                    'income_status': 'published' if income is not None else 'not_published_reason_unspecified',
                    'income_source_raw': raw, 'income_year': 2023,
                    'income_boundary_year': 2025,
                })
            row.clear()
    assert len(rows) == len({r['id'] for r in rows}), 'Duplicate neighbourhood-year'
    valid = [r['income_median_standardized_eur'] for r in rows if r['income_status'] == 'published']
    assert valid, 'No numeric income observations'
    for r in rows:
        v = r['income_median_standardized_eur']
        # Descending midrank: lower income gives higher deprivation priority.
        r['score_income_deprivation'] = round(100 * (sum(x > v for x in valid) + .5 * sum(x == v for x in valid)) / len(valid), 4) if v is not None else None
    website = [f['properties'] for f in json.loads((ROOT / 'public/data/neighbourhood_priority.geojson').read_text())['features'] if f['properties']['city'] == 'Amsterdam']
    by_code = {r['neighbourhood_code']: r for r in rows}
    overlay = []
    for p in website:
        source = by_code.get(p['neighbourhood_code'])
        overlay.append({
            'id': p['id'], 'city': 'Amsterdam', 'neighbourhood_code': p['neighbourhood_code'],
            'neighbourhood_name': p['neighbourhood_name'],
            'income_source_name': source['neighbourhood_name'] if source else None,
            'income_median_standardized_eur': source['income_median_standardized_eur'] if source else None,
            'score_income_deprivation': source['score_income_deprivation'] if source else None,
            'income_status': source['income_status'] if source else 'boundary_code_unmatched',
            'income_source_raw': source['income_source_raw'] if source else None,
            'income_year': 2023, 'income_boundary_year': 2025,
        })
    meta = {
        'version': 'amsterdam-income-preparation-v1', 'source_url': URL,
        'source_page': 'https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/wijk-en-buurtstatistieken/tijdreeks-wijk-en-buurtcijfers',
        'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'source_sheet': 'REGIOTABEL2', 'source_column': 'F', 'source_unit': '1000 EUR',
        'indicator': 'Median standardised disposable household income',
        'population_unit': 'private households with observed income',
        'income_year': 2023, 'boundary_year': 2025,
        'score': 'descending midrank percentile among all published Amsterdam source buurten; 0-100; higher means lower income; ties equal',
        'grid_transfer': 'not performed', 'publication': 'staging only; not connected to live ranking',
        'missing_policy': 'null values; no zero substitution, no parent-area imputation, no name-based matching',
        'missing_reason': 'source non-publication confirmed by raw marker; individual cause not inferred',
        'boundary_policy': 'exact code join candidate; spatial boundaries must be checked before grid transfer',
        'comparability': 'Brussels equivalence scale, coverage and household/person weighting remain unresolved',
    }
    audit = {
        'source_neighbourhoods': len(rows), 'source_numeric': len(valid),
        'source_missing': len(rows) - len(valid), 'website_neighbourhoods': len(overlay),
        'website_status_counts': dict(Counter(r['income_status'] for r in overlay)),
        'website_unmatched_codes': [r['neighbourhood_code'] for r in overlay if r['income_status'] == 'boundary_code_unmatched'],
        'source_codes_without_website_boundary': sorted(set(by_code) - {p['neighbourhood_code'] for p in website}),
        'name_differences': [{'code': r['neighbourhood_code'], 'website': r['neighbourhood_name'], 'source': r['income_source_name']} for r in overlay if r['income_source_name'] is not None and r['neighbourhood_name'] != r['income_source_name']],
    }
    assert all(r['score_income_deprivation'] is None for r in overlay if r['income_status'] != 'published')
    ordered = sorted((r for r in rows if r['income_status'] == 'published'), key=lambda r: r['income_median_standardized_eur'])
    assert all(a['score_income_deprivation'] >= b['score_income_deprivation'] for a, b in zip(ordered, ordered[1:])), 'Wrong score direction'
    for name, data in [('amsterdam_income_neighbourhoods_2023.json', rows), ('amsterdam_income_website_overlay.json', overlay), ('metadata.json', meta), ('audit.json', audit)]:
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    with (OUT / 'amsterdam_income_neighbourhoods_2023.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
