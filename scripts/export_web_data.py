#!/usr/bin/env python3
import json
import sqlite3
import struct
from pathlib import Path

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
        "robust_high_priority", "summer_lst_median_c", "neighbourhood_name",
    ]
    features = []
    for row in rows(conn, "grid_priority_display"):
        geometry = gpkg_geometry(row["geom"])
        geometry = transform(transformer.transform, geometry)
        props = {}
        for key in properties:
            value = row[key]
            props[key] = clean_number(value) if isinstance(value, float) else value
        features.append({"type": "Feature", "geometry": mapping(geometry), "properties": props})

    (OUT / "grid_priority.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
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
