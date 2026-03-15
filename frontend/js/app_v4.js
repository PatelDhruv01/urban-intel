/**
 * app_v4.js — Application entry point and SPA orchestrator for OLED Dark Dashboard.
 */

// Global State
const AppState = {
  currentScreen: 'analytics',
  statsData: null,
  mapLoaded: false,
};

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  return res.json();
}

// ── SPA ROUTING ──────────────────────────────────────────────────────────────
window.switchScreen = function(screenId) {
  // Hide all screens
  ['analytics', 'map', 'ai'].forEach(id => {
    document.getElementById(`screen-${id}`).classList.add('hidden');
    // Update nav styling to inactive
    const navBtn = document.getElementById(`nav-${id}`);
    if(navBtn) {
      navBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-slate-100 hover:border-slate-700";
    }
  });

  // Show selected screen
  document.getElementById(`screen-${screenId}`).classList.remove('hidden');
  
  // Update active nav styling (Cyan Glowing Effect)
  const activeBtn = document.getElementById(`nav-${screenId}`);
  if(activeBtn) {
    if(screenId === 'ai') {
        // Inherit Amber theme for AI Strategist button
        activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-glow-amber";
    } else {
        // Inherit Cyan theme for Dashboard buttons
        activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-glow-cyan";
    }
  }

  AppState.currentScreen = screenId;

  // Trigger specific initializations
  if (screenId === 'map') {
    if (window.UID_MAP) {
      setTimeout(() => window.UID_MAP.invalidateSize(), 150);
    }
  }
}

// ── BOOT SEQUENCE ────────────────────────────────────────────────────────────
async function boot() {
  try {
    console.log("[BOOT] Calibrating Systems...");
    await apiFetch(`${API_BASE}/health`);

    AppState.statsData = await apiFetch(`${API_BASE}/city/stats`);
    console.log("[BOOT] Telemetry OK:", AppState.statsData);
    
    // Populate KPI Cards
    if(document.getElementById('kpi-hospitals')) {
      document.getElementById('kpi-hospitals').innerText = (AppState.statsData.infrastructure_counts?.hospitals || 0).toLocaleString();
      document.getElementById('kpi-schools').innerText = (AppState.statsData.infrastructure_counts?.schools || 0).toLocaleString();
      document.getElementById('kpi-traffic').innerText = (AppState.statsData.infrastructure_counts?.traffic_nodes || 0).toLocaleString();
      document.getElementById('kpi-underserved').innerText = (AppState.statsData.underserved_cells?.any_underserved || 0).toLocaleString();
      
      // Insight Strips (Replacing the standard doughnut label sidebars)
      document.getElementById('insight-h').innerText = (AppState.statsData.underserved_cells?.no_hospital_within_3km || 0);
      document.getElementById('insight-s').innerText = (AppState.statsData.underserved_cells?.no_school_within_2km || 0);
      document.getElementById('insight-p').innerText = (AppState.statsData.underserved_cells?.no_pharmacy_within_1_5km || 0);
    }

    // Load Map Layers early so the visual data is stored natively across SPA routes
    console.log("[BOOT] Initializing Spatial Vectors...");
    const layers = ["hospitals", "schools", "traffic_nodes", "pharmacies"];
    for (let layer of layers) {
      if(typeof loadLayer === 'function') await loadLayer(layer);
    }

    // Disable underserved default overlay as it looks better toggled optionally with Heatmap
    if (window.LA.underserved && typeof loadUnderserved === 'function') {
        await loadUnderserved();
    }

    console.log("[BOOT] Processing Matrix Visualization Charts...");
    if(typeof buildCharts === 'function') await buildCharts();

    console.log("[BOOT] System Optimal.");
    // Initial UI state setup for Heatmap loading without showing it
    if(typeof loadUnderserved === 'function' && !window.LA.underserved) await loadUnderserved(); // Loads but doesn't instantly addLayer

  } catch (err) {
    console.error("[CRITICAL FAILURE]", err);
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;right:0;background:rgba(225,29,72,0.9);backdrop-filter:blur(10px);color:white;padding:24px;z-index:9999999;font-family:monospace;border-bottom:2px solid #fff;box-shadow:0 0 30px rgba(225,29,72,0.5);">[SYSTEM HALT] FATAL EXCEPTION: ${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', boot);
