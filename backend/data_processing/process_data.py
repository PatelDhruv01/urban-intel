"""
process_data.py
---------------
Student 1 - Data Processing & Analysis (Bangalore)

What this script does:
  1. Loads all collected OSM JSON files
  2. Cleans and deduplicates each dataset
  3. Divides Bangalore into a 25x25 grid and counts infrastructure per cell
  4. Computes density metrics (hospital, school, building, traffic)
  5. Detects underserved areas (grids lacking hospitals/schools/pharmacies)
  6. Saves structured outputs for the FastAPI backend to serve

Output files (in ../data/processed/):
  - hospitals_clean.json
  - schools_clean.json
  - traffic_nodes_clean.json
  - buildings_clean.json
  - pharmacies_clean.json
  - grid_analysis.json
  - underserved_areas.json
  - city_stats.json

Usage:
    python process_data.py
"""

import json
import os
import math
from collections import defaultdict

# ─── CONFIG ───────────────────────────────────────────────────────────────────
INPUT_DIR  = "../data"
OUTPUT_DIR = "../data/processed"

CITY_BOUNDS = {
    "south": 12.834,
    "west":  77.461,
    "north": 13.139,
    "east":  77.779
}

GRID_ROWS = 25
GRID_COLS = 25

HOSPITAL_COVERAGE_KM  = 3.0
SCHOOL_COVERAGE_KM    = 2.0
PHARMACY_COVERAGE_KM  = 1.5

FILE_PREFIX = "blr_"

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def load_json(filename):
    filepath = os.path.join(INPUT_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  ⚠️  Not found: {filepath}")
        return []
    with open(filepath, encoding="utf-8") as f:
        return json.load(f)

def save_json(data, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    count = len(data) if isinstance(data, list) else "dict"
    print(f"  💾 {filename}  ({count} records)")

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def latlon_to_cell(lat, lon):
    b = CITY_BOUNDS
    row = int((lat - b["south"]) / (b["north"] - b["south"]) * GRID_ROWS)
    col = int((lon - b["west"])  / (b["east"]  - b["west"])  * GRID_COLS)
    return max(0, min(GRID_ROWS-1, row)), max(0, min(GRID_COLS-1, col))

def cell_center(row, col):
    b = CITY_BOUNDS
    lat = b["south"] + (row + 0.5) * (b["north"] - b["south"]) / GRID_ROWS
    lon = b["west"]  + (col + 0.5) * (b["east"]  - b["west"])  / GRID_COLS
    return round(lat, 5), round(lon, 5)

def cell_id(row, col):
    return f"{row:02d}_{col:02d}"

# ─── STEP 1: CLEAN ────────────────────────────────────────────────────────────

def clean_dataset(records, category):
    b = CITY_BOUNDS
    seen_ids = set()
    cleaned  = []
    for r in records:
        lat, lon = r.get("lat"), r.get("lon")
        if lat is None or lon is None:
            continue
        if not (b["south"] <= lat <= b["north"] and b["west"] <= lon <= b["east"]):
            continue
        rid = r.get("id")
        if rid in seen_ids:
            continue
        seen_ids.add(rid)
        cleaned.append(r)
    removed = len(records) - len(cleaned)
    print(f"  {category:<20} {len(records):>7} raw → {len(cleaned):>7} clean  (removed {removed})")
    return cleaned

# ─── STEP 2: GRID ─────────────────────────────────────────────────────────────

def build_grid(hospitals, schools, traffic_nodes, buildings, pharmacies):
    grid = defaultdict(lambda: {
        "hospitals": 0, "schools": 0,
        "traffic_nodes": 0, "buildings": 0, "pharmacies": 0,
    })
    for cat, records in [
        ("hospitals", hospitals), ("schools", schools),
        ("traffic_nodes", traffic_nodes), ("buildings", buildings),
        ("pharmacies", pharmacies),
    ]:
        for r in records:
            row, col = latlon_to_cell(r["lat"], r["lon"])
            cid = cell_id(row, col)
            grid[cid][cat] += 1
            grid[cid]["_row"] = row
            grid[cid]["_col"] = col

    cells = []
    for cid, counts in grid.items():
        row = counts.pop("_row", int(cid.split("_")[0]))
        col = counts.pop("_col", int(cid.split("_")[1]))
        lat, lon = cell_center(row, col)
        cells.append({"cell_id": cid, "row": row, "col": col,
                      "center_lat": lat, "center_lon": lon, **counts})

    for cat in ["hospitals", "schools", "traffic_nodes", "buildings", "pharmacies"]:
        vals  = [c[cat] for c in cells]
        mx    = max(vals) if vals else 1
        for c in cells:
            c[f"{cat}_density"] = round(c[cat] / mx * 100, 1)

    return cells

# ─── STEP 3: UNDERSERVED ──────────────────────────────────────────────────────

def find_underserved(grid_cells, hospitals, schools, pharmacies):
    print("\n  Computing nearest-facility distances...")
    results = []
    for cell in grid_cells:
        clat, clon = cell["center_lat"], cell["center_lon"]

        nh = min((haversine_km(clat, clon, h["lat"], h["lon"]) for h in hospitals), default=999)
        ns = min((haversine_km(clat, clon, s["lat"], s["lon"]) for s in schools),   default=999)
        np = min((haversine_km(clat, clon, p["lat"], p["lon"]) for p in pharmacies),default=999)

        score = round(
            nh / HOSPITAL_COVERAGE_KM  * 0.5 +
            ns / SCHOOL_COVERAGE_KM    * 0.3 +
            np / PHARMACY_COVERAGE_KM  * 0.2, 3
        )

        results.append({
            **cell,
            "nearest_hospital_km":  round(nh, 2),
            "nearest_school_km":    round(ns, 2),
            "nearest_pharmacy_km":  round(np, 2),
            "lacks_hospital":       nh > HOSPITAL_COVERAGE_KM,
            "lacks_school":         ns > SCHOOL_COVERAGE_KM,
            "lacks_pharmacy":       np > PHARMACY_COVERAGE_KM,
            "underservice_score":   score,
            "is_underserved":       (nh > HOSPITAL_COVERAGE_KM or
                                     ns > SCHOOL_COVERAGE_KM   or
                                     np > PHARMACY_COVERAGE_KM),
        })

    results.sort(key=lambda x: x["underservice_score"], reverse=True)
    return results

# ─── STEP 4: STATS ────────────────────────────────────────────────────────────

def compute_city_stats(hospitals, schools, traffic_nodes, buildings, pharmacies, underserved):
    tc  = GRID_ROWS * GRID_COLS
    u_h = sum(1 for u in underserved if u["lacks_hospital"])
    u_s = sum(1 for u in underserved if u["lacks_school"])
    u_p = sum(1 for u in underserved if u["lacks_pharmacy"])
    u_a = sum(1 for u in underserved if u["is_underserved"])
    return {
        "city": "Bangalore",
        "bbox": {"south": 12.834, "west": 77.461, "north": 13.139, "east": 77.779},
        "grid_size": f"{GRID_ROWS}x{GRID_COLS}",
        "total_grid_cells": tc,
        "infrastructure_counts": {
            "hospitals":     len(hospitals),
            "schools":       len(schools),
            "traffic_nodes": len(traffic_nodes),
            "buildings":     len(buildings),
            "pharmacies":    len(pharmacies),
        },
        "coverage_thresholds_km": {
            "hospital": HOSPITAL_COVERAGE_KM,
            "school":   SCHOOL_COVERAGE_KM,
            "pharmacy": PHARMACY_COVERAGE_KM,
        },
        "underserved_cells": {
            "no_hospital_within_3km":   u_h,
            "no_school_within_2km":     u_s,
            "no_pharmacy_within_1_5km": u_p,
            "any_underserved":          u_a,
            "pct_underserved":          round(u_a / tc * 100, 1),
        }
    }

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 55)
    print("  Urban Intelligence Dashboard — Data Processing")
    print("  City: Bangalore")
    print("=" * 55)

    print("\n[1/5] Loading raw data...")
    hospitals     = load_json(f"{FILE_PREFIX}hospitals.json")
    schools       = load_json(f"{FILE_PREFIX}schools.json")
    traffic_nodes = load_json(f"{FILE_PREFIX}traffic_nodes.json")
    buildings     = load_json(f"{FILE_PREFIX}buildings.json")
    pharmacies    = load_json(f"{FILE_PREFIX}pharmacies.json")

    print("\n[2/5] Cleaning and deduplicating...")
    hospitals     = clean_dataset(hospitals,     "hospitals")
    schools       = clean_dataset(schools,       "schools")
    traffic_nodes = clean_dataset(traffic_nodes, "traffic_nodes")
    buildings     = clean_dataset(buildings,     "buildings")
    pharmacies    = clean_dataset(pharmacies,    "pharmacies")

    print("\n[3/5] Saving clean datasets...")
    save_json(hospitals,     "hospitals_clean.json")
    save_json(schools,       "schools_clean.json")
    save_json(traffic_nodes, "traffic_nodes_clean.json")
    save_json(buildings,     "buildings_clean.json")
    save_json(pharmacies,    "pharmacies_clean.json")

    print("\n[4/5] Building grid...")
    grid_cells = build_grid(hospitals, schools, traffic_nodes, buildings, pharmacies)
    save_json(grid_cells, "grid_analysis.json")

    print("\n[5/5] Detecting underserved areas...")
    underserved = find_underserved(grid_cells, hospitals, schools, pharmacies)
    save_json(underserved, "underserved_areas.json")

    stats = compute_city_stats(hospitals, schools, traffic_nodes, buildings, pharmacies, underserved)
    save_json(stats, "city_stats.json")

    print("\n" + "=" * 55)
    print("  RESULTS")
    print("=" * 55)
    ic = stats["infrastructure_counts"]
    uc = stats["underserved_cells"]
    for k, v in ic.items():
        print(f"  {k:<20} {v:>7,}")
    print(f"\n  No hospital within 3km : {uc['no_hospital_within_3km']:>4} cells")
    print(f"  No school within 2km   : {uc['no_school_within_2km']:>4} cells")
    print(f"  No pharmacy within 1.5km: {uc['no_pharmacy_within_1_5km']:>4} cells")
    print(f"  Any underserved        : {uc['any_underserved']:>4} cells ({uc['pct_underserved']}%)")
    print(f"\n✅ Done! → {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    main()
