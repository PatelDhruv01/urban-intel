/**
 * query.js — Dynamic underserved area query feature.
 * Calls /api/v1/analysis/query with user-selected facility + radius.
 */

async function runQuery() {
  const facility  = document.getElementById("q-fac").value;
  const radius_km = parseFloat(document.getElementById("q-km").value) || 3;
  const resultEl  = document.getElementById("qresult");
  const btn       = document.getElementById("qbtn");

  resultEl.textContent = "⏳ Querying...";
  resultEl.className   = "qresult";
  btn.disabled         = true;

  try {
    const data = await apiFetch(
      `${API_BASE}/analysis/query?facility=${facility}&radius_km=${radius_km}`
    );
    const n = data.total_underserved_cells;

    LG.underserved.clearLayers();
    data.results.forEach(cell => {
      L.rectangle(cellBounds(cell), {
        color: "#f43f5e", weight: 1, fillColor: "#f43f5e",
        fillOpacity: Math.min(0.12 + cell.gap_km * 0.05, 0.55),
      }).bindPopup(`<div style="padding:4px 2px;min-width:180px">
        <div class="pn" style="color:#f87171">⚠ Underserved Zone</div>
        <div class="pr">Nearest ${facility}: ${cell["nearest_" + facility + "_km"]} km</div>
        <div class="pr">Gap: +${cell.gap_km} km beyond ${radius_km}km threshold</div>
      </div>`, { maxWidth: 260 }).addTo(LG.underserved);
    });

    if (!LA.underserved) toggleLayer("underserved");
    if (!map.hasLayer(LG.underserved)) { map.addLayer(LG.underserved); LA.underserved = true; }

    const mob = document.getElementById("mob");
    mob.innerHTML = `<b>${n}</b> area${n!==1?"s":""} lack ${facility} within ${radius_km}km`;
    mob.classList.add("show");

    resultEl.textContent = `✓ Found ${n} area${n!==1?"s":""} lacking ${facility} within ${radius_km}km.`;
    resultEl.className   = n > 0 ? "qresult warn" : "qresult ok";

    if (document.getElementById("analytics-view").classList.contains("active") ||
        document.getElementById("ai-view").classList.contains("active")) {
      switchView("map", document.getElementById("tab-map"));
    }
  } catch (err) {
    resultEl.textContent = "Error: " + err.message;
    resultEl.className   = "qresult warn";
  }
  btn.disabled = false;
}
