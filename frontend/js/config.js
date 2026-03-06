/**
 * config.js
 * ---------
 * Central configuration — API base URL, layer colours,
 * map bounds, and shared application state.
 *
 * All other JS modules read from this file.
 * To point the dashboard at a different backend, only this file needs changing.
 */

// ── API ───────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000/api";

// ── PUNE MAP BOUNDS ───────────────────────────────────────────────────────────
const PUNE_CENTER  = [18.52, 73.855];
const PUNE_ZOOM    = 12;
const PUNE_BOUNDS  = { south: 18.40, west: 73.75, north: 18.65, east: 73.98 };
const GRID_SIZE    = 25; // 25×25 grid cells

// ── LAYER COLOURS ─────────────────────────────────────────────────────────────
const LAYER_COLORS = {
  hospitals:    "#38bdf8",
  schools:      "#fbbf24",
  traffic_nodes:"#f87171",
  pharmacies:   "#34d399",
  underserved:  "#f43f5e",
};

// ── MARKER RADII ─────────────────────────────────────────────────────────────
const MARKER_RADIUS = {
  hospitals:     5,
  schools:       5,
  traffic_nodes: 3,
  pharmacies:    4,
};

// ── SHARED APP STATE ──────────────────────────────────────────────────────────
// Mutated by app.js once data is loaded; read by charts.js and sidebar.js
const AppState = {
  statsData:      null,
  analyticsBuilt: false,
};
