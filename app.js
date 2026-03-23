import { generateLayout, generateGableLayout } from "./js/core/layoutEngine.js"
import { renderSvg } from "./js/renderer/svgRenderer.js"
import { renderGable } from "./js/renderer/gableRenderer.js"
import { renderOpeningReport } from "./js/renderer/openingReportRenderer.js"
import { renderSummary } from "./js/renderer/summaryRenderer.js"

let openings = []
let currentMode = "sidewall"

// ====================== UTILITIES ======================
function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function collectFormState() {
  if (currentMode === "sidewall") {
    return {
      wallLength: Number(document.getElementById("wallLength").value) || 480,
      wallHeight: Number(document.getElementById("wallHeight").value) || 120,   // ← NEW
      panelCoverage: Number(document.getElementById("panelCoverage").value) || 36,
      ribSpacing: Number(document.getElementById("ribSpacing").value) || 12,
      startOffset: Number(document.getElementById("startOffset").value) || 0,
      openings: [...openings],
      mode: "sidewall"
    };
  } else {
    return {
      wallLength: Number(document.getElementById("gableWallLength").value) || 480,
      eaveHeight: Number(document.getElementById("eaveHeight").value) || 120,
      peakHeight: Number(document.getElementById("peakHeight").value) || 180,
      panelCoverage: Number(document.getElementById("gablePanelCoverage").value) || 36,
      openings: [],
      mode: "gable"
    };
  }
}

function updateLayout() {
  const config = collectFormState();
  let model;

  if (currentMode === "sidewall") {
    model = generateLayout(config);
    renderSvg(model);
  } else {
    model = generateGableLayout(config);
    renderGable(model);
  }

  renderOpeningReport(model);
  renderSummary(model);
}

// ====================== MODE TOGGLE ======================
function switchMode(mode) {
  currentMode = mode;
  document.getElementById("sidewallBtn").classList.toggle("active", mode === "sidewall");
  document.getElementById("gableBtn").classList.toggle("active", mode === "gable");
  document.getElementById("sidewallFields").classList.toggle("hidden", mode !== "sidewall");
  document.getElementById("gableFields").classList.toggle("hidden", mode !== "gable");
  document.getElementById("previewTitle").textContent = 
    mode === "sidewall" ? "Live Preview – Sidewall" : "Live Preview – Gable End";
  updateLayout();
}

// ====================== OPENINGS UI ======================
function renderOpeningsList() {
  const list = document.getElementById("openingsList");
  if (!list) return;
  list.innerHTML = "";

  openings.forEach((op, index) => {
    const div = document.createElement("div");
    div.className = "opening-item";
    div.innerHTML = `
      <span>${op.start}" → ${op.start + op.width}"</span>
      <button class="delete-btn">X</button>
    `;
    div.querySelector(".delete-btn").onclick = () => {
      openings.splice(index, 1);
      renderOpeningsList();
      updateLayout();
    };
    list.appendChild(div);
  });
}

function addOpening() {
  const start = Number(document.getElementById("openingStart").value);
  const width = Number(document.getElementById("openingWidth").value);
  if (start < 0 || width <= 0) return;

  openings.push({ start, width });

  document.getElementById("openingStart").value = "";
  document.getElementById("openingWidth").value = "";

  renderOpeningsList();
  updateLayout();
}

// ====================== EXPORT (with embedded styles + reports) ======================
function exportSVG() {
  const svgEl = document.getElementById("wallSvg");
  const diagramHTML = svgEl.innerHTML.trim();

  const styleBlock = `
    <defs>
      <style>
        .wall-outline {fill:#0f172a;stroke:#94a3b8;stroke-width:1.2}
        .panel-full {fill:#1e293b;stroke:#64748b;stroke-width:1}
        .panel-cut {fill:#020617;stroke:#f87171;stroke-width:2}
        .opening-box {fill:rgba(239,68,68,0.25);stroke:#ef4444;stroke-width:2}
        .panel-seam {stroke:#e2e8f0;stroke-width:1.6}
        .rib-line {stroke:#22c55e;stroke-width:1;stroke-dasharray:2 6;opacity:0.3}
        .dimension-line,.tick {stroke:#64748b;stroke-width:1}
        .dimension-text,.total-text,.panel-label {font-family:"Fira Code",monospace;fill:#e2e8f0}
        .wall-line,.roof-line,.panel-line {stroke:#94a3b8;stroke-width:2}
      </style>
    </defs>`;

  const summaryText = document.getElementById("panelSummary").textContent.trim().replace(/\s+/g, " ");
  const reportText = document.getElementById("openingReport").textContent.trim().replace(/\s+/g, " ");

  const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720" viewBox="0 0 900 720">
    ${styleBlock}
    <g transform="translate(0,20)">${diagramHTML}</g>
    <text x="30" y="460" font-family="Fira Code" font-size="14" fill="#e2e8f0">=== PANEL SUMMARY ===</text>
    <text x="30" y="490" font-family="Fira Code" font-size="12" fill="#94a3b8">${summaryText}</text>
    <text x="30" y="540" font-family="Fira Code" font-size="14" fill="#e2e8f0">=== OPENINGS REPORT ===</text>
    <text x="30" y="570" font-family="Fira Code" font-size="12" fill="#94a3b8">${reportText.substring(0, 300)}...</text>
  </svg>`;

  const blob = new Blob([fullSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panel-layout-${currentMode}-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====================== INITIALIZATION (with mobile keyboard enhancements) ======================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("layoutForm");

  // Real-time preview
  form.addEventListener("input", debounce(updateLayout, 160));

  // Auto-select text on focus (fast overwrite on phone)
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('focus', function() {
      this.select();
    });
  });

  // Enter key navigation between fields
  form.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const inputs = Array.from(this.querySelectorAll('input[type="number"]'));
      const currentIndex = inputs.indexOf(e.target);
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
        e.preventDefault();
      } else {
        updateLayout();               // Last field → trigger update
      }
    }
  });

  // Buttons
  document.getElementById("sidewallBtn").addEventListener("click", () => switchMode("sidewall"));
  document.getElementById("gableBtn").addEventListener("click", () => switchMode("gable"));
  document.getElementById("addOpeningBtn").addEventListener("click", addOpening);
  document.getElementById("exportBtn").addEventListener("click", exportSVG);

  // Start in sidewall mode
  switchMode("sidewall");
});