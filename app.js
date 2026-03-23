import { generateLayout } from "./js/core/layoutEngine.js"
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
  // (unchanged from previous version – sidewall + gable logic)
  if (currentMode === "sidewall") {
    return {
      wallLength: Number(document.getElementById("wallLength").value) || 480,
      wallHeight: Number(document.getElementById("wallHeight").value) || 120,
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

// ====================== MODE TOGGLE (unchanged) ======================
function switchMode(mode) { /* unchanged from previous version */ }

// ====================== OPENINGS & EXPORT (unchanged) ======================
function renderOpeningsList() { /* unchanged */ }
function addOpening() { /* unchanged */ }
function exportSVG() { /* unchanged */ }

// ====================== NEW: MOBILE KEYBOARD OPTIMIZATIONS ======================
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