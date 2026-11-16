"""5.5 sensitivity analysis. Rules: RULES.md (committed before this script ran)."""
import itertools, json, math
import numpy as np, pandas as pd
from scipy.stats import spearmanr

ROOT = __file__.rsplit('/analysis/', 1)[0]
SC = {'esit': (1/3, 1/3, 1/3), 'sicaklik': (.6, .2, .2), 'yesil': (.2, .6, .2), 'gelir': (.2, .2, .6)}
COLS = ['score_surface_temperature', 'score_green_deficit', 'score_income_deprivation']
PUB = {'esit': 'priority_balanced', 'sicaklik': 'priority_heat_led', 'yesil': 'priority_nature_deficit_led', 'gelir': 'priority_income_led'}
out = {}

for city in ['brussels', 'amsterdam']:
    raw = pd.read_csv(f'{ROOT}/public/data/{city}_neighbourhoods.csv', encoding='utf-8-sig')
    el = raw['ranking_eligible'].astype(str).str.lower() == 'true'
    d = raw[el].copy().reset_index(drop=True)
    N = len(d); q = math.ceil(N * 0.25)
    X = d[COLS].to_numpy(float)
    S = {k: X @ np.array(w) for k, w in SC.items()}
    # check against published scores
    chk = {k: float(np.max(np.abs(S[k] - d[PUB[k]].to_numpy(float)))) for k in SC}
    R = {k: pd.Series(-np.round(v, 4)).rank(method='average').to_numpy() for k, v in S.items()}
    top = {k: set(d['neighbourhood_name'][R[k] <= q]) for k in SC}
    pairs = {}
    for a, b in itertools.combinations(SC, 2):
        inter = len(top[a] & top[b]); uni = len(top[a] | top[b])
        pairs[f'{a}-{b}'] = dict(spearman=round(float(spearmanr(S[a], S[b]).statistic), 3), common_top=inter, jaccard=round(inter/uni, 3))
    robust = sorted(set.intersection(*top.values()))
    cnt = {n: sum(n in t for t in top.values()) for n in set.union(*top.values())}
    once = sorted(n for n, c in cnt.items() if c == 1)
    Rm = np.vstack([R[k] for k in SC]).T
    shift = Rm.max(1) - Rm.min(1)
    d['rank_esit'] = R['esit']; d['shift'] = shift
    for k in SC: d[f'rank_{k}'] = R[k]; d[f'score_{k}'] = S[k]
    # boundary: equal-weight score within +-5 of the top-quartile cutoff score
    cut = np.sort(S['esit'])[::-1][q-1]
    near = int(np.sum(np.abs(S['esit'] - cut) <= 5))
    # simplex scan
    W = [(a/20, b/20, (20-a-b)/20) for a in range(1, 19) for b in range(1, 20-a)]
    share = np.zeros(N)
    for w in W:
        r = pd.Series(-np.round(X @ np.array(w), 4)).rank(method='average').to_numpy()
        share += (r <= q)
    share /= len(W); d['scan_top_share'] = share
    # examples
    big = d.sort_values(['shift', 'rank_esit'], ascending=[False, True]).iloc[0]
    small = d[d.rank_esit <= 10].sort_values(['shift', 'rank_esit']).iloc[0]
    miss = raw[~el].sort_values('neighbourhood_name').iloc[0]
    def ex(r): return dict(name=r['neighbourhood_name'], ranks={k: float(r[f'rank_{k}']) for k in SC},
                           scores={k: round(float(r[f'score_{k}']), 1) for k in SC},
                           indicators=[round(float(r[c]), 1) for c in COLS], shift=float(r['shift']), scan_top_share=round(float(r['scan_top_share']), 3))
    out[city] = dict(N=N, top_q_size=q, published_score_max_abs_diff=chk, pairs=pairs,
        robust_top=robust, n_robust=len(robust), only_one_scenario=once, n_union_top=len(cnt),
        shift_median=float(np.median(shift)), shift_p90=float(np.percentile(shift, 90)), shift_max=float(shift.max()),
        n_shift_ge_20=int((shift >= 20).sum()), cutoff_score_esit=round(float(cut), 2), near_cutoff_pm5=near,
        scan_n=len(W), scan_always=int((share == 1).sum()), scan_never=int((share == 0).sum()),
        scan_between=int(((share > 0) & (share < 1)).sum()),
        examples=dict(large=ex(big), small=ex(small), missing=dict(name=miss['neighbourhood_name'], status=str(miss.get('model_status')), data_quality=str(miss.get('data_quality')))))
    d[['neighbourhood_code', 'neighbourhood_name'] + COLS + [f'score_{k}' for k in SC] + [f'rank_{k}' for k in SC] + ['shift', 'scan_top_share']] \
        .sort_values('rank_esit').to_csv(f'{ROOT}/analysis/sensitivity_5_5/{city}_results.csv', index=False)

json.dump(out, open(f'{ROOT}/analysis/sensitivity_5_5/summary.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
