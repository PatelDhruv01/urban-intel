/**
 * charts.js — All Chart.js chart definitions for the Analytics tab.
 */

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#101827", borderColor: "rgba(56,189,248,.2)", borderWidth: 1,
      titleColor: "#38bdf8", bodyColor: "#f0f6ff",
      titleFont: { family: "'DM Mono',monospace", size: 10 },
      bodyFont:  { family: "'DM Mono',monospace", size: 10 },
    }
  },
  scales: {
    x: { ticks: { color: "#4a6080", font: { family: "'DM Mono',monospace", size: 8 }, maxRotation: 0 }, grid: { color: "rgba(56,189,248,.04)" } },
    y: { ticks: { color: "#4a6080", font: { family: "'DM Mono',monospace", size: 8 } }, grid: { color: "rgba(56,189,248,.04)" } },
  },
};

async function buildAnalytics(stats) {
  const ic = stats.infrastructure_counts;
  const uc = stats.underserved_cells;

  [0,1,2,3].forEach((i, idx) => setTimeout(() => { const e = document.getElementById(`ak${i}`); if(e) e.classList.add("in"); }, idx*80));
  document.getElementById("ak-h").textContent    = ic.hospitals.toLocaleString();
  document.getElementById("ak-s").textContent    = ic.schools.toLocaleString();
  document.getElementById("ak-t").textContent    = ic.traffic_nodes.toLocaleString();
  document.getElementById("ak-u").textContent    = uc.any_underserved.toLocaleString();
  document.getElementById("ak-upct").textContent = `${uc.pct_underserved}% of city area`;

  document.getElementById("ins-h").textContent = uc.no_hospital_within_3km;
  document.getElementById("ins-s").textContent = uc.no_school_within_2km;
  document.getElementById("ins-p").textContent = uc.no_pharmacy_within_1_5km;
  [0,1,2].forEach((i, idx) => setTimeout(() => { const e = document.getElementById(`ins${i}`); if(e) e.classList.add("in"); }, 200+idx*80));
  [0,1,2,3].forEach((i, idx) => setTimeout(() => { const e = document.getElementById(`cc${i}`); if(e) e.classList.add("in"); }, 320+idx*80));

  const h = await apiFetch(`${API_BASE}/analytics/summary?category=hospitals&top_n=15`);
  new Chart(document.getElementById("ch-hosp"), {
    type: "bar",
    data: { labels: h.data.map(d=>d.cell_id), datasets: [{ data: h.data.map(d=>d.count), backgroundColor: h.data.map((_,i)=>`hsla(${190+i*3},80%,55%,${.55+i*.02})`), borderRadius: 4, borderSkipped: false }] },
    options: { ...CHART_DEFAULTS }
  });

  new Chart(document.getElementById("ch-infra"), {
    type: "bar",
    data: { labels: ["Hospitals","Schools","Traffic","Pharmacies"], datasets: [{ data: [ic.hospitals,ic.schools,ic.traffic_nodes,ic.pharmacies], backgroundColor: ["rgba(56,189,248,.8)","rgba(251,191,36,.8)","rgba(248,113,113,.8)","rgba(52,211,153,.8)"], borderRadius: 5, borderSkipped: false }] },
    options: { ...CHART_DEFAULTS, indexAxis: "y", scales: { x: { ...CHART_DEFAULTS.scales.x }, y: { ticks: { color: "#f0f6ff", font: { family: "'Outfit',sans-serif", size: 11 } }, grid: { color: "rgba(56,189,248,.04)" } } } }
  });

  const s = await apiFetch(`${API_BASE}/analytics/summary?category=schools&top_n=15`);
  new Chart(document.getElementById("ch-school"), {
    type: "bar",
    data: { labels: s.data.map(d=>d.cell_id), datasets: [{ data: s.data.map(d=>d.count), backgroundColor: s.data.map((_,i)=>`hsla(${45-i*2},90%,58%,${.55+i*.02})`), borderRadius: 4, borderSkipped: false }] },
    options: { ...CHART_DEFAULTS }
  });

  new Chart(document.getElementById("ch-under"), {
    type: "doughnut",
    data: { labels: ["No Hospital (3km)","No School (2km)","No Pharmacy (1.5km)"], datasets: [{ data: [uc.no_hospital_within_3km,uc.no_school_within_2km,uc.no_pharmacy_within_1_5km], backgroundColor: ["rgba(56,189,248,.85)","rgba(251,191,36,.85)","rgba(52,211,153,.85)"], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { display: true, position: "bottom", labels: { color: "#6b8caa", font: { family: "'DM Mono',monospace", size: 9 }, boxWidth: 10, padding: 10 } }, tooltip: CHART_DEFAULTS.plugins.tooltip } }
  });
}
