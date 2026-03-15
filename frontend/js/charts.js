/**
 * charts.js — All Chart.js chart definitions for the Analytics tab.
 */

const CHART_DEFAULTS = {
  responsive: true, 
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#ffffff", 
      borderColor: "#e2e8f0", 
      borderWidth: 1,
      titleColor: "#0f172a", 
      bodyColor: "#475569",
      padding: 12,
      titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
      bodyFont:  { family: "'Inter', sans-serif", size: 12, weight: 'normal' },
      boxPadding: 4
    }
  },
  scales: {
    x: { 
      ticks: { color: "#64748b", font: { family: "'Inter', sans-serif", size: 11 }, maxRotation: 45 }, 
      grid: { color: "rgba(0,0,0,0.03)", display: false } 
    },
    y: { 
      ticks: { color: "#64748b", font: { family: "'Inter', sans-serif", size: 11 } }, 
      grid: { color: "rgba(0,0,0,0.05)" },
      border: { display: false }
    },
  },
};

async function buildCharts() {
  const stats = AppState.statsData;
  if(!stats) return;

  const ic = stats.infrastructure_counts;
  const uc = stats.underserved_cells;

  // Chart 1: Overview Bar
  const ctxInfra = document.getElementById("ch-infra");
  if(ctxInfra) {
    new Chart(ctxInfra, {
      type: "bar",
      data: { 
        labels: ["Hospitals", "Schools", "Traffic Node", "Pharmacies"], 
        datasets: [{ 
          data: [ic.hospitals, ic.schools, ic.traffic_nodes, ic.pharmacies], 
          backgroundColor: ["#06B6D4", "#F59E0B", "#EF4444", "#8B5CF6"], 
          borderRadius: 6, 
          borderSkipped: false,
          barPercentage: 0.6
        }] 
      },
      options: { 
        ...CHART_DEFAULTS, 
        indexAxis: "y", 
        scales: { 
          x: { ...CHART_DEFAULTS.scales.x, display: true, grid: { color: "rgba(0,0,0,0.05)" } }, 
          y: { ticks: { color: "#334155", font: { family: "'Inter', sans-serif", size: 12, weight: '500' } }, grid: { display: false } } 
        } 
      }
    });
  }

  // Chart 2: Top Hospitals
  const ctxHosp = document.getElementById("ch-hosp");
  if(ctxHosp) {
    const h = await apiFetch(`${API_BASE}/analytics/summary?category=hospitals&top_n=10`);
    new Chart(ctxHosp, {
      type: "bar",
      data: { 
        labels: h.data.map(d=>d.cell_id), 
        datasets: [{ 
          data: h.data.map(d=>d.count), 
          backgroundColor: "rgba(6, 182, 212, 0.8)", // Cyan
          hoverBackgroundColor: "#06B6D4",
          borderRadius: 4, 
          borderSkipped: false 
        }] 
      },
      options: { ...CHART_DEFAULTS }
    });
  }

  // Chart 3: Underserved Doughnut
  const ctxUnder = document.getElementById("ch-under");
  if(ctxUnder) {
    new Chart(ctxUnder, {
      type: "doughnut",
      data: { 
        labels: ["No Hospital (3km)","No School (2km)","No Pharmacy (1.5km)"], 
        datasets: [{ 
          data: [uc.no_hospital_within_3km, uc.no_school_within_2km, uc.no_pharmacy_within_1_5km], 
          backgroundColor: ["#06B6D4","#F59E0B","#8B5CF6"], 
          borderWidth: 2,
          borderColor: "#ffffff", 
          hoverOffset: 4 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: "70%", 
        layout: { padding: 10 },
        plugins: { 
          legend: { 
            display: true, 
            position: "bottom", 
            labels: { color: "#475569", font: { family: "'Inter', sans-serif", size: 12 }, usePointStyle: true, padding: 20 } 
          }, 
          tooltip: CHART_DEFAULTS.plugins.tooltip 
        } 
      }
    });
  }
}
