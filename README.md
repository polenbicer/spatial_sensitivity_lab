# Spatial Sensitivity Lab

## September 2026 review update

- Adds an explicit research question and explains why Amsterdam and Brussels are analytical cases rather than a city ranking.
- Clarifies that machine learning validates relationships with observed heat but does not authorize resource allocation.
- Replaces zero-valued placeholders with proper loading and error states.
- States that the median consensus remains a normative aggregation and that narrow score differences are not statistical confidence intervals.
- Separates the Amsterdam and Brussels boundary sources and exposes the core GeoJSON and evidence files for download.

Research demonstrator for an Urban Studies thesis on equitable urban cooling and the legitimacy of AI/data-supported spatial decision tools in Amsterdam and Brussels.

## What this release changes

- Removes Istanbul, Izmir and undocumented demonstrative scores.
- Replaces the 10-neighbourhood sample with 1,783 official-data-derived 500 m cells.
- Uses four explicit policy scenarios plus a median consensus result.
- Separates transparent multi-criteria priority scoring from Random Forest thermal validation.
- Adds Landsat validation metrics, spatial-scale sensitivity and a legitimacy audit.
- Makes the Brussels social-evidence gap explicit instead of filling it with an unsupported proxy.
- Retires the old policy game until it can be rebuilt from validated data.

## Run locally

```bash
pnpm install
pnpm dev
```

## Production check

```bash
pnpm build
```

## Data provenance

Web-ready layers in `public/data/` were exported from `spatial-sensitivity-lab-thermal-final.gpkg`. The source GeoPackage is intentionally not bundled in the website repository. The reproducible export script is `scripts/export_web_data.py`.

Analytical sources include ESA WorldCover 2021, Copernicus HRL Imperviousness Density 2021, JRC GHSL GHS-POP 2020, Landsat 8/9 Collection 2 Level 2, PDOK/CBS and Brussels regional open-data services. Full links are displayed in the interface.

## Interpretation boundary

Scores are relative within each city. They are not temperatures, causal intervention effects, cross-city performance rankings or automatic allocation decisions.

This repository is independent from the earlier `Who Gets Cooled?` website.

Developed by Polen Biçer, 2026.

## v0.3 social diagnostic (29 September 2026)

The IBSA 2025 and CBS 2025 age and household observations are transferred from neighbourhood polygons to 500 m cells by overlap area in EPSG:3035. The social score is the mean of within-city percentile ranks of age 65+ and one-person-household shares. The vulnerability-informed scenario applies 30% surface, 20% green deficit, 20% population and 30% social diagnostic. Missing social values remain null. Median taxable income (IBSA 2023) is diagnostic metadata, not a scenario input. See `data/source/README.md` and `public/methods.html`.
