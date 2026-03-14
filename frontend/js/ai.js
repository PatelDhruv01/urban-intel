/**
 * ai.js
 * -----
 * AI Suggestions tab — calls the backend /ai/suggestions endpoint
 * which queries Google Gemini with underserved area data.
 *
 * Features:
 *  - Select facility type to analyse
 *  - Animated loading state while Gemini processes
 *  - Rich suggestion cards with coordinates, priority, reasoning, impact score
 *  - "Show on Map" button pins the suggested location on the map
 */

// Suggestion markers for "Show on Map"
const aiMarkers = L.layerGroup();

async function runAISuggestions() {
  const facility = document.getElementById("ai-facility").value;
  const btn      = document.getElementById("ai-btn");
  const output   = document.getElementById("ai-output");

  btn.disabled  = true;
  btn.textContent = "⏳ Asking Gemini...";
  output.innerHTML = renderAILoading();

  try {
    const res = await fetch(`${API_BASE}/ai/suggestions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ facility_type: facility, top_n: 5 }),
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
      attachMapButtons(data.suggestions || []);
    }

  } catch (err) {
    output.innerHTML = renderAIError(err.message);
  }

  btn.disabled    = false;
  btn.textContent = "✨ GENERATE AI SUGGESTIONS";
}

// ── RENDER HELPERS ────────────────────────────────────────────────────────────

function renderAILoading() {
  return `
    <div class="ai-loading">
      <div class="ai-spinner"></div>
      <div class="ai-loading-text">
        <div class="ai-lt-line">Analysing ${document.getElementById("ai-facility").value} coverage gaps...</div>
        <div class="ai-lt-line" style="animation-delay:.4s">Sending urban data to Gemini 1.5 Flash...</div>
        <div class="ai-lt-line" style="animation-delay:.8s">Generating planning suggestions...</div>
      </div>
    </div>`;
}

function renderAIError(msg) {
  const isNoKey = msg.includes("Gemini API key");
  return `
    <div class="ai-error">
      <div class="ai-error-icon">⚠️</div>
      <div class="ai-error-title">${isNoKey ? "Gemini API Key Not Configured" : "Something went wrong"}</div>
      <div class="ai-error-msg">${msg}</div>
      ${isNoKey ? `
        <div class="ai-error-help">
          1. Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--cyan)">aistudio.google.com</a> (free)<br>
          2. Create an API key<br>
          3. Add <code>GEMINI_API_KEY=your_key</code> to <code>backend/.env</code><br>
          4. Restart the backend server
        </div>` : ""}
    </div>`;
}

function renderAISuggestions(data) {
  const suggestions = data.suggestions || [];
  if (!suggestions.length) {
    return `<div class="ai-empty">No suggestions generated. Try a different facility type.</div>`;
  }

  const header = `
    <div class="ai-result-header">
      <div class="ai-result-title">
        AI Planning Suggestions — <span style="color:var(--cyan)">${data.facility_type.toUpperCase()}</span>
      </div>
      <div class="ai-result-meta">
        ${data.total_underserved_cells} underserved cells analysed · Powered by ${data.model || "Gemini"}
      </div>
    </div>`;

  const cards = suggestions.map(s => renderSuggestionCard(s)).join("");
  return header + `<div class="ai-cards">${cards}</div>`;
}

function renderSuggestionCard(s) {
  const priorityColor = {
    "Critical": "var(--red)",
    "High":     "var(--orange)",
    "Medium":   "var(--yellow)",
  }[s.priority] || "var(--cyan)";

  const scoreWidth = Math.min((s.smart_impact_score / 10) * 100, 100);
  const scoreColor = s.smart_impact_score >= 7 ? "var(--green)" :
                     s.smart_impact_score >= 4 ? "var(--yellow)" : "var(--red)";

  const quickWins = (s.quick_wins || []).map(w =>
    `<div class="ai-qw">→ ${w}</div>`
  ).join("");

  return `
    <div class="ai-card" id="ai-card-${s.rank}">
      <div class="ai-card-header">
        <div class="ai-card-rank">#${s.rank}</div>
        <div class="ai-card-area">${s.area_name || "Unnamed Area"}</div>
        <div class="ai-card-priority" style="color:${priorityColor};border-color:${priorityColor}">
          ${s.priority || "Medium"}
        </div>
      </div>

      <div class="ai-card-rec">💡 ${s.recommendation || "Build new facility"}</div>

      <div class="ai-card-body">
        <div class="ai-card-reasoning">${s.reasoning || ""}</div>

        <div class="ai-card-meta-row">
          <div class="ai-meta-item">
            <div class="ai-meta-label">COORDINATES</div>
            <div class="ai-meta-val" style="font-family:'DM Mono',monospace;font-size:11px">
              ${s.coordinates?.lat?.toFixed(4)}°N, ${s.coordinates?.lon?.toFixed(4)}°E
            </div>
          </div>
          <div class="ai-meta-item">
            <div class="ai-meta-label">EST. POPULATION SERVED</div>
            <div class="ai-meta-val">${s.estimated_population_served || "—"}</div>
          </div>
          <div class="ai-meta-item">
            <div class="ai-meta-label">COVERAGE GAP</div>
            <div class="ai-meta-val" style="color:var(--orange)">${s.gap_km || "—"} km beyond threshold</div>
          </div>
        </div>

        <div class="ai-impact-row">
          <div class="ai-meta-label">SMART IMPACT SCORE</div>
          <div class="ai-impact-bar-wrap">
            <div class="ai-impact-bar" style="width:${scoreWidth}%;background:${scoreColor}"></div>
          </div>
          <div class="ai-impact-num" style="color:${scoreColor}">${s.smart_impact_score}/10</div>
        </div>

        ${quickWins ? `<div class="ai-qw-title">QUICK WINS</div><div class="ai-qw-list">${quickWins}</div>` : ""}
      </div>

      <div class="ai-card-footer">
        <button class="ai-map-btn" onclick="showOnMap(${s.coordinates?.lat}, ${s.coordinates?.lon}, ${JSON.stringify(s.area_name).replace(/"/g,"'")}, ${s.rank})">
          📍 Show on Map
        </button>
      </div>
    </div>`;
}

// ── MAP INTEGRATION ───────────────────────────────────────────────────────────

function attachMapButtons() {
  // Buttons are rendered inline with onclick, nothing to attach
}

function showOnMap(lat, lon, areaName, rank) {
  if (!lat || !lon) return;

  // Clear previous AI markers
  aiMarkers.clearLayers();
  if (!map.hasLayer(aiMarkers)) aiMarkers.addTo(map);

  const marker = L.circleMarker([lat, lon], {
    radius: 14, fillColor: "#a78bfa", color: "#a78bfa",
    weight: 2, opacity: 1, fillOpacity: 0.4,
  }).bindPopup(`
    <div style="padding:4px 2px;min-width:180px">
      <div class="pn" style="color:#a78bfa">🤖 AI Suggestion #${rank}</div>
      <div class="pr">${areaName}</div>
      <div class="pr">📍 ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</div>
    </div>`, { maxWidth: 260 });

  marker.addTo(aiMarkers);

  // Switch to map and fly to location
  switchView("map", document.getElementById("tab-map"));
  setTimeout(() => {
    map.invalidateSize();
    map.flyTo([lat, lon], 14, { duration: 1.2 });
    marker.openPopup();
  }, 100);
}
