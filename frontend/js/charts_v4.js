/**
 * charts_v4.js — Advanced Chart.js chart definitions for the OLED Dark Analytics Hub.
 */

const DARK_CHART_DEFAULTS = {
  responsive: true, 
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      labels: { color: "#94a3b8", font: { family: "'Fira Code', monospace", size: 11 } }
    },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.9)", 
      borderColor: "#334155", 
      borderWidth: 1,
      titleColor: "#f8fafc", 
      bodyColor: "#cbd5e1",
      padding: 12,
      titleFont: { family: "'Fira Code', monospace", size: 12, weight: 'bold' },
      bodyFont:  { family: "'Inter', sans-serif", size: 12, weight: 'normal' },
      boxPadding: 4,
      backdropFilter: "blur(4px)"
    }
  },
  scales: {
    x: { 
      ticks: { color: "#64748b", font: { family: "'Fira Code', monospace", size: 10 } }, 
      grid: { color: "rgba(255,255,255,0.05)", drawBorder: false } 
    },
    y: { 
      ticks: { color: "#64748b", font: { family: "'Fira Code', monospace", size: 10 } }, 
      grid: { color: "rgba(255,255,255,0.05)", drawBorder: false },
      border: { display: false }
    },
  },
};

async function buildCharts() {
  const stats = AppState.statsData;
  if(!stats) return;

  const ic = stats.infrastructure_counts;
  const uc = stats.underserved_cells;

  // Global defaults for fonts
  Chart.defaults.font.family = "'Fira Code', monospace";
  Chart.defaults.color = "#94a3b8";

  // 1. Chart: Zone Readiness Vector (Radar)
  const ctxRadar = document.getElementById("ch-radar");
  if(ctxRadar) {
    // Normalize counts to a 0-100 score for better radar visualization (mock logic for demo)
    const maxCount = Math.max(ic.hospitals, ic.schools, ic.traffic_nodes, ic.pharmacies);
    const getScore = (val) => Math.round((val / maxCount) * 100);

    new Chart(ctxRadar, {
      type: "radar",
      data: { 
        labels: ["Healthcare", "Education", "Transport", "Pharmacies"], 
        datasets: [{ 
          label: "Current Density",
          data: [getScore(ic.hospitals), getScore(ic.schools), getScore(ic.traffic_nodes), getScore(ic.pharmacies)], 
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          borderColor: "#22d3ee",
          pointBackgroundColor: "#22d3ee",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#22d3ee",
          borderWidth: 2
        },
        { 
          label: "Optimal Target",
          data: [90, 85, 70, 80], 
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderColor: "#f59e0b",
          borderDash: [5, 5],
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#fff",
          borderWidth: 2
        }] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: "#94a3b8" } },
            tooltip: DARK_CHART_DEFAULTS.plugins.tooltip
        },
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            pointLabels: { color: '#cbd5e1', font: { size: 11 } },
            ticks: { display: false, backdropColor: 'transparent' }
          }
        }
      }
    });
  }

  // 2. Chart: Trajectory Prediction (Multi-Axis Line)
  const ctxMulti = document.getElementById("ch-multi");
  if(ctxMulti) {
    // We generate a mock 6-month historical trend leading up to current day
    const generateTrend = (current, volatility) => {
        let arr = [];
        let val = Math.round(current * 0.7); // start 30% lower 6 months ago
        for(let i=0; i<6; i++) {
            arr.push(val);
            val += Math.round((current - val) / (6 - i) + (Math.random() * volatility));
        }
        arr.push(current); // Month 7 is current
        return arr;
    };

    new Chart(ctxMulti, {
      type: "line",
      data: { 
        labels: ["M-6", "M-5", "M-4", "M-3", "M-2", "M-1", "Current"], 
        datasets: [
          { 
            label: "Healthcare Growth",
            data: generateTrend(ic.hospitals, 50), 
            borderColor: "#22d3ee", // Cyan
            backgroundColor: "rgba(34, 211, 238, 0.1)",
            yAxisID: 'y',
            tension: 0.4,
            fill: true
          },
          { 
            label: "Underserved Deficit",
            data: generateTrend(uc.any_underserved, -20).reverse(), // Deficit going down
            borderColor: "#f43f5e", // Rose
            backgroundColor: "transparent",
            borderDash: [5, 5],
            yAxisID: 'y1',
            tension: 0.4
          }
        ] 
      },
      options: { 
        ...DARK_CHART_DEFAULTS,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: DARK_CHART_DEFAULTS.scales.x,
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#22d3ee" }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false }, // only draw grid lines for one axis
            ticks: { color: "#f43f5e" }
          }
        }
      }
    });
  }

  // 3. Chart: Network Efficiency (Doughnut)
  const ctxDoughnut = document.getElementById("ch-doughnut");
  if(ctxDoughnut) {
    const totalServed = ic.hospitals + ic.schools + ic.pharmacies;
    const totalUnderserved = uc.no_hospital_within_3km + uc.no_school_within_2km + uc.no_pharmacy_within_1_5km;

    new Chart(ctxDoughnut, {
      type: "doughnut",
      data: { 
        labels: ["Efficient Grid Coverage", "Deficit Coverage Zones"], 
        datasets: [{ 
          data: [totalServed, totalUnderserved], 
          backgroundColor: ["#22d3ee", "#1e293b"], 
          borderWidth: 2,
          borderColor: "#020617", 
          hoverOffset: 4 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: "75%", 
        plugins: { 
          legend: { 
            display: true, 
            position: "bottom", 
            labels: { color: "#94a3b8", usePointStyle: true, padding: 20 } 
          }, 
          tooltip: DARK_CHART_DEFAULTS.plugins.tooltip 
        } 
      }
    });
  }
}
