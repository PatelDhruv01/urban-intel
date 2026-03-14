"""
app.py
------
Student 1 - Backend API (FastAPI)
REST API serving processed Bangalore infrastructure data
and AI-powered urban planning suggestions via Gemini.

Endpoints:
  GET  /api/v1/health
  GET  /api/v1/city/stats
  GET  /api/v1/infrastructure/{category}
  GET  /api/v1/grid
  GET  /api/v1/analysis/underserved
  GET  /api/v1/analysis/query
  GET  /api/v1/analytics/summary
  POST /api/v1/ai/suggestions

Usage:
    uvicorn app:app --reload --port 8000
"""

import json
import os
import math
from pathlib import Path
from typing import Optional
from functools import lru_cache

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ─── INIT ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Urban Intelligence Dashboard API",
    description="Infrastructure density analysis for Bangalore city",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data" / "processed"

# Gemini setup
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

# ─── DATA LOADER ──────────────────────────────────────────────────────────────
_cache: dict = {}

def load(filename: str):
    if filename not in _cache:
        fp = DATA_DIR / filename
        if not fp.exists():
            return None
        with open(fp, encoding="utf-8") as f:
            _cache[filename] = json.load(f)
    return _cache[filename]

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

VALID_CATEGORIES = ["hospitals", "schools", "traffic_nodes", "buildings", "pharmacies"]

# ─── SCHEMAS ──────────────────────────────────────────────────────────────────
class AISuggestionRequest(BaseModel):
    facility_type: str = "hospital"
    top_n: int = 5

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    """Health check — confirms all data files are available."""
    files = {cat: (DATA_DIR / f"{cat}_clean.json").exists() for cat in VALID_CATEGORIES}
    files.update({
        "grid":       (DATA_DIR / "grid_analysis.json").exists(),
        "underserved":(DATA_DIR / "underserved_areas.json").exists(),
        "city_stats": (DATA_DIR / "city_stats.json").exists(),
    })
    return {
        "status":    "ok",
        "city":      "Bangalore",
        "api":       "FastAPI v1",
        "gemini":    bool(GEMINI_KEY),
        "data_files": files,
        "all_ready": all(files.values())
    }


@app.get("/api/v1/city/stats")
def city_stats():
    """City-level summary statistics for dashboard KPI cards."""
    data = load("city_stats.json")
    if not data:
        raise HTTPException(404, "city_stats.json not found. Run process_data.py first.")
    return data


@app.get("/api/v1/infrastructure/{category}")
def infrastructure(
    category: str,
    limit: int = Query(5000, ge=1, le=10000),
    page:  int = Query(1,    ge=1),
    bbox:  Optional[str] = Query(None, description="south,west,north,east — filter by bounding box")
):
    """
    Return cleaned point data for a given infrastructure category.
    Supports optional bbox filtering for map viewport queries.
    """
    if category not in VALID_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}")

    data = load(f"{category}_clean.json")
    if data is None:
        raise HTTPException(404, f"{category}_clean.json not found.")

    items = data

    # Optional bounding box filter
    if bbox:
        try:
            s, w, n, e = map(float, bbox.split(","))
            items = [i for i in items if s <= i["lat"] <= n and w <= i["lon"] <= e]
        except Exception:
            raise HTTPException(400, "bbox must be: south,west,north,east (floats)")

    total = len(items)
    start = (page - 1) * limit
    paged = items[start:start + limit]

    return {
        "category": category,
        "total":    total,
        "page":     page,
        "limit":    limit,
        "count":    len(paged),
        "data":     paged
    }


@app.get("/api/v1/grid")
def grid(
    category:    Optional[str]   = Query(None),
    min_density: Optional[float] = Query(None, ge=0, le=100)
):
    """
    Full 25×25 grid with per-cell infrastructure counts and density scores.
    Optionally filter by category density threshold.
    """
    data = load("grid_analysis.json")
    if not data:
        raise HTTPException(404, "grid_analysis.json not found.")

    filtered = data
    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(400, f"Invalid category.")
        if min_density is not None:
            filtered = [c for c in data if c.get(f"{category}_density", 0) >= min_density]

    return {"total_cells": len(data), "filtered_cells": len(filtered), "grid": filtered}


@app.get("/api/v1/analysis/underserved")
def underserved(
    type: str = Query("any", description="hospital | school | pharmacy | any")
):
    """
    Pre-computed underserved areas using fixed coverage thresholds.
    For dynamic radius queries use /analysis/query instead.
    """
    data = load("underserved_areas.json")
    if not data:
        raise HTTPException(404, "underserved_areas.json not found.")

    filter_map = {
        "hospital": lambda c: c.get("lacks_hospital"),
        "school":   lambda c: c.get("lacks_school"),
        "pharmacy": lambda c: c.get("lacks_pharmacy"),
        "any":      lambda c: c.get("is_underserved"),
    }
    if type not in filter_map:
        raise HTTPException(400, "type must be: hospital | school | pharmacy | any")

    filtered = [c for c in data if filter_map[type](c)]
    return {"filter": type, "total_underserved": len(filtered), "cells": filtered}


@app.get("/api/v1/analysis/query")
def query_underserved(
    facility:  str   = Query("hospital", description="hospital | school | pharmacy"),
    radius_km: float = Query(3.0, ge=0.5, le=20.0)
):
    """
    Dynamic underserved area query — the core bonus feature.
    Computes on-the-fly which grid cells lack the given facility within radius_km.
    """
    facility_file = {
        "hospital": "hospitals_clean.json",
        "school":   "schools_clean.json",
        "pharmacy": "pharmacies_clean.json",
    }
    if facility not in facility_file:
        raise HTTPException(400, "facility must be: hospital | school | pharmacy")

    facilities = load(facility_file[facility])
    grid_data  = load("grid_analysis.json")
    if not facilities or not grid_data:
        raise HTTPException(404, "Required data files not found.")

    results = []
    for cell in grid_data:
        clat, clon = cell["center_lat"], cell["center_lon"]
        nearest = min(
            (haversine_km(clat, clon, f["lat"], f["lon"]) for f in facilities),
            default=999
        )
        if nearest > radius_km:
            results.append({
                "cell_id":                      cell["cell_id"],
                "center_lat":                   clat,
                "center_lon":                   clon,
                f"nearest_{facility}_km":       round(nearest, 2),
                "gap_km":                       round(nearest - radius_km, 2),
                "hospitals":                    cell.get("hospitals", 0),
                "schools":                      cell.get("schools", 0),
                "pharmacies":                   cell.get("pharmacies", 0),
                "buildings":                    cell.get("buildings", 0),
            })

    results.sort(key=lambda x: x["gap_km"], reverse=True)
    return {
        "query":                    f"Areas lacking {facility} within {radius_km}km",
        "facility":                 facility,
        "radius_km":                radius_km,
        "total_underserved_cells":  len(results),
        "results":                  results
    }


@app.get("/api/v1/analytics/summary")
def analytics_summary(
    category: str = Query("hospitals"),
    top_n:    int = Query(20, ge=1, le=50)
):
    """Infrastructure count per grid cell — used for bar charts."""
    if category not in VALID_CATEGORIES:
        raise HTTPException(400, f"Invalid category.")

    grid_data = load("grid_analysis.json")
    if not grid_data:
        raise HTTPException(404, "grid_analysis.json not found.")

    sorted_cells = sorted(grid_data, key=lambda c: c.get(category, 0), reverse=True)
    top = sorted_cells[:top_n]

    return {
        "category": category,
        "top_n":    top_n,
        "data": [
            {
                "cell_id":    c["cell_id"],
                "center_lat": c["center_lat"],
                "center_lon": c["center_lon"],
                "count":      c.get(category, 0),
                "density":    c.get(f"{category}_density", 0),
            }
            for c in top
        ]
    }


@app.post("/api/v1/ai/suggestions")
async def ai_suggestions(req: AISuggestionRequest):
    """
    AI-powered urban planning suggestions using Google Gemini.
    Analyses underserved areas and recommends facility placement strategies.
    """
    if not GEMINI_KEY:
        raise HTTPException(503, "Gemini API key not configured. Add GEMINI_API_KEY to .env")

    # Load the data we need
    underserved_data = load("underserved_areas.json")
    stats            = load("city_stats.json")
    if not underserved_data or not stats:
        raise HTTPException(404, "Processed data not found. Run process_data.py first.")

    # Pick top-N most underserved cells relevant to the facility
    facility = req.facility_type
    lacks_key = f"lacks_{facility}"

    top_cells = [c for c in underserved_data if c.get(lacks_key)][:req.top_n]

    if not top_cells:
        return {"suggestions": [], "summary": f"No underserved areas found for {facility}."}

    # Build a compact context for Gemini
    ic  = stats["infrastructure_counts"]
    uc  = stats["underserved_cells"]

    cell_summaries = []
    for i, c in enumerate(top_cells, 1):
        cell_summaries.append(
            f"{i}. Grid cell {c['cell_id']} at ({c['center_lat']:.4f}°N, {c['center_lon']:.4f}°E) — "
            f"nearest {facility}: {c.get(f'nearest_{facility}_km', '?')}km | "
            f"nearby hospitals: {c.get('hospitals',0)}, schools: {c.get('schools',0)}, "
            f"buildings: {c.get('buildings',0)} (population proxy)"
        )

    prompt = f"""You are an expert urban infrastructure planner analysing Bangalore, India.

CITY CONTEXT:
- Total mapped hospitals & clinics: {ic['hospitals']}
- Total schools & colleges: {ic['schools']}
- Total pharmacies: {ic['pharmacies']}
- {uc['pct_underserved']}% of the city grid is underserved by at least one facility type
- Grid cells lacking {facility} within coverage radius: {uc.get(f'no_{facility}_within_3km', uc.get('no_hospital_within_3km', '?'))}

TOP {len(top_cells)} MOST UNDERSERVED AREAS (lacking {facility}):
{chr(10).join(cell_summaries)}

TASK:
For each of the top {min(3, len(top_cells))} areas above, provide a structured suggestion in this EXACT JSON format (respond with ONLY a JSON array, no markdown):
[
  {{
    "rank": 1,
    "area_name": "descriptive name based on coordinates",
    "coordinates": {{"lat": 12.xxxx, "lon": 77.xxxx}},
    "cell_id": "xx_xx",
    "gap_km": X.X,
    "priority": "Critical | High | Medium",
    "recommendation": "Specific facility recommendation (e.g. '150-bed district hospital')",
    "reasoning": "2-3 sentence explanation of why this location is strategically ideal",
    "estimated_population_served": "X,000 - Y,000 residents",
    "quick_wins": ["actionable step 1", "actionable step 2"],
    "smart_impact_score": X.X
  }}
]

The smart_impact_score (0-10) should estimate the ratio of population served to implementation cost.
Area names should reference actual Bangalore neighbourhoods near those coordinates.
"""

    try:
        model    = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text     = response.text.strip()

        # Strip any markdown fences if Gemini adds them
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        suggestions = json.loads(text)

        return {
            "facility_type":          facility,
            "city":                   "Bangalore",
            "total_underserved_cells": len(top_cells),
            "suggestions":            suggestions,
            "model":                  "gemini-1.5-flash",
        }

    except json.JSONDecodeError:
        # If Gemini doesn't return pure JSON, return raw text
        return {
            "facility_type": facility,
            "raw_response":  text,
            "error":         "Could not parse structured JSON from Gemini. Raw response included.",
        }
    except Exception as e:
        raise HTTPException(500, f"Gemini API error: {str(e)}")


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("=" * 55)
    print("  Urban Intelligence Dashboard — FastAPI Backend")
    print("  City: Bangalore")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 55)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
