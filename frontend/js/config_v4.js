/**
 * config.js
 * ---------
 * Central configuration for the Urban Intelligence Dashboard.
 * Change API_BASE to your Render URL after deployment.
 */

// ── API ───────────────────────────────────────────────────────────────────────
// Local dev: http://localhost:8000/api/v1
// After deploying to Render: https://your-app.onrender.com/api/v1
const API_BASE = "http://localhost:8000/api/v1";

// ── BANGALORE MAP BOUNDS ──────────────────────────────────────────────────────
const CITY_CENTER  = [12.9716, 77.5946];   // Bangalore city center
const CITY_ZOOM    = 12;
const CITY_BOUNDS  = { south: 12.834, west: 77.461, north: 13.139, east: 77.779 };
const GRID_SIZE    = 25;

// ── LAYER COLOURS ─────────────────────────────────────────────────────────────
const LAYER_COLORS = {
  hospitals:    "#06B6D4", // Cyan 500
  schools:      "#F59E0B", // Amber 500
  traffic_nodes:"#EF4444", // Red 500
  pharmacies:   "#8B5CF6", // Violet 500
  underserved:  "#EC4899", // Pink 500
};

const MARKER_RADIUS = {
  hospitals:     5,
  schools:       5,
  traffic_nodes: 3,
  pharmacies:    4,
};

