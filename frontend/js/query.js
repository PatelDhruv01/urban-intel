/**
 * query.js — Dynamic underserved area query feature.
 */

async function runQuery() {
  const facility  = document.getElementById("q-fac").value;
  const radius_km = parseFloat(document.getElementById("q-km").value) || 3;
  const resultEl  = document.getElementById("qresult");
  const btn       = document.getElementById("qbtn");

  resultEl.innerHTML = `<span class="flex justify-center items-center gap-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Indexing gap data...</span>`;
  lucide.createIcons();
  btn && (btn.disabled = true);

  try {
    const data = await apiFetch(`${API_BASE}/analysis/query?facility=${facility}&radius_km=${radius_km}`);
    const n = data.total_underserved_cells;

    LG.underserved.clearLayers();
    data.results.forEach(cell => {
      L.rectangle(cellBounds(cell), {
        color: "#EC4899", weight: 2, fillColor: "#EC4899",
        fillOpacity: Math.min(0.1 + cell.gap_km * 0.05, 0.4),
      }).bindPopup(`
        <div style="min-width: 160px; font-family: 'Inter', sans-serif;">
          <div style="font-size: 11px; font-weight: 700; color: #be185d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">⚠ Underserved Zone</div>
          <div style="font-size: 13px; font-weight: 500; color: #334155; margin-bottom: 2px;">Nearest ${facility}: <b>${cell["nearest_" + facility + "_km"]}km</b></div>
          <div style="font-size: 12px; color: #ef4444;">Gap: +${cell.gap_km}km vs goal</div>
        </div>`, { maxWidth: 260, closeButton: false }).addTo(LG.underserved);
    });

    if (!LA.underserved) toggleLayer("underserved");
    if (!map.hasLayer(LG.underserved)) { map.addLayer(LG.underserved); LA.underserved = true; }
    
    // Update map layer toggle checkbox if exists
    const chk = document.getElementById('t-underserved');
    if (chk) chk.checked = true;

    resultEl.innerHTML = `<span class="text-emerald-600 font-semibold"><i data-lucide="check" class="w-3 h-3 inline"></i> Found ${n} critical gap${n!==1?"s":""}.</span>`;
    
  } catch (err) {
    resultEl.innerHTML = `<span class="text-red-600"><i data-lucide="x" class="w-3 h-3 inline"></i> ${err.message}</span>`;
  }
  btn && (btn.disabled = false);
  lucide.createIcons();
}
