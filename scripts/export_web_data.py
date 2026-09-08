#!/usr/bin/env python3
import json
import sqlite3
import struct
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyproj import Transformer
from shapely import from_wkb
from shapely.geometry import mapping
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
GPKG = ROOT.parent / "spatial-sensitivity-lab-thermal-final.gpkg"
OUT = ROOT / "public" / "data"


def gpkg_geometry(blob):
    if blob is None:
        return None
    flags = blob[3]
    envelope_code = (flags >> 1) & 0b111
    envelope_values = {0: 0, 1: 4, 2: 6, 3: 6, 4: 8}.get(envelope_code, 0)
    return from_wkb(bytes(blob)[8 + envelope_values * 8 :])


def rows(conn, table):
    cur = conn.execute(f'SELECT * FROM "{table}"')
    names = [c[0] for c in cur.description]
    return [dict(zip(names, row)) for row in cur.fetchall()]


def clean_number(value, digits=3):
    return None if value is None else round(float(value), digits)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(GPKG)
    transformer = Transformer.from_crs(3035, 4326, always_xy=True)
    properties = [
        "grid_id", "city", "eligible", "water_pct", "tree_pct", "grass_pct",
        "cooling_green_pct", "sealed_surface_pct", "population_2020",
        "population_density_km2", "score_impervious", "score_green_deficit",
        "score_population", "priority_balanced", "priority_population_led",
        "priority_surface_led", "priority_nature_deficit_led", "priority_consensus",
        "priority_range", "priority_class", "top20_scenario_count",
        "robust_high_priority", "summer_lst_median_c", "neighbourhood_code", "neighbourhood_name",
    ]
    features = []
    for row in rows(conn, "grid_priority_display"):
        geometry = gpkg_geometry(row["geom"])
        geometry = transform(transformer.transform, geometry)
        props = {}
        for key in properties:
            value = row[key]
            props[key] = clean_number(value) if isinstance(value, float) else value
        # Public name reflects what the field actually measures. The legacy
        # GeoPackage column is retained for backwards compatibility only.
        props["score_ge_80_scenario_count"] = props["top20_scenario_count"]
        features.append({"type": "Feature", "geometry": mapping(geometry), "properties": props})

    (OUT / "grid_priority.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
        encoding="utf-8",
    )

    # Neighbourhood reports are derived with exact polygon overlaps. This
    # prevents tiny boundary fragments from receiving the same weight as a
    # complete 500 m cell and prevents repeated context labels from being
    # mistaken for duplicate neighbourhood observations.
    grid = gpd.read_file(GPKG, layer="grid_priority_display")
    grid = grid.loc[grid["eligible"].eq(1)].copy()
    scenario_columns = [
        "priority_consensus", "priority_balanced", "priority_population_led",
        "priority_surface_led", "priority_nature_deficit_led",
    ]
    metric_columns = scenario_columns + [
        "score_impervious", "score_green_deficit", "score_population",
    ]
    neighbourhood_rows = []
    neighbourhood_features = []
    for city, layer in [
        ("Amsterdam", "amsterdam_neighbourhoods_2025"),
        ("Brussels", "brussels_monitoring_neighbourhoods"),
    ]:
        neighbourhoods = gpd.read_file(GPKG, layer=layer)[
            ["neighbourhood_code", "neighbourhood_name", "geometry"]
        ].copy()
        neighbourhoods["official_area_m2"] = neighbourhoods.geometry.area
        city_grid = grid.loc[grid["city"].eq(city), ["grid_id", *metric_columns, "summer_lst_median_c", "geometry"]]
        overlaps = gpd.overlay(city_grid, neighbourhoods, how="intersection", keep_geom_type=False)
        overlaps["overlap_area_m2"] = overlaps.geometry.area
        overlaps = overlaps.loc[overlaps["overlap_area_m2"].gt(0)].copy()
        for (code, name), group in overlaps.groupby(["neighbourhood_code", "neighbourhood_name"], dropna=False):
            weights = group["overlap_area_m2"].to_numpy()
            row = {
                "id": f"{city}:{code}", "city": city,
                "neighbourhood_code": str(code), "neighbourhood_name": str(name),
                "intersecting_eligible_cells": int(group["grid_id"].nunique()),
                "eligible_overlap_area_m2": round(float(weights.sum()), 2),
                "official_area_m2": round(float(group["official_area_m2"].iloc[0]), 2),
                "aggregation": "exact overlap-area-weighted mean of eligible 500 m cell scores",
            }
            for column in metric_columns:
                row[column] = clean_number(np.average(group[column], weights=weights))
            thermal = group.loc[group["summer_lst_median_c"].notna()]
            row["summer_lst_median_c"] = (
                clean_number(np.average(thermal["summer_lst_median_c"], weights=thermal["overlap_area_m2"]))
                if len(thermal) else None
            )
            row["thermal_overlap_area_m2"] = round(float(thermal["overlap_area_m2"].sum()), 2)
            row["eligible_coverage_pct"] = clean_number(100 * row["eligible_overlap_area_m2"] / row["official_area_m2"], 1)
            row["thermal_coverage_pct"] = clean_number(100 * row["thermal_overlap_area_m2"] / row["official_area_m2"], 1)
            row["ranking_eligible"] = row["eligible_coverage_pct"] >= 50
            row["data_quality"] = (
                "limited analytical coverage" if row["eligible_coverage_pct"] < 50
                else "limited thermal coverage" if row["thermal_coverage_pct"] < 50
                else "sufficient mapped coverage"
            )
            neighbourhood_rows.append(row)
            source_geometry = neighbourhoods.loc[
                neighbourhoods["neighbourhood_code"].astype(str).eq(str(code)), "geometry"
            ].iloc[0]
            neighbourhood_features.append({
                "type": "Feature",
                "geometry": mapping(transform(transformer.transform, source_geometry)),
                "properties": row,
            })
    (OUT / "neighbourhood_priority.json").write_text(
        json.dumps({"method": "exact polygon overlap; area-weighted means; eligible cells only", "rows": neighbourhood_rows}, indent=2),
        encoding="utf-8",
    )
    (OUT / "neighbourhood_priority.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": neighbourhood_features}, separators=(",", ":")),
        encoding="utf-8",
    )

    tables = {}
    for table in [
        "ml_validation_metrics", "ml_feature_importance", "scale_sensitivity_metrics",
        "ai_policy_legitimacy_audit",
    ]:
        tables[table] = rows(conn, table)
    (OUT / "evidence.json").write_text(json.dumps(tables, indent=2), encoding="utf-8")

    projects = []
    for row in rows(conn, "project_need_overlap_context"):
        row.pop("fid", None)
        geom = gpkg_geometry(row.pop("geom"))
        geom = transform(transformer.transform, geom)
        projects.append({"type": "Feature", "geometry": mapping(geom), "properties": row})
    (OUT / "project_context.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": projects}, separators=(",", ":")),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
