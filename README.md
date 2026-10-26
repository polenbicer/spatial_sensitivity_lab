# Spatial Sensitivity Lab

Research demonstrator by Polen Biçer, Urban Studies VUB–ULB.

Amsterdam uses 110 official 2022 wijk polygons, direct O&S IHHINK_MED household income (API period 2024), ESA WorldCover 2021 land cover and the existing Landsat JJA 2019–2023 composite. The model calculates physical indicators directly from source rasters inside each neighbourhood. It does not transfer income to 500 m cells. 108 wijken have published income; all 108 have all three indicators. Missing values remain null. Brussels uses IBSA/Statbel indicator 2498 (median equivalised after-tax income of residents, 2023) at Monitoring neighbourhood scale: 118 published/complete neighbourhoods out of 145. Its physical indicators are also calculated directly from source rasters. Income definitions differ; each city is normalized and ranked independently, without cross-city comparison.

All four scenarios use surface temperature, green deficit and low income, with unchanged weights of 40/30/30, 25/20/55, 60/20/20 and 25/55/20. The scenario median is a statistical summary, not democratic agreement.

See [methods](https://spatialsensitivitylab.vercel.app/methods.html), `data/prepared/amsterdam_neighbourhood/README_TR.md` and the published source metadata for definitions and limits.

## Reproduce

Install requirements-neighbourhood.txt. Run `python3 scripts/fetch_amsterdam_neighbourhood_sources.py`; also place the supplied project composite at `data/source/amsterdam_neighbourhood/landsat_lst_2019_2023_jja.tif`. Run `python3 scripts/fetch_brussels_neighbourhood_sources.py` for the Brussels sources. Then run `python3 scripts/rebuild_priority_models.py` and `node scripts/validate-data.mjs`. The project composite is supplied in the Drive reproduction package. Original scene-selection/cloud-mask code is not available; only extraction from the supplied raster is reproducible here.

Build with `npm run build`. Earlier social-diagnostic and grid-income scripts are historical and do not define the current Amsterdam model.
