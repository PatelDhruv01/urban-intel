/**
 * app.js — Application entry point and SPA orchestrator.
 */

// Global State
const AppState = {
  currentScreen: 'analytics', // Default screen
  statsData: null,
  mapLoaded: false,
};

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  return res.json();
}

function updateLoader(message) {
  const el = document.getElementById("loader-steps");
  if (el) {
    el.innerHTML += `<div class="flex items-center gap-2 text-slate-700 mt-1"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i> ${message}</div>`;
    lucide.createIcons();
  }
}

// ── SPA ROUTING ──────────────────────────────────────────────────────────────
window.switchScreen = function(screenId) {
  console.log("[ROUTING] switchScreen called with:", screenId);
  // Hide all screens
  ['analytics', 'map', 'ai'].forEach(id => {
    document.getElementById(`screen-${id}`).classList.add('hidden');
    // Update nav styling
    const navBtn = document.getElementById(`nav-${id}`);
    if(navBtn) {
      navBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900";
    }
  });

  // Show selected screen
  document.getElementById(`screen-${screenId}`).classList.remove('hidden');
  
  // Update active nav styling
  const activeBtn = document.getElementById(`nav-${screenId}`);
  if(activeBtn) {
    activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary";
  }

  AppState.currentScreen = screenId;

  // Trigger specific initializations
  if (screenId === 'map') {
    // Invalidate map size because it was hidden during init
    if (window.UID_MAP) {
      setTimeout(() => window.UID_MAP.invalidateSize(), 100);
    }
  }
}

// ── BOOT SEQUENCE ────────────────────────────────────────────────────────────
async function boot() {
  try {
    console.log("[BOOT] Starting check...");
    await apiFetch(`${API_BASE}/health`);
    console.log("[BOOT] Health check OK");

    AppState.statsData = await apiFetch(`${API_BASE}/city/stats`);
    console.log("[BOOT] City stats loaded:", AppState.statsData);
    
    // Populate KPI Cards
    if(document.getElementById('kpi-hospitals')) {
      document.getElementById('kpi-hospitals').innerText = (AppState.statsData.infrastructure_counts?.hospitals || 0).toLocaleString();
      document.getElementById('kpi-schools').innerText = (AppState.statsData.infrastructure_counts?.schools || 0).toLocaleString();
      document.getElementById('kpi-traffic').innerText = (AppState.statsData.infrastructure_counts?.traffic_nodes || 0).toLocaleString();
      document.getElementById('kpi-underserved').innerText = (AppState.statsData.underserved_cells?.any_underserved || 0).toLocaleString();
      
      // Insight Strips
      document.getElementById('insight-h').innerText = (AppState.statsData.underserved_cells?.no_hospital_within_3km || 0) + " Grid Cells";
      document.getElementById('insight-s').innerText = (AppState.statsData.underserved_cells?.no_school_within_2km || 0) + " Grid Cells";
      document.getElementById('insight-p').innerText = (AppState.statsData.underserved_cells?.no_pharmacy_within_1_5km || 0) + " Grid Cells";
    }

    // We init the map layers in the background
    console.log("[BOOT] Loading Map layers...");
    const layers = ["hospitals", "schools", "traffic_nodes", "pharmacies"];
    for (let layer of layers) {
      if(typeof loadLayer === 'function') await loadLayer(layer);
    }
    if(typeof loadUnderserved === 'function') await loadUnderserved();

    console.log("[BOOT] Building charts...");
    if(typeof buildCharts === 'function') await buildCharts();

    console.log("[BOOT] System Ready");

  } catch (err) {
    console.error("[BOOT ERROR] Boot failed:", err);
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:9999999;font-size:20px;">CRASH: ${err.message}</div>`;
  }
}

// Start application
document.addEventListener('DOMContentLoaded', boot);

