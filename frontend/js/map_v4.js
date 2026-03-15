/**
 * map_v4.js — Advanced Leaflet map initialisation with DarkMatter and Heatmaps.
 */

const map = L.map("map", {
  center: [12.9716, 77.5946], zoom: 12, zoomControl: false,
});
L.control.zoom({ position: "bottomright" }).addTo(map);

// Advanced OLED Dark Basemap
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap, © CartoDB", maxZoom: 19,
}).addTo(map);

window.UID_MAP = map;

window.LG = {
  hospitals:    L.layerGroup().addTo(map),
  schools:      L.layerGroup().addTo(map),
  traffic_nodes:L.layerGroup().addTo(map),
  pharmacies:   L.layerGroup(),
  underserved:  null, // Will be initialized as a heat layer
};

window.LA = {
  hospitals: true, schools: true, traffic_nodes: true,
  pharmacies: false, underserved: false,
};

// UI/UX Pro Max Colors
window.LAYER_COLORS = {
    hospitals: "#22d3ee",
    schools: "#f59e0b",
    traffic_nodes: "#f43f5e",
    pharmacies: "#a855f7"
};

window.MARKER_RADIUS = {
    hospitals: 6,
    schools: 5,
    traffic_nodes: 4,
    pharmacies: 5
};

function buildPopup(item, color) {
  const t = item.tags || {};
  return `
  <div style="padding:8px 4px;min-width:180px">
    <div style="font-weight:bold;color:#f8fafc;font-size:14px;margin-bottom:4px;">${item.name || "Unnamed Node"}</div>
    <span style="font-family:'Fira Code', monospace;font-size:10px;text-transform:uppercase;background:${color}22;color:${color};padding:2px 4px;border-radius:4px;border:1px solid ${color}44;">${item.category}</span>
    <div style="color:#94a3b8;font-size:12px;margin-top:8px;">📍 ${item.lat.toFixed(5)}, ${item.lon.toFixed(5)}</div>
    ${t["addr:street"]   ? `<div style="color:#94a3b8;font-size:12px;margin-top:4px;">🏠 ${t["addr:street"]}</div>` : ""}
  </div>`;
}

async function loadLayer(category) {
  const color  = LAYER_COLORS[category];
  const radius = MARKER_RADIUS[category];
  const data   = await apiFetch(`${API_BASE}/infrastructure/${category}?limit=5000`);
  
  (data.data || []).forEach(item => {
    L.circleMarker([item.lat, item.lon], {
      radius, 
      fillColor: color, 
      color: "#0f172a", // Dark border to pop against dark map
      weight: 1, 
      opacity: 1, 
      fillOpacity: 0.8,
    }).bindPopup(buildPopup(item, color), { maxWidth: 260 }).addTo(window.LG[category]);
  });
  
  const el = document.getElementById(`ln-${category}`);
  if (el) el.textContent = (data.total || 0).toLocaleString();
  return data.total || 0;
}

async function loadUnderserved() {
  const data  = await apiFetch(`${API_BASE}/analysis/underserved?type=any`);
  const cells = data.cells || [];
  
  // Extract coordinates and intensity (score) for Heatmap
  const heatPoints = cells.map(c => [
      c.center_lat, 
      c.center_lon, 
      c.underservice_score / 3 // Normalize weight
  ]);

  // Create smooth Heatmap Layer
  window.LG.underserved = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 25,
      maxZoom: 14,
      gradient: {
          0.2: '#3b82f6', // blue
          0.5: '#f59e0b', // amber
          1.0: '#f43f5e'  // rose
      }
  });

  return cells.length;
}

function toggleLayer(name) {
  LA[name] = !LA[name];
  const tog = document.getElementById(`t-${name}`);
  if (tog) tog.checked = LA[name];
  
  if (LG[name]) {
      LA[name] ? map.addLayer(LG[name]) : map.removeLayer(LG[name]);
  }
}
