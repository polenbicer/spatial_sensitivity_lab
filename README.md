# Spatial Sensitivity Lab

Research demonstrator by Polen Biçer, Urban Studies VUB–ULB.

Amsterdam uses 110 official 2022 wijk polygons, direct O&S IHHINK_MED household income (2024 income, preliminary; population at 1 January 2024), ESA WorldCover 2021 land cover and the existing Landsat JJA 2019–2023 composite. The model calculates physical indicators directly from source rasters inside each neighbourhood. It does not transfer income to 500 m cells. 108 wijken have published income; all 108 have all three indicators. Missing values remain null. Brussels uses IBSA/Statbel indicator 2498 (median equivalised after-tax income of residents, 2023) at Monitoring neighbourhood scale: 118 published income values and 116 ranked neighbourhoods out of 145. Its physical indicators are also calculated directly from source rasters. Income definitions differ; each city is normalized and ranked independently, without cross-city comparison.

All four scenarios use surface temperature, green deficit and low income, with weights revised on 8 November 2026: exactly one third each, heat-first 60/20/20, green-first 20/60/20 and income-first 20/20/60. The scenario median is a supplementary statistical summary, not a fifth weighting or democratic agreement. Recalculate the published scores without changing the observations using `python3 scripts/reweight_scenarios.py`.

See [methods](https://spatialsensitivitylab.vercel.app/methods.html), `data/prepared/amsterdam_neighbourhood/README_TR.md` and the published source metadata for definitions and limits.

## Reproduce

Install requirements-neighbourhood.txt. Run `python3 scripts/fetch_amsterdam_neighbourhood_sources.py`; also place the supplied project composite at `data/source/amsterdam_neighbourhood/landsat_lst_2019_2023_jja.tif`. Run `python3 scripts/fetch_brussels_neighbourhood_sources.py` for the Brussels sources. Then run `python3 scripts/rebuild_priority_models.py` and `node scripts/validate-data.mjs`. The project composite is supplied in the Drive reproduction package. Original scene-selection/cloud-mask code is not available; only extraction from the supplied raster is reproducible here.

Build with `npm run build`. Earlier social-diagnostic and grid-income scripts are historical and do not define the current Amsterdam model.

Income documentation updated 27 October 2026 following Amsterdam O&S correspondence: excludes student households, institutional residents and households without income information; publication requires at least 100 remaining households. Definitive 2024 figures are expected in 2027. The confirmed historical 418/518 Buurt join is separate from the current 108/110 Wijk coverage. Scores, source values and weights are unchanged.

## Version 0.4 (15 November 2026)

Alignment with the thesis text; scores, observations and weights unchanged (verified: within-city percentiles, the four weighted sums and the scenario median were recomputed independently from the published observations and match the JSON, GeoJSON and CSV files exactly).

- Research question and sub-questions on the main page now match the thesis (three priority logics, AS1–AS3, K1–K4).
- The unlabelled RESILIO project overlay was removed from the Amsterdam map; `public/data/project_context.geojson` is kept for reference only.
- The challenge record now states the four evaluation conditions (K1–K4).
- Added a short justification of the three indicators, including their within-city rank correlations.
- Priority Lines: the fixed Brussels examples included two unranked areas (Industrie Sud, Industrie Nord), so the list never loaded; fixed.
- Policy simulation chat: disclaimer states that reactions are written by the researcher and are not resident opinion or research data.
- `data/prepared/amsterdam_neighbourhood/audit.json` documents the earlier buurt model and its earlier weights (40/30/30 etc.); it does not describe the current wijk model.

## Version 0.5 (15 November 2026): city criteria

New page `/city-criteria`, built by `python3 scripts/build_city_criteria.py` into `public/data/city_criteria.json`. The main lab's scores are unchanged.

- **Brussels:** the five criteria the City of Brussels declared for its heat-island study (temperature, population density, age, income, access to green), using Monitoring des Quartiers tables 2259, 2333 and 2338 (IBSA), tested with the rule fixed in the thesis before results were seen (weights 10–40% in 5-point steps; top quartile; consistent ≥ 3/4 of combinations, inconsistent < 1/4). Variants for the set of areas and the green indicator are all reported.
- **Amsterdam:** the municipal heat-risk map (`risicokaarten_tauw` FeatureServer, 498 buurten) is reproduced as the mean of four category means and compared with the lab's wijk rankings (population-weighted, matched by buurt name).
- **Data access:** the analysis environment has no direct internet access, so `.github/workflows/fetch-sources.yml` downloads the raw files (`scripts/fetch_extra_sources.py`, `scripts/crawl_mdq_indicators.py`) into `data/source/extra/`.
