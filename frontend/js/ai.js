/**
 * ai.js — AI Planner logic powered by Gemini.
 */

const aiMarkers = L.layerGroup();

async function runAISuggestions() {
  const facility = document.getElementById("ai-facility").value;
  const btn = document.getElementById("ai-btn");
  const output = document.getElementById("ai-output");

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Analyzing...`;
  lucide.createIcons();

  output.innerHTML = renderAILoading();
  setTimeout(() => lucide.createIcons(), 10);

  try {
    const res = await fetch(`${API_BASE}/ai/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facility_type: facility, top_n: 5 }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "API error");
    }

    const data = await res.json();

    if (data.error) {
      output.innerHTML = renderAIError(data.raw_response || data.error);
    } else {
      output.innerHTML = renderAISuggestions(data);
    }
    setTimeout(() => lucide.createIcons(), 10);

  } catch (err) {
    output.innerHTML = renderAIError(err.message);
    setTimeout(() => lucide.createIcons(), 10);
  }

  btn.disabled = false;
  btn.innerHTML = `Generate Strategy`;
}

// ── RENDER HELPERS ────────────────────────────────────────────────────────────

function renderAILoading() {
  return `
    <div class="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-slate-100 shadow-sm">
      <div class="relative w-16 h-16 mb-6 inline-flex items-center justify-center">
         <span class="absolute inset-0 rounded-full border-4 border-slate-100"></span>
         <span class="absolute inset-0 rounded-full border-t-4 border-amber-500 animate-spin"></span>
         <i data-lucide="sparkles" class="w-6 h-6 text-amber-500 animate-pulse"></i>
      </div>
      <div class="space-y-3 text-center">
        <p class="text-slate-800 font-medium">Analyzing <span class="text-amber-600 font-bold">${document.getElementById("ai-facility").value}</span> coverage gaps...</p>
        <p class="text-slate-500 text-sm animate-pulse flex items-center justify-center gap-2">
            <i data-lucide="cpu" class="w-4 h-4"></i> Generating geospatial strategies with Gemini 1.5...
        </p>
      </div>
    </div>`;
}

function renderAIError(msg) {
  const isNoKey = msg.includes("Gemini API key");
  return `
    <div class="bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-red-100 text-red-600 rounded-lg"><i data-lucide="alert-circle" class="w-6 h-6"></i></div>
        <h3 class="text-lg font-bold text-red-900">${isNoKey ? "Gemini API Key Required" : "Analysis Failed"}</h3>
      </div>
      <p class="text-slate-700 font-medium mb-4">${msg}</p>
      ${isNoKey ? `
        <div class="bg-white p-4 rounded-xl border border-red-100 text-sm text-slate-600 space-y-2">
          <p>1. Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-primary hover:underline font-medium">aistudio.google.com</a></p>
          <p>2. Add <code class="bg-slate-100 px-1.5 py-0.5 rounded text-red-500">GEMINI_API_KEY=your_key</code> to <code class="bg-slate-100 px-1.5 py-0.5 rounded font-mono">backend/.env</code></p>
          <p>3. Restart the backend server.</p>
        </div>` : ""}
    </div>`;
}

function renderAISuggestions(data) {
  const suggestions = data.suggestions || [];
  if (!suggestions.length) {
    return `<div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium shadow-sm">No actionable strategies discovered for this request.</div>`;
  }

  const header = `
    <div class="flex flex-col sm:flex-row justify-between items-end border-b border-slate-200 pb-4 mb-6 pt-4">
      <div>
         <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Generated Plan</p>
         <h3 class="text-2xl font-bold text-slate-900 capitalize">${data.facility_type} Expansion Strategy</h3>
      </div>
      <p class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5 mt-4 sm:mt-0">
         <i data-lucide="scan-face" class="w-3.5 h-3.5"></i> ${data.total_underserved_cells} zones analyzed
      </p>
    </div>`;

  const cards = suggestions.map(s => renderSuggestionCard(s)).join("");
  return header + `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">${cards}</div>`;
}

function renderSuggestionCard(s) {
  const isHighImpact = s.smart_impact_score >= 7;
  const scoreColor = isHighImpact ? "text-emerald-600" : (s.smart_impact_score >= 4 ? "text-amber-500" : "text-amber-600");
  const scoreBg = isHighImpact ? "bg-emerald-500" : (s.smart_impact_score >= 4 ? "bg-amber-400" : "bg-amber-500");
  const priorityTagColor = s.priority === "Critical" ? "bg-red-100 text-red-700 border-red-200" : "bg-primary/10 text-primary border-primary/20";
  
  const quickWins = (s.quick_wins || []).map(w =>
    `<li class="flex items-start gap-2 text-sm text-slate-600 font-medium">
      <i data-lucide="check" class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"></i>
      <span>${w}</span>
    </li>`
  ).join("");

  return `
    <div class="bg-surface border border-slate-200 rounded-2xl shadow-card hover:shadow-card-hover transition-all overflow-hidden flex flex-col group relative">
      <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span class="text-6xl font-black text-slate-900 absolute -top-4 -right-2">#${s.rank}</span>
      </div>
      
      <div class="p-6 flex-1 relative z-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="px-2.5 py-0.5 rounded text-xs font-bold border ${priorityTagColor} uppercase tracking-wider">${s.priority} GAP</span>
        </div>
        
        <h4 class="text-xl font-bold text-slate-900 mb-2 leading-tight">${s.area_name || "Uncharted Zone"}</h4>
        
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
           <p class="text-slate-800 font-semibold mb-2 flex items-center gap-2"><i data-lucide="target" class="w-4 h-4 text-primary"></i> Objective</p>
           <p class="text-slate-600 text-sm leading-relaxed">${s.recommendation}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
           <div>
             <p class="text-xs font-bold text-slate-400 tracking-wider mb-1 uppercase">Est. Coverage</p>
             <p class="text-slate-800 font-semibold flex items-center gap-1.5"><i data-lucide="users" class="w-4 h-4 text-slate-400"></i> ${s.estimated_population_served || "N/A"}</p>
           </div>
           <div>
             <p class="text-xs font-bold text-slate-400 tracking-wider mb-1 uppercase">Proximity Deficit</p>
             <p class="text-slate-800 font-semibold flex items-center gap-1.5"><i data-lucide="ruler" class="w-4 h-4 text-slate-400"></i> +${s.gap_km || "0"} km gap</p>
           </div>
        </div>

        ${quickWins ? `<div class="mb-2"><p class="text-xs font-bold text-slate-400 tracking-wider mb-2 uppercase">Execution Path</p><ul class="space-y-1">${quickWins}</ul></div>` : ""}
      </div>
      
      <div class="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between mt-auto">
         <div class="flex-1 mr-4">
             <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-slate-500 tracking-wider uppercase">ROI Score</span>
                <span class="text-sm font-bold ${scoreColor}">${s.smart_impact_score}/10</span>
             </div>
             <div class="w-full bg-slate-200 rounded-full h-2">
                <div class="${scoreBg} h-2 rounded-full" style="width: ${s.smart_impact_score * 10}%"></div>
             </div>
         </div>
         <button onclick="showOnMap(${s.coordinates?.lat}, ${s.coordinates?.lon}, ${JSON.stringify(s.area_name).replace(/"/g,"'")}, ${s.rank})" 
                 class="shrink-0 bg-white border border-slate-200 hover:border-primary text-slate-700 hover:text-primary transition-all font-semibold rounded-lg text-sm px-4 py-2 flex items-center gap-2 shadow-sm focus:ring-4 focus:ring-slate-100 outline-none">
            <i data-lucide="map-pin" class="w-4 h-4"></i> View
         </button>
      </div>
    </div>`;
}

// ── MAP INTEGRATION ───────────────────────────────────────────────────────────

function showOnMap(lat, lon, areaName, rank) {
  if (!lat || !lon) return;

  aiMarkers.clearLayers();
  if (!map.hasLayer(aiMarkers)) aiMarkers.addTo(map);

  const marker = L.circleMarker([lat, lon], {
    radius: 12, fillColor: "#F59E0B", color: "#F59E0B", // Amber matching the AI theme
    weight: 4, opacity: 0.3, fillOpacity: 0.8,
  }).bindPopup(`
    <div style="min-width: 160px; font-family: 'Inter', sans-serif;">
      <div style="font-size: 11px; font-weight: 700; color: #d97706; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Strategic Drop #${rank}</div>
      <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">${areaName}</div>
      <div style="font-size: 12px; color: #64748b; font-family: monospace;">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
    </div>`, { maxWidth: 260, closeButton: false, className: "premium-popup" });

  marker.addTo(aiMarkers);

  // Switch to map screen globally
  window.switchScreen('map');
  
  setTimeout(() => {
    map.invalidateSize();
    map.flyTo([lat, lon], 14, { duration: 1.5, easeLinearity: 0.1 });
    setTimeout(() => { marker.openPopup(); }, 1500);
  }, 100);
}
