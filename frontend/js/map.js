/**
 * map.js
 * ------
 * All Leaflet map initialisation, layer management,
 * marker creation, and popup rendering.
 *
 * Exposes:
 *   map          — the Leaflet map instance
 *   LG           — layer groups keyed by category name
 *   LA           — active state (boolean) per layer
 *   toggleLayer  — show/hide a named layer
 *   loadLayer    — fetch + render a point category from the API
 *   loadUnderserved — fetch + render underserved zone rectangles
 *   cellBounds   — compute lat/lon bounds for a grid cell object
 */

// ── INITIALISE MAP ────────────────────────────────────────────────────────────
const map = L.map("map", {
  center:      PUNE_CENTER,
  zoom:        PUNE_ZOOM,
  zoomControl: false,
});

L.control.zoom({ position: "bottomleft" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom:     19,
}).addTo(map);

// ── LAYER GROUPS ──────────────────────────────────────────────────────────────
const LG = {
  hospitals:    L.layerGroup().addTo(map),
  schools:      L.layerGroup().addTo(map),
  traffic_nodes:L.layerGroup().addTo(map),
  pharmacies:   L.layerGroup(),           // off by default
  underserved:  L.layerGroup(),           // off by default
};

// Track which layers are currently visible
const LA = {
  hospitals:    true,
  schools:      true,
  traffic_nodes:true,
  pharmacies:   false,
  underserved:  false,
};

// ── POPUP BUILDER ─────────────────────────────────────────────────────────────
/**
 * Build an HTML popup string for a point feature.
 * @param {Object} item   - cleaned feature from the API
 * @param {string} color  - hex colour for the category badge
 */
function buildPopup(item, color) {
  const t = item.tags || {};
  return `
    <div style="padding:4px 2px;min-width:170px">
      <div class="pn">${item.name || "Unnamed"}</div>
      <span class="pt" style="background:${color}22;color:${color}">${item.category}</span>
      <div class="pr">📍 ${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}</div>
      ${t["addr:street"]    ? `<div class="pr">🏠 ${t["addr:street"]}</div>`    : ""}
      ${t["phone"]          ? `<div class="pr">📞 ${t["phone"]}</div>`           : ""}
      ${t["opening_hours"]  ? `<div class="pr">🕐 ${t["opening_hours"]}</div>`   : ""}
    </div>`;
}

// ── LOAD INFRASTRUCTURE LAYER ─────────────────────────────────────────────────
/**
 * Fetch a cleaned infrastructure category from the backend
 * and render circle markers onto its layer group.
 *
 * @param {string} category - e.g. "hospitals"
 * @returns {number} total record count
 */
async function loadLayer(category) {
  const color  = LAYER_COLORS[category];
  const radius = MARKER_RADIUS[category];

  const data  = await apiFetch(`${API_BASE}/infrastructure/${category}?limit=5000`);
  const items = data.data || [];

  items.forEach(item => {
    L.circleMarker([item.lat, item.lon], {
      radius,
      fillColor:   color,
      color:       color,
      weight:      1,
      opacity:     0.9,
      fillOpacity: 0.8,
    })
    .bindPopup(buildPopup(item, color), { maxWidth: 260 })
    .addTo(LG[category]);
  });

  // Update sidebar count label
  const el = document.getElementById(`ln-${category}`);
  if (el) el.textContent = (data.total || 0).toLocaleString();

  return data.total || 0;
}

// ── LOAD UNDERSERVED ZONES ────────────────────────────────────────────────────
/**
 * Fetch all underserved grid cells and render as semi-transparent
 * red rectangles. Uses the pre-computed /underserved endpoint
 * (fixed thresholds). Dynamic queries are handled in query.js.
 *
 * @returns {number} count of underserved cells
 */
async function loadUnderserved() {
  const data  = await apiFetch(`${API_BASE}/underserved?type=any`);
  const cells = data.cells || [];

  cells.forEach(cell => {
    const issues = [];
    if (cell.lacks_hospital) issues.push(`No hospital within 3km (nearest: ${cell.nearest_hospital_km}km)`);
    if (cell.lacks_school)   issues.push(`No school within 2km (nearest: ${cell.nearest_school_km}km)`);
    if (cell.lacks_pharmacy) issues.push(`No pharmacy within 1.5km (nearest: ${cell.nearest_pharmacy_km}km)`);

    const popup = `
      <div style="padding:4px 2px;min-width:180px">
        <div class="pn" style="color:#f87171">⚠ Underserved Zone</div>
        <div class="pr">Cell: ${cell.cell_id} · Score: ${cell.underservice_score}</div>
        ${issues.map(i => `<div class="pr" style="color:#fca5a5">• ${i}</div>`).join("")}
      </div>`;

    L.rectangle(cellBounds(cell), {
      color:       "#f43f5e",
      weight:      1,
      fillColor:   "#f43f5e",
      fillOpacity: Math.min(0.1 + cell.underservice_score * 0.06, 0.5),
    })
    .bindPopup(popup, { maxWidth: 280 })
    .addTo(LG.underserved);
  });

  const el = document.getElementById("ln-underserved");
  if (el) el.textContent = cells.length;

  return cells.length;
}

// ── CELL BOUNDS HELPER ────────────────────────────────────────────────────────
/**
 * Convert a grid cell object (with center_lat / center_lon)
 * into a Leaflet [[sw], [ne]] bounds array.
 *
 * @param {Object} cell - grid cell from the API
 * @returns {Array} Leaflet bounds
 */
function cellBounds(cell) {
  const latStep = (PUNE_BOUNDS.north - PUNE_BOUNDS.south) / GRID_SIZE;
  const lonStep = (PUNE_BOUNDS.east  - PUNE_BOUNDS.west)  / GRID_SIZE;
  return [
    [cell.center_lat - latStep / 2, cell.center_lon - lonStep / 2],
    [cell.center_lat + latStep / 2, cell.center_lon + lonStep / 2],
  ];
}

// ── TOGGLE LAYER ──────────────────────────────────────────────────────────────
/**
 * Toggle a named layer on/off.
 * Updates the map, the sidebar row, and the toggle switch UI.
 *
 * @param {string} name - layer key (e.g. "hospitals")
 */
function toggleLayer(name) {
  LA[name] = !LA[name];

  const row = document.getElementById(`lr-${name}`);
  const tog = document.getElementById(`lt-${name}`);
  if (row) row.classList.toggle("on", LA[name]);
  if (tog) tog.classList.toggle("on", LA[name]);

  LA[name] ? map.addLayer(LG[name]) : map.removeLayer(LG[name]);
}
