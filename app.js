import { generateLayout } from "./js/core/layoutEngine.js"
import { renderSvg } from "./js/renderer/svgRenderer.js"
import { renderOpeningReport } from "./js/renderer/openingReportRenderer.js"
import { renderSummary } from "./js/renderer/summaryRenderer.js"

let openings = []

// ====================== UTILITIES ======================
function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function collectFormState() {
  return {
    wallLength: Number(document.getElementById("wallLength").value) || 480,
    panelCoverage: Number(document.getElementById("panelCoverage").value) || 36,
    ribSpacing: Number(document.getElementById("ribSpacing").value) || 12,
    startOffset: Number(document.getElementById("startOffset").value) || 0,
    openings: [...openings]
  };
}

function updateLayout() {
  const config = collectFormState();
  const model = generateLayout(config);

  renderSvg(model);
  renderOpeningReport(model);
  renderSummary(model);
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

// ====================== EXPORT ======================
function exportSVG() {
  const svgContainer = document.getElementById("wallSvg");
  if (!svgContainer.innerHTML) return;

  const svgContent = svgContainer.innerHTML.trim();
  const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="380" viewBox="0 0 900 380">\n${svgContent}\n</svg>`;

  const blob = new Blob([fullSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panel-layout-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====================== INITIALIZATION ======================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("layoutForm");

  // Real-time preview (best improvement)
  form.addEventListener("input", debounce(updateLayout, 160));

  // Manual buttons
  document.getElementById("generateBtn").addEventListener("click", updateLayout);
  document.getElementById("addOpeningBtn").addEventListener("click", addOpening);
  document.getElementById("exportBtn").addEventListener("click", exportSVG);

  // Initial load
  renderOpeningsList();
  updateLayout();
});