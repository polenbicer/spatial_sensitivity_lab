# Social indicator source snapshots

Retrieved 29 September 2026 from IBSA Monitoring des Quartiers, Compare territories, all 145 monitoring neighbourhoods. Files preserve the displayed table values, including `ND` (not available) and `VS` (suppressed/special area).

- `ibsa_neighbourhood_2025.json`: indicator 2333, share of population aged 65+ (%); 2379, isolated people aged 30+ as share of private households (%); 2316, isolated people under 30 as share of private households (%). The latter two sum to the one-person-household share. Data source: IBSA and Statbel National Register. Units and latest year were confirmed on the portal.
- `ibsa_income_2023.json`: indicator 2336, median net taxable income per tax declaration (€), 2023. This is not disposable household income and is diagnostic metadata only. Data source: IBSA and Statbel fiscal income statistics.
- `ibsa_boundaries.geojson`: downloaded from the Brussels City portal, dataset `quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc`, 145 polygons. It is omitted from the repository to avoid duplicating the official distribution; the script fetches it if absent. Portal metadata on 29 September 2026: CC0 1.0, processed 06:02:01 UTC, attribution names IBSA/perspective.brussels. URL: https://opendata.brussels.be/explore/dataset/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/
- CBS Amsterdam neighbourhood data are fetched from StatLine table 86165NED by the build script. Population 65+ / total population and one-person / private household counts use 2025, with CBS published rounding. CBS StatLine CC BY 4.0.

The transformation is in `scripts/build_social_diagnostic.py`. Run `python3 -m pip install -r requirements-social.txt` and then `python3 scripts/build_social_diagnostic.py`. Its deterministic calculations use no random numbers. The upstream thermal Random Forest seed is unavailable because its training pipeline is not in this repository.
