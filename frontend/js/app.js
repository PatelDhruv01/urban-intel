/**
 * app.js — Application entry point and boot orchestrator.
 */

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  return res.json();
}

function loaderStep(i, state) {
  const el = document.getElementById(`ls${i}`);
  if (!el) return;
  el.classList.add("show");
  el.classList.remove("active", "done");
  el.classList.add(state);
}

async function boot() {
  try {
    loaderStep(0, "active");
    await apiFetch(`${API_BASE}/health`);
    loaderStep(0, "done");

    loaderStep(1, "active");
    AppState.statsData = await apiFetch(`${API_BASE}/city/stats`);
    fillSidebar(AppState.statsData);
    loaderStep(1, "done");

    const layers = ["hospitals", "schools", "traffic_nodes", "pharmacies"];
    for (let i = 0; i < layers.length; i++) {
      loaderStep(i + 2, "active");
      await loadLayer(layers[i]);
      loaderStep(i + 2, "done");
    }

    loaderStep(6, "active");
    await loadUnderserved();
    loaderStep(6, "done");

    loaderStep(7, "active");
    loaderStep(7, "done");

    setTimeout(() => document.getElementById("loader").classList.add("out"), 500);

  } catch (err) {
    document.getElementById("loader").innerHTML = `
      <div style="font-family:'DM Mono',monospace;font-size:13px;color:#f87171;text-align:center;padding:40px;line-height:2.2">
        ⚠ Cannot reach backend<br>
        <span style="color:#4a6080;font-size:11px">
          Make sure <strong style="color:#6b8caa">uvicorn app:app --reload --port 8000</strong>
          is running<br>then hard-refresh (Ctrl+Shift+R)
        </span>
      </div>`;
    console.error("Boot failed:", err);
  }
}

boot();
