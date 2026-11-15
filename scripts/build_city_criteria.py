"""Build public/data/city_criteria.json from the raw sources fetched by .github/workflows/fetch-sources.yml.

1. Brussels: the five criteria the City of Brussels declared for its heat-island study (Council file, 9 Sept 2024):
   temperature, population density, age, income, access to green. Test rule fixed in the thesis (section 5.4,
   15 November 2026) before results were seen: weights 0.10-0.40 in 0.05 steps summing to 1; a Monitoring area
   'stands out' when it is in the top quartile of complete areas in the City of Brussels; consistent if it stands out
   in >= 3/4 of combinations, inconsistent if < 1/4, otherwise undetermined. Choices that the rule left open
   (universe of areas, green-access indicator) are reported as variants, not selected after the fact.
2. Amsterdam: the municipal heat-risk map (risicokaarten_tauw FeatureServer). The total is reproduced as the mean of four
   categories, each the mean of its 1-5 indicator scores; buurten are aggregated to wijken (population-weighted) by
   official buurt name and compared with the prototype's scenarios (Spearman).
"""
from pathlib import Path
import json, itertools, re, unicodedata
import openpyxl
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/source/extra/raw'; TAB = ROOT / 'data/source/extra/mdq_tables'
prio = json.loads((ROOT / 'public/data/neighbourhood_priority.json').read_text())['rows']
dist = json.loads((ROOT / 'public/data/neighbourhood_districts.json').read_text())['districts']

def mdq(fname):
    ws = openpyxl.load_workbook(TAB / fname, read_only=True)['Données']
    rows = list(ws.iter_rows(values_only=True))
    title, year = rows[0][2], rows[1][2]
    vals = {}
    for r in rows[7:]:
        if r[0] is None: continue
        try: v = float(str(r[2]).replace(',', '.'))
        except (TypeError, ValueError): v = None
        vals[int(float(r[0]))] = v
    return {'title': title, 'year': year, 'values': vals}

def pct(vals):
    n = len(vals); o = sorted(range(n), key=lambda i: vals[i]); rk = [0] * n; i = 0
    while i < n:
        j = i
        while j + 1 < n and vals[o[j + 1]] == vals[o[i]]: j += 1
        for k in range(i, j + 1): rk[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return [100 * (x - 1) / (n - 1) for x in rk]

def spearman(a, b):
    ra, rb = pct(a), pct(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return num / (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** .5

# ---------- Brussels ----------
SRC = {'density': ('2259_65614.xlsx', 2259), 'age65': ('2333_65327.xlsx', 2333), 'age80': ('2365_65453.xlsx', 2365),
       'isolated65': ('2159_65281.xlsx', 2159), 'green_access': ('2338_23223.xlsx', 2338)}
B = {k: mdq(f) | {'indicator_id': i} for k, (f, i) in SRC.items()}
VULN = {'Nord': [21], 'Laeken': [19, 20], 'Neder-over-Hembeek': [77], 'Pentagone': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
grid = [w for w in itertools.product([x / 100 for x in range(10, 45, 5)], repeat=5) if abs(sum(w) - 1) < 1e-9]
bru = [r for r in prio if r['city'] == 'Brussels']
label = lambda r: dist.get(f"Brussels:{float(r['neighbourhood_code'])}", '')
universes = {'any_part': [r for r in bru if 'Bruxelles' in label(r) and r['eligible']],
             'wholly': [r for r in bru if label(r) == 'Bruxelles' and r['eligible']]}
variants = []
for uname, members in universes.items():
    for gmode in ['access_2012', 'deficit_current']:
        U = []
        for r in members:
            c = int(r['neighbourhood_code'])
            g = B['green_access']['values'].get(c) if gmode == 'access_2012' else r['green_deficit_pct']
            v = [r['summer_lst_median_c'], B['density']['values'].get(c), B['age65']['values'].get(c), r['income_median_equivalised_after_tax_eur'], g]
            if None not in v: U.append((c, r['neighbourhood_name'], v))
        n = len(U); top = -(-n // 4)
        signs = [1, 1, 1, -1, -1 if gmode == 'access_2012' else 1]
        P = [pct([s * x for x in col]) for s, col in zip(signs, zip(*[u[2] for u in U]))]
        hits = {u[0]: 0 for u in U}
        for w in grid:
            sc = [sum(w[k] * P[k][i] for k in range(5)) for i in range(n)]
            cut = sorted(sc, reverse=True)[top - 1]
            for i in range(n):
                if sc[i] >= cut - 1e-9: hits[U[i][0]] += 1
        share = {c: hits[c] / len(grid) for c in hits}
        verdict = lambda s: 'consistent' if s >= .75 else 'inconsistent' if s < .25 else 'undetermined'
        variants.append({'universe': uname, 'green': gmode, 'n_areas': n, 'top_quartile_size': top, 'combinations': len(grid),
            'listed': [{'quartier': q, 'code': c, 'name': next((u[1] for u in U if u[0] == c), None),
                        'share': share.get(c), 'verdict': verdict(share[c]) if c in share else 'not in universe'}
                       for q, cs in VULN.items() for c in cs],
            'not_listed_most_often_top': sorted([{'code': u[0], 'name': u[1], 'share': share[u[0]]} for u in U
                       if not any(u[0] in cs for cs in VULN.values())], key=lambda x: -x['share'])[:5]})

# ---------- Amsterdam ----------
risk = [x['attributes'] for x in json.loads((RAW / 'ams_risk_fs_layer0.json').read_text())['features']]
CAT = {'climate': ['HI_KO_PET_S'], 'exposure': ['HI_BS_ANTAL_INWONERS_S', 'HI_BS_SCHADUW_OP_LOOPGEBIEDEN_S', 'HI_BS_DRUK_OPENBARE_RUIMTE_S'],
       'sensitivity': ['HI_GV_AANTAL_65PLUS_S', 'HI_GV_AANTAL_LANGDURIG_ZIEKE_IN', 'HI_GV_AANTAL_LAAG_OPGELEIDEN_S',
                       'HI_GV_INWONERS_BEPERKT_MOBIEL_S', 'HI_GV_INWONERS_ONDER_SOCIAAL_MI', 'HI_GV_PANDEN_MET_KWETSBARE_GR_2'],
       'adaptive_capacity': ['HI_AV_LATK_S', 'HI_AV_TOEGANG_TOT_TUIN_S']}
recon = max(abs(sum(sum(r[f] for f in fs) / len(fs) for fs in CAT.values()) / 4 - r['HI_TOTAAL_S']) for r in risk)
implicit = {f: round(1 / 4 / len(fs), 4) for fs in CAT.values() for f in fs}
norm = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower())
cij = json.loads((RAW / 'ams_cijfers_BEVDICHT.json').read_text())['_embedded']['cijfers']
code = {norm(x['gebiedNaam']): x['gebiedCode'] for x in cij if x['gebiedType'] == 'Buurt'}
# v0.5.1: spatial join (scripts/spatial_join_amsterdam.py). Each buurt's population is allocated to wijken in
# proportion to the share of its area in each wijk (assumes uniform density within a buurt).
OVL = json.loads((ROOT / 'data/source/extra/ams_buurt_wijk_overlap.json').read_text())
def wijk_scores(mode):
    agg = {}
    for r in risk:
        pop = r['HI_BS_AANTAL_INWONERS_V'] or 0
        if mode == 'name':
            k = code.get(norm(r['NAME'])); parts = {k[:2]: 1.0} if k else {}
        else:
            parts = OVL[str(r['OBJECTID'])]['parts']
            if mode == 'majority' and parts: parts = {max(parts, key=parts.get): 1.0}
        for w, sh in parts.items():
            a = agg.setdefault(w, [0.0, 0.0]); a[0] += pop * sh * r['HI_TOTAAL_S']; a[1] += pop * sh
    return {w: a[0] / a[1] for w, a in agg.items() if a[1] > 0}
wijk = wijk_scores('area')
ams = [r for r in prio if r['city'] == 'Amsterdam' and r['eligible'] and r.get('neighbourhood_code') in wijk]
FIELDS = ['priority_balanced', 'priority_heat_led', 'priority_nature_deficit_led', 'priority_income_led',
          'score_surface_temperature', 'score_green_deficit', 'score_income_deprivation']
out = {
 'version': '0.5.1', 'built': '2026-11-15',
 'brussels': {'declared_criteria': ['surface temperature (Landsat, prototype)', 'population density (MDQ 2259)', 'share aged 65+ (MDQ 2333)',
                                    'median equivalised after-tax income (MDQ 2498)', 'access to public green (MDQ 2338) or green deficit (prototype)'],
              'sources': {k: {'indicator_id': v['indicator_id'], 'title': v['title'], 'year': v['year']} for k, v in B.items()},
              'vulnerable_quartiers_mapping': VULN, 'variants': variants},
 'amsterdam': {'buurten': len(risk), 'reconstruction_max_error': round(recon, 4), 'categories': CAT, 'implicit_indicator_weights': implicit,
               'wijken_compared': len(ams),
               'join': 'spatial: buurt population allocated to wijken by area share',
               'buurten_joined': len(OVL), 'buurten_in_single_wijk': sum(1 for v in OVL.values() if len(v['parts']) == 1),
               'spearman_with_prototype': {f: round(spearman([r[f] for r in ams], [wijk[r['neighbourhood_code']] for r in ams]), 2) for f in FIELDS},
               'robustness': {m: {'wijken': len(ws := wijk_scores(m)), 'buurten_used': (sum(1 for r in risk if code.get(norm(r['NAME']))) if m == 'name' else len(OVL)),
                                  'spearman_with_prototype': {f: round(spearman([r[f] for r in prio if r['city'] == 'Amsterdam' and r['eligible'] and r.get('neighbourhood_code') in ws],
                                                                                [ws[r['neighbourhood_code']] for r in prio if r['city'] == 'Amsterdam' and r['eligible'] and r.get('neighbourhood_code') in ws]), 2) for f in FIELDS}}
                              for m in ('majority', 'name')}},
}
(ROOT / 'public/data/city_criteria.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(json.dumps(out['amsterdam']['spearman_with_prototype']), out['amsterdam']['reconstruction_max_error'])
