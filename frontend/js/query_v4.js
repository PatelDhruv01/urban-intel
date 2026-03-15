/**
 * query_v4.js — Advanced Vector Search logic to find underserved zones and update Heatmap.
 */

async function runQuery() {
  const facility  = document.getElementById("q-fac").value;
  const radius_km = parseFloat(document.getElementById("q-km").value) || 3;
  const resultEl  = document.getElementById("qresult");

  resultEl.innerHTML = `<span class="flex justify-center items-center gap-2 text-cyan-400 font-mono tracking-widest"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> CALIBRATING VECTORS...</span>`;
  lucide.createIcons();

  try {
    const data = await apiFetch(`${API_BASE}/analysis/query?facility=${facility}&radius_km=${radius_km}`);
    const n = data.total_underserved_cells;

    // HeatLayer uses setLatLngs instead of clearLayers
    if (window.LG.underserved) {
        map.removeLayer(window.LG.underserved);
    }

    const heatPoints = data.results.map(cell => [
        cell.center_lat, 
        cell.center_lon, 
        Math.min(1.0, cell.gap_km / 2) // intensity derived from gap severity
    ]);

    window.LG.underserved = L.heatLayer(heatPoints, {
      radius: 40,
      blur: 25,
      maxZoom: 14,
      gradient: {
          0.2: '#3b82f6', // blue
          0.5: '#f59e0b', // amber
          1.0: '#f43f5e'  // rose
      }
    });

    if (window.LA.underserved) {
        map.addLayer(window.LG.underserved);
    } else {
        toggleLayer("underserved"); // Turns it on
    }

    resultEl.innerHTML = `<span class="text-amber-500 font-bold"><i data-lucide="crosshairs" class="w-3 h-3 inline"></i> ${n} CRITICAL GAPS FOUND</span>`;
    
  } catch (err) {
    resultEl.innerHTML = `<span class="text-rose-500 font-bold"><i data-lucide="alert-triangle" class="w-3 h-3 inline"></i> SYSTEM ERROR</span>`;
  }
  lucide.createIcons();
}
