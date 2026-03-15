/**
 * map.js — Leaflet map initialisation and layer management.
 * Exposes: map, LG, LA, toggleLayer, loadLayer, loadUnderserved, cellBounds
 */

const map = L.map("map", {
  center: CITY_CENTER, zoom: CITY_ZOOM, zoomControl: false,
});
L.control.zoom({ position: "bottomright" }).addTo(map);

// Premium Light Street Map
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap, © CartoDB", maxZoom: 19,
}).addTo(map);

// Keep a global reference for the size invalidator in app.js
window.UID_MAP = map;

const LG = {
  hospitals:    L.layerGroup().addTo(map),
  schools:      L.layerGroup().addTo(map),
  traffic_nodes:L.layerGroup().addTo(map),
  pharmacies:   L.layerGroup(),
  underserved:  L.layerGroup(),
};
const LA = {
  hospitals: true, schools: true, traffic_nodes: true,
  pharmacies: false, underserved: false,
};

function buildPopup(item, color) {
  const t = item.tags || {};
  return `<div style="padding:4px 2px;min-width:170px">
    <div class="pn">${item.name || "Unnamed"}</div>
    <span class="pt" style="background:${color}22;color:${color}">${item.category}</span>
    <div class="pr">📍 ${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}</div>
    ${t["addr:street"]   ? `<div class="pr">🏠 ${t["addr:street"]}</div>` : ""}
    ${t["phone"]         ? `<div class="pr">📞 ${t["phone"]}</div>` : ""}
    ${t["opening_hours"] ? `<div class="pr">🕐 ${t["opening_hours"]}</div>` : ""}
  </div>`;
}

async function loadLayer(category) {
  const color  = LAYER_COLORS[category];
  const radius = MARKER_RADIUS[category];
  const data   = await apiFetch(`${API_BASE}/infrastructure/${category}?limit=5000`);
  (data.data || []).forEach(item => {
    L.circleMarker([item.lat, item.lon], {
      radius, fillColor: color, color, weight: 1, opacity: .9, fillOpacity: .8,
    }).bindPopup(buildPopup(item, color), { maxWidth: 260 }).addTo(LG[category]);
  });
  const el = document.getElementById(`ln-${category}`);
  if (el) el.textContent = (data.total || 0).toLocaleString();
  return data.total || 0;
}

async function loadUnderserved() {
  const data  = await apiFetch(`${API_BASE}/analysis/underserved?type=any`);
  const cells = data.cells || [];
  cells.forEach(c => {
    const issues = [];
    if (c.lacks_hospital) issues.push(`No hospital within 3km (nearest: ${c.nearest_hospital_km}km)`);
    if (c.lacks_school)   issues.push(`No school within 2km (nearest: ${c.nearest_school_km}km)`);
    if (c.lacks_pharmacy) issues.push(`No pharmacy within 1.5km (nearest: ${c.nearest_pharmacy_km}km)`);
    L.rectangle(cellBounds(c), {
      color: "#f43f5e", weight: 1, fillColor: "#f43f5e",
      fillOpacity: Math.min(0.1 + c.underservice_score * 0.06, 0.5),
    }).bindPopup(`<div style="padding:4px 2px;min-width:180px">
      <div class="pn" style="color:#f87171">⚠ Underserved Zone</div>
      <div class="pr">Cell: ${c.cell_id} · Score: ${c.underservice_score}</div>
      ${issues.map(i => `<div class="pr" style="color:#fca5a5">• ${i}</div>`).join("")}
    </div>`, { maxWidth: 280 }).addTo(LG.underserved);
  });
  const el = document.getElementById("ln-underserved");
  if (el) el.textContent = cells.length;
  return cells.length;
}

function cellBounds(c) {
  const ls = (CITY_BOUNDS.north - CITY_BOUNDS.south) / GRID_SIZE;
  const ln = (CITY_BOUNDS.east  - CITY_BOUNDS.west)  / GRID_SIZE;
  return [
    [c.center_lat - ls/2, c.center_lon - ln/2],
    [c.center_lat + ls/2, c.center_lon + ln/2],
  ];
}

function toggleLayer(name) {
  LA[name] = !LA[name];
  const row = document.getElementById(`lr-${name}`);
  const tog = document.getElementById(`lt-${name}`);
  if (row) row.classList.toggle("on", LA[name]);
  if (tog) tog.classList.toggle("on", LA[name]);
  LA[name] ? map.addLayer(LG[name]) : map.removeLayer(LG[name]);
}
