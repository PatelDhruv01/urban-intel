/**
 * query.js
 * --------
 * Handles the "Find Coverage Gaps" query panel.
 *
 * On each button click:
 *  1. Reads facility type + radius from the sidebar inputs
 *  2. Calls GET /api/query/underserved with those params
 *  3. Clears the underserved layer and redraws fresh rectangles
 *  4. Updates the map overlay badge and result text
 *  5. Switches to map view if the user is on the Analytics tab
 */

/**
 * Run the underserved area query.
 * Called by onclick on the sidebar button.
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
      `${API_BASE}/query/underserved?facility=${facility}&radius_km=${radius_km}`
    );
    const n = data.total_underserved_cells;

    // ── Clear stale rectangles and redraw fresh results ────────────────────
    LG.underserved.clearLayers();

    data.results.forEach(cell => {
      const bounds = cellBounds(cell);

      const popup = `
        <div style="padding:4px 2px;min-width:180px">
          <div class="pn" style="color:#f87171">⚠ Underserved Zone</div>
          <div class="pr">Nearest ${facility}: ${cell["nearest_" + facility + "_km"]} km</div>
          <div class="pr">Gap: +${cell.gap_km} km beyond ${radius_km}km threshold</div>
        </div>`;

      L.rectangle(bounds, {
        color:       "#f43f5e",
        weight:      1,
        fillColor:   "#f43f5e",
        fillOpacity: Math.min(0.12 + cell.gap_km * 0.05, 0.55),
      })
      .bindPopup(popup, { maxWidth: 260 })
      .addTo(LG.underserved);
    });

    // ── Ensure the underserved layer is visible ────────────────────────────
    if (!LA.underserved) toggleLayer("underserved");
    if (!map.hasLayer(LG.underserved)) {
      map.addLayer(LG.underserved);
      LA.underserved = true;
    }

    // ── Update map overlay badge ───────────────────────────────────────────
    const mob = document.getElementById("mob");
    mob.innerHTML = `<b>${n}</b> area${n !== 1 ? "s" : ""} lack ${facility} within ${radius_km}km`;
    mob.classList.add("show");

    // ── Update sidebar result text ─────────────────────────────────────────
    resultEl.textContent = `✓ Found ${n} area${n !== 1 ? "s" : ""} lacking ${facility} within ${radius_km}km.`;
    resultEl.className   = n > 0 ? "qresult warn" : "qresult ok";

    // ── If on Analytics tab, switch back to map ────────────────────────────
    if (document.getElementById("analytics-view").classList.contains("active")) {
      switchView("map", document.getElementById("tab-map"));
    }

  } catch (err) {
    resultEl.textContent = "Error: " + err.message;
    resultEl.className   = "qresult warn";
    console.error("runQuery error:", err);
  }

  btn.disabled = false;
}
