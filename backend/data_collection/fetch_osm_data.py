"""
fetch_osm_data.py
-----------------
Student 1 - Data Collection
Fetches hospitals, schools, traffic nodes, buildings, and pharmacies
in Bangalore from the OpenStreetMap Overpass API.

Features:
  - Skips categories already successfully fetched
  - Auto-retries with exponential backoff on rate limits / timeouts
  - Polite delays between requests

Usage:
    python fetch_osm_data.py
"""

import requests
import json
import os
import time

# ─── CONFIG ───────────────────────────────────────────────────────────────────
CITY         = "Bangalore"
OUTPUT_DIR   = "../data"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Bangalore bounding box (south, west, north, east)
BBOX = "12.834,77.461,13.139,77.779"

# ─── QUERIES ──────────────────────────────────────────────────────────────────
QUERIES = {
    "hospitals": f"""
        [out:json][timeout:90];
        (
          node["amenity"="hospital"]({BBOX});
          way["amenity"="hospital"]({BBOX});
          node["amenity"="clinic"]({BBOX});
          node["healthcare"="hospital"]({BBOX});
        );
        out center;
    """,

    "schools": f"""
        [out:json][timeout:90];
        (
          node["amenity"="school"]({BBOX});
          way["amenity"="school"]({BBOX});
          node["amenity"="college"]({BBOX});
          node["amenity"="university"]({BBOX});
        );
        out center;
    """,

    "traffic_nodes": f"""
        [out:json][timeout:90];
        (
          node["highway"="traffic_signals"]({BBOX});
          node["highway"="crossing"]({BBOX});
          node["highway"="junction"]({BBOX});
        );
        out body;
    """,

    "buildings": f"""
        [out:json][timeout:150];
        (
          way["building"]({BBOX});
        );
        out center qt;
    """,

    "pharmacies": f"""
        [out:json][timeout:60];
        (
          node["amenity"="pharmacy"]({BBOX});
          node["amenity"="doctors"]({BBOX});
        );
        out center;
    """
}

# ─── FETCH WITH RETRY ─────────────────────────────────────────────────────────

def fetch_with_retry(category, query, max_retries=4):
    for attempt in range(1, max_retries + 1):
        print(f"  Attempt {attempt}/{max_retries}...", end=" ", flush=True)
        try:
            response = requests.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=180
            )
            if response.status_code == 429:
                wait = 60 * attempt
                print(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue
            if response.status_code == 504:
                wait = 30 * attempt
                print(f"Gateway timeout. Waiting {wait}s...")
                time.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()
            print(f"✓ {len(data.get('elements', []))} elements.")
            return data
        except requests.exceptions.Timeout:
            print(f"Timeout. Waiting {30*attempt}s...")
            time.sleep(30 * attempt)
        except Exception as e:
            print(f"Error: {e}. Waiting {20*attempt}s...")
            time.sleep(20 * attempt)
    print(f"  ✗ All attempts failed for [{category}].")
    return None

# ─── EXTRACT FEATURES ─────────────────────────────────────────────────────────

def extract_features(raw_data, category):
    features = []
    for el in raw_data.get("elements", []):
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        tags = el.get("tags", {})
        name = (
            tags.get("name") or tags.get("name:en")
            or tags.get("operator")
            or f"Unnamed {category.rstrip('s').title()}"
        )
        features.append({
            "id":       el.get("id"),
            "type":     el.get("type"),
            "category": category,
            "name":     name,
            "lat":      round(lat, 6),
            "lon":      round(lon, 6),
            "tags": {
                k: v for k, v in tags.items()
                if k in ["name", "amenity", "healthcare", "highway",
                         "building", "operator", "addr:street",
                         "addr:city", "phone", "website", "opening_hours"]
            }
        })
    return features

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def save_json(data, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  💾 Saved → {filepath}  ({len(data)} records)")

def already_fetched(category):
    filepath = os.path.join(OUTPUT_DIR, f"blr_{category}.json")
    if not os.path.exists(filepath):
        return False
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        if len(data) > 0:
            print(f"  ✅ Already have {len(data)} records. Skipping.")
            return True
    except Exception:
        pass
    return False

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 55)
    print(f"  Urban Intelligence Dashboard — Data Collection")
    print(f"  City: {CITY}")
    print("=" * 55)

    summary = {}

    for i, (category, query) in enumerate(QUERIES.items()):
        print(f"\n[{i+1}/{len(QUERIES)}] {category.upper()}")

        if already_fetched(category):
            filepath = os.path.join(OUTPUT_DIR, f"blr_{category}.json")
            with open(filepath, encoding="utf-8") as f:
                summary[category] = len(json.load(f))
            continue

        raw = fetch_with_retry(category, query)
        if raw is None:
            summary[category] = 0
            continue

        features = extract_features(raw, category)
        save_json(features, f"blr_{category}.json")
        summary[category] = len(features)

        if i < len(QUERIES) - 1:
            print(f"  Waiting 15s before next request...")
            time.sleep(15)

    print("\n" + "=" * 55)
    print("  SUMMARY")
    print("=" * 55)
    total = 0
    for cat, count in summary.items():
        status = "✅" if count > 0 else "❌"
        print(f"  {status}  {cat:<20} {count:>6} records")
        total += count
    print(f"\n  Total records collected: {total}")

    save_json({
        "city": CITY, "bbox": BBOX,
        "categories": summary, "total_records": total
    }, "collection_summary.json")

    failed = [c for c, n in summary.items() if n == 0]
    if failed:
        print(f"\n⚠️  Failed: {', '.join(failed)} — re-run to retry only these.")
    else:
        print("\n🎉 All categories fetched successfully!")

    print(f"\n📁 Data saved to: {os.path.abspath(OUTPUT_DIR)}")

if __name__ == "__main__":
    main()
