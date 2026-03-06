/**
 * app.js
 * ------
 * Application entry point.
 *
 * Orchestrates the boot sequence:
 *   1. Health-check the backend
 *   2. Load city statistics → fill sidebar + KPI bar
 *   3. Load each infrastructure layer onto the map
 *   4. Load underserved zones
 *   5. Hide the loader and hand control to the user
 *
 * All heavy lifting is delegated to:
 *   map.js     — loadLayer, loadUnderserved
 *   sidebar.js — fillSidebar
 *   charts.js  — buildAnalytics  (called lazily on tab switch)
 *   query.js   — runQuery        (called by button click)
 */

// ── SHARED API FETCH UTILITY ──────────────────────────────────────────────────
/**
 * Thin wrapper around fetch that throws on non-2xx responses.
 * Used by every module so error handling is consistent.
 *
 * @param {string} url
 * @returns {Promise<Object>} parsed JSON
 */
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  return res.json();
}

// ── LOADER STEP HELPER ────────────────────────────────────────────────────────
/**
 * Advance a loader step indicator.
 *
 * @param {number} i      - step index (0–7)
 * @param {string} state  - "active" | "done"
 */
function loaderStep(i, state) {
  const el = document.getElementById(`ls${i}`);
  if (!el) return;
  el.classList.add("show");
  el.classList.remove("active", "done");
  el.classList.add(state);
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    // Step 0 — backend health check
    loaderStep(0, "active");
    await apiFetch(`${API_BASE}/health`);
    loaderStep(0, "done");

    // Step 1 — city statistics
    loaderStep(1, "active");
    AppState.statsData = await apiFetch(`${API_BASE}/city/stats`);
    fillSidebar(AppState.statsData);
    loaderStep(1, "done");

    // Step 2–5 — infrastructure layers
    const layers = ["hospitals", "schools", "traffic_nodes", "pharmacies"];
    for (let i = 0; i < layers.length; i++) {
      loaderStep(i + 2, "active");
      await loadLayer(layers[i]);
      loaderStep(i + 2, "done");
    }

    // Step 6 — underserved zones
    loaderStep(6, "active");
    await loadUnderserved();
    loaderStep(6, "done");

    // Step 7 — done
    loaderStep(7, "active");
    loaderStep(7, "done");

    // Fade out loader
    setTimeout(() => document.getElementById("loader").classList.add("out"), 500);

  } catch (err) {
    // Show a friendly error inside the loader
    document.getElementById("loader").innerHTML = `
      <div style="
        font-family:'DM Mono',monospace;
        font-size:13px;color:#f87171;
        text-align:center;padding:40px;line-height:2.2
      ">
        ⚠ Cannot reach backend<br>
        <span style="color:#4a6080;font-size:11px">
          Make sure <strong style="color:#6b8caa">app.py</strong> is running on port 5000<br>
          then hard-refresh this page (Ctrl + Shift + R)
        </span>
      </div>`;
    console.error("Boot failed:", err);
  }
}

// Start the app
boot();
