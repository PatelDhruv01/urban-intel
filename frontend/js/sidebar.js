/**
 * sidebar.js — KPI cards, coverage metrics, and view switching.
 */

function switchView(viewName, btn) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(el  => el.classList.remove("active"));
  document.getElementById(viewName + "-view").classList.add("active");
  if (btn) btn.classList.add("active");

  if (viewName === "analytics" && !AppState.analyticsBuilt && AppState.statsData) {
    buildAnalytics(AppState.statsData);
    AppState.analyticsBuilt = true;
  }
  if (viewName === "map") setTimeout(() => map.invalidateSize(), 50);
}

function fillSidebar(stats) {
  const ic = stats.infrastructure_counts;
  const uc = stats.underserved_cells;
  const tc = stats.total_grid_cells;

  document.getElementById("kh").textContent = ic.hospitals.toLocaleString();
  document.getElementById("ks").textContent = ic.schools.toLocaleString();
  document.getElementById("kt").textContent = ic.traffic_nodes.toLocaleString();
  document.getElementById("ku").textContent = uc.any_underserved.toLocaleString();

  const h100 = ((ic.hospitals / tc) * 100).toFixed(1);
  const s100 = ((ic.schools   / tc) * 100).toFixed(1);
  document.getElementById("mc-h").textContent = h100;
  document.getElementById("mc-s").textContent = s100;
  document.getElementById("mc-u").textContent = uc.pct_underserved + "%";
  document.getElementById("mc-p").textContent = ic.pharmacies;

  [0,1,2,3].forEach((i, idx) => {
    setTimeout(() => {
      const el = document.getElementById(`mc${i}`);
      if (el) el.classList.add("in");
    }, 600 + idx * 100);
  });
  setTimeout(() => {
    document.getElementById("mcf-h").style.width = Math.min(parseFloat(h100)*3,   100) + "%";
    document.getElementById("mcf-s").style.width = Math.min(parseFloat(s100)*5,   100) + "%";
    document.getElementById("mcf-u").style.width = uc.pct_underserved + "%";
    document.getElementById("mcf-p").style.width = Math.min((ic.pharmacies/300)*100, 100) + "%";
  }, 900);
}
