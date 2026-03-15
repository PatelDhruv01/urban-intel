/**
 * ai_v4.js — Cyberpunk AI Strategist powered by Gemini.
 */

const aiMarkers = L.layerGroup();

async function runAISuggestions() {
  const facility = document.getElementById("ai-facility").value;
  const btn = document.getElementById("ai-btn");
  const output = document.getElementById("ai-output");

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> RUNNING...`;
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
      throw new Error(err.detail || "Subroutine failed");
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
  btn.innerHTML = `<i data-lucide="cpu" class="w-4 h-4"></i> RUN PROCESS`;
}

// ── RENDER HELPERS ─────────────

function renderAILoading() {
  return `
    <div class="flex flex-col items-center justify-center py-24 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-glow-amber">
      <div class="relative w-16 h-16 mb-6 inline-flex items-center justify-center">
         <span class="absolute inset-0 rounded border-2 border-amber-500/20"></span>
         <span class="absolute inset-0 rounded bg-amber-500/10 animate-ping"></span>
         <i data-lucide="radar" class="w-8 h-8 text-amber-500 animate-[spin_3s_linear_infinite]"></i>
      </div>
      <div class="space-y-3 text-center">
        <p class="text-slate-200 font-mono tracking-widest uppercase">Scanning <span class="text-amber-500 font-bold">${document.getElementById("ai-facility").value}</span> vectors...</p>
        <p class="text-slate-500 text-xs font-mono uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
            <i data-lucide="cpu" class="w-3 h-3"></i> Running neural strategy matrices...
        </p>
      </div>
    </div>`;
}

function renderAIError(msg) {
  const isNoKey = msg.includes("Gemini API key");
  return `
    <div class="bg-slate-900 border border-rose-500/50 rounded-2xl p-8 shadow-card relative overflow-hidden">
      <div class="absolute inset-0 bg-rose-500/5 z-0"></div>
      <div class="relative z-10 flex items-center gap-3 mb-4">
        <div class="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded shadow-inner"><i data-lucide="alert-triangle" class="w-6 h-6"></i></div>
        <h3 class="text-lg font-mono font-bold text-rose-500 uppercase tracking-widest">${isNoKey ? "Auth Key Missing" : "Subroutine Failed"}</h3>
      </div>
      <p class="text-slate-300 font-mono text-sm mb-4 relative z-10">> ${msg}</p>
      ${isNoKey ? `
        <div class="bg-slate-950 p-4 rounded border border-slate-800 text-xs font-mono text-slate-400 space-y-2 relative z-10">
          <p>> 1. GET KEY: <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-cyan-400 hover:text-cyan-300 underline">aistudio.google.com</a></p>
          <p>> 2. INJECT: <span class="text-rose-400">GEMINI_API_KEY=your_key</span> into <span class="text-slate-300">backend/.env</span></p>
          <p>> 3. REBOOT SYSTEM.</p>
        </div>` : ""}
    </div>`;
}

function renderAISuggestions(data) {
  const suggestions = data.suggestions || [];
  if (!suggestions.length) {
    return `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 font-mono uppercase tracking-widest shadow-inner">0 anomalies detected. System optimal.</div>`;
  }

  const header = `
    <div class="flex flex-col sm:flex-row justify-between items-end border-b border-slate-800 pb-4 mb-6 pt-4">
      <div>
         <p class="text-[10px] font-bold text-amber-500/70 font-mono uppercase tracking-widest mb-1">> Generated Strategy Matrix</p>
         <h3 class="text-2xl font-mono font-bold text-slate-50 capitalize">${data.facility_type} Expansion</h3>
      </div>
      <p class="text-[10px] uppercase tracking-widest font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded border border-cyan-400/20 flex items-center gap-1.5 mt-4 sm:mt-0">
         <i data-lucide="scan" class="w-3.5 h-3.5"></i> ${data.total_underserved_cells} SCANNED
      </p>
    </div>`;

  const cards = suggestions.map(s => renderSuggestionCard(s)).join("");
  return header + `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12 w-full">${cards}</div>`;
}

function renderSuggestionCard(s) {
  const isHighImpact = s.smart_impact_score >= 7;
  const scoreColor = isHighImpact ? "text-cyan-400" : (s.smart_impact_score >= 4 ? "text-amber-400" : "text-amber-600");
  const scoreBg = isHighImpact ? "bg-cyan-400" : (s.smart_impact_score >= 4 ? "bg-amber-400" : "bg-amber-600");
  const glowClass = isHighImpact ? "shadow-glow-cyan border-cyan-500/30" : "shadow-glow-amber border-amber-500/30";
  const priorityTagColor = s.priority === "Critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  
  const quickWins = (s.quick_wins || []).map(w =>
    `<li class="flex items-start gap-2 text-[11px] font-mono text-slate-400 tracking-wide">
      <span class="text-cyan-500 mt-0.5 shrink-0">></span>
      <span>${w}</span>
    </li>`
  ).join("");

  return `
    <div class="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl hover:${glowClass} transition-all duration-300 overflow-hidden flex flex-col group relative">
      <div class="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <span class="text-8xl font-black font-mono text-slate-50 absolute -top-4 -right-2">0${s.rank}</span>
      </div>
      
      <div class="p-6 flex-1 relative z-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityTagColor} uppercase tracking-widest">${s.priority} GAP</span>
        </div>
        
        <h4 class="text-xl font-bold font-mono text-slate-100 mb-2 leading-tight">${s.area_name || "Uncharted Zone"}</h4>
        
        <div class="p-4 bg-slate-950 rounded border border-slate-800 mb-6 shadow-inner">
           <p class="text-slate-400 text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2"><i data-lucide="target" class="w-3 h-3 text-amber-500"></i> Tactical Objective</p>
           <p class="text-slate-300 text-sm leading-relaxed font-inter">${s.recommendation}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
           <div>
             <p class="text-[10px] font-bold font-mono text-slate-500 tracking-widest mb-1 uppercase">Est. Coverage</p>
             <p class="text-slate-200 font-mono font-semibold flex items-center gap-1.5"><i data-lucide="users" class="w-3 h-3 text-slate-500"></i> ${s.estimated_population_served || "N/A"}</p>
           </div>
           <div>
             <p class="text-[10px] font-bold font-mono text-slate-500 tracking-widest mb-1 uppercase">Proximity Deficit</p>
             <p class="text-rose-400 font-mono font-semibold flex items-center gap-1.5"><i data-lucide="ruler" class="w-3 h-3 text-rose-500"></i> +${s.gap_km || "0"} km</p>
           </div>
        </div>

        ${quickWins ? `<div class="mb-2"><p class="text-[10px] font-bold font-mono text-slate-500 tracking-widest mb-2 uppercase">Execution Path</p><ul class="space-y-1.5">${quickWins}</ul></div>` : ""}
      </div>
      
      <div class="bg-slate-950 p-5 border-t border-slate-800 flex items-center justify-between mt-auto">
         <div class="flex-1 mr-4">
             <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold font-mono text-slate-500 tracking-widest uppercase">Impact Matrix</span>
                <span class="text-xs font-mono font-bold ${scoreColor}">${s.smart_impact_score}/10</span>
             </div>
             <div class="w-full bg-slate-800 rounded-full h-1">
                <div class="${scoreBg} h-1 rounded-full shadow-[0_0_8px_currentColor]" style="width: ${s.smart_impact_score * 10}%"></div>
             </div>
         </div>
         <button onclick="showOnMap(${s.coordinates?.lat}, ${s.coordinates?.lon}, ${JSON.stringify(s.area_name).replace(/"/g,"'")}, ${s.rank})" 
                 class="shrink-0 bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all font-mono font-bold uppercase tracking-wider rounded text-[10px] px-3 py-2 flex items-center gap-2 shadow-inner focus:outline-none">
            <i data-lucide="crosshair" class="w-3 h-3"></i> Locate
         </button>
      </div>
    </div>`;
}

// ── MAP INTEGRATION ─────────────

function showOnMap(lat, lon, areaName, rank) {
  if (!lat || !lon) return;

  aiMarkers.clearLayers();
  if (!map.hasLayer(aiMarkers)) aiMarkers.addTo(map);

  const marker = L.circleMarker([lat, lon], {
    radius: 12, fillColor: "#22d3ee", color: "#020617", // Cyan marker for DarkMatter
    weight: 2, opacity: 1, fillOpacity: 0.8, className: 'animate-pulse'
  }).bindPopup(`
    <div style="min-width: 180px; font-family: 'Fira Code', monospace; padding: 4px;">
      <div style="font-size: 10px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Strategic Zone 0${rank}</div>
      <div style="font-size: 12px; font-family: 'Inter', sans-serif; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">${areaName}</div>
      <div style="font-size: 10px; color: #64748b;">[${lat.toFixed(4)}, ${lon.toFixed(4)}]</div>
    </div>`, { closeButton: false, className: "cyber-popup" });

  marker.addTo(aiMarkers);

  window.switchScreen('map');
  
  setTimeout(() => {
    map.invalidateSize();
    map.flyTo([lat, lon], 14, { duration: 1.5, easeLinearity: 0.1 });
    setTimeout(() => { marker.openPopup(); }, 1500);
  }, 100);
}
