// app.js

import { generateLayout, generateGableLayout } from "./js/core/layoutEngine.js";
import { renderSvg } from "./js/renderer/svgRenderer.js";
import { renderGable } from "./js/renderer/gableRenderer.js";
import { renderOpeningReport } from "./js/renderer/openingReportRenderer.js";
import { renderSummary } from "./js/renderer/summaryRenderer.js";

let openings = [];
let currentMode = "sidewall";
let showGrid = true;
let showLabels = true;

/* ======================
   UTILITIES
====================== */
function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function byId(id) {
  return document.getElementById(id);
}

function formatInches(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0"';
  const rounded = Math.round(num * 1000) / 1000;
  return `${rounded}"`;
}

function formatFeetInches(value) {
  const total = Math.round(Number(value) || 0);
  const feet = Math.floor(total / 12);
  const inches = total % 12;
  return `${feet}' ${inches}"`;
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapSvgText(text, maxChars = 92) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

/* ======================
   STATE COLLECTION
====================== */
function collectFormState() {
  if (currentMode === "sidewall") {
    return {
      wallLength: Number(byId("wallLength")?.value) || 480,
      wallHeight: Number(byId("wallHeight")?.value) || 120,
      panelCoverage: Number(byId("panelCoverage")?.value) || 36,
      ribSpacing: Number(byId("ribSpacing")?.value) || 12,
      startOffset: Number(byId("startOffset")?.value) || 0,
      openings: [...openings],
      mode: "sidewall"
    };
  }

  const wallLength = Number(byId("gableWallLength")?.value) || 480;

  return {
    wallLength,
    leftEaveHeight: Number(byId("leftEaveHeight")?.value) || 120,
    rightEaveHeight: Number(byId("rightEaveHeight")?.value) || 120,
    peakHeight: Number(byId("peakHeight")?.value) || 180,
    ridgePosition: Number(byId("ridgePosition")?.value) || wallLength / 2,
    panelCoverage: Number(byId("gablePanelCoverage")?.value) || 36,
    openings: [],
    mode: "gable"
  };
}

/* ======================
   STATUS + SUMMARIES
====================== */
function inferWarnings(model) {
  if (!model) return [];

  const warnings = [];

  if (model.mode === "sidewall") {
    if (Array.isArray(model.openingAnalysis)) {
      model.openingAnalysis.forEach((opening) => {
        if (Array.isArray(opening.warnings) && opening.warnings.length) {
          opening.warnings.forEach((warning) => {
            warnings.push(`Opening ${opening.id}: ${warning}`);
          });
        }
      });
    }

    if (model.summary?.startPanel !== null && model.summary?.endPanel !== null) {
      if (Number(model.summary.startPanel) !== Number(model.summary.endPanel)) {
        warnings.push(
          `Start panel (${model.summary.startPanel}") and end panel (${model.summary.endPanel}") do not match.`
        );
      }
    }

    if (
      (Number(model.startOffset) || 0) >= (Number(model.ribSpacing) || 0) &&
      (Number(model.ribSpacing) || 0) > 0
    ) {
      warnings.push("Start offset is greater than or equal to rib spacing.");
    }

    (model.openings || []).forEach((opening, index) => {
      const top = (Number(opening.bottom) || 0) + (Number(opening.height) || 0);
      if (top > (Number(model.wallHeight) || 0)) {
        warnings.push(`Opening ${index + 1} top exceeds wall height.`);
      }
    });
  }

  if (model.mode === "gable") {
    if ((Number(model.peakHeight) || 0) <= (Number(model.leftEaveHeight) || 0)) {
      warnings.push("Peak height should be greater than left eave height.");
    }

    if ((Number(model.peakHeight) || 0) <= (Number(model.rightEaveHeight) || 0)) {
      warnings.push("Peak height should be greater than right eave height.");
    }

    if (
      (Number(model.ridgePosition) || 0) <= 0 ||
      (Number(model.ridgePosition) || 0) >= (Number(model.wallLength) || 0)
    ) {
      warnings.push("Ridge position should fall between the left and right wall ends.");
    }

    if (!Array.isArray(model.gableCuts) || model.gableCuts.length === 0) {
      warnings.push("No gable panels were generated.");
    }
  }

  return warnings;
}

function renderStatusBar(model, warnings = []) {
  const wallLength =
    currentMode === "sidewall"
      ? Number(model?.wallLength) || Number(byId("wallLength")?.value) || 480
      : Number(model?.wallLength) || Number(byId("gableWallLength")?.value) || 480;

  const coverage =
    currentMode === "sidewall"
      ? Number(model?.panelCoverage) || Number(byId("panelCoverage")?.value) || 36
      : Number(model?.panelCoverage) || Number(byId("gablePanelCoverage")?.value) || 36;

  const rib = Number(model?.ribSpacing) || Number(byId("ribSpacing")?.value) || 12;
  const warningCount = warnings.length;

  setText("statusMode", currentMode === "sidewall" ? "Sidewall" : "Gable End");
  setText("statusLength", formatInches(wallLength));
  setText(
    "statusWarnings",
    warningCount ? `${warningCount} Warning${warningCount > 1 ? "s" : ""}` : "OK"
  );
  setText("statusCoverage", `${formatInches(coverage)} Coverage`);
  setText("statusRib", currentMode === "sidewall" ? `${formatInches(rib)} Rib` : "Asym Gable");
  setText("statusOpenings", `${openings.length} Opening${openings.length === 1 ? "" : "s"}`);

  const warningEl = byId("statusWarnings");
  if (warningEl) {
    warningEl.classList.toggle("status-pill-warning", warningCount > 0);
  }
}

function renderSectionSummaries(model) {
  if (currentMode === "sidewall") {
    const wallLength = Number(model?.wallLength) || Number(byId("wallLength")?.value) || 480;
    setText("sidewallSummary", `Sidewall • ${formatFeetInches(wallLength)}`);
  } else {
    const wallLength = Number(model?.wallLength) || Number(byId("gableWallLength")?.value) || 480;
    setText("gableSummary", `Gable • ${formatFeetInches(wallLength)}`);
  }

  const coverage =
    currentMode === "sidewall"
      ? Number(model?.panelCoverage) || Number(byId("panelCoverage")?.value) || 36
      : Number(model?.panelCoverage) || Number(byId("gablePanelCoverage")?.value) || 36;

  const rib = Number(model?.ribSpacing) || Number(byId("ribSpacing")?.value) || 12;
  const rulesSummary =
    currentMode === "sidewall"
      ? `PBR • ${formatInches(coverage)} / ${formatInches(rib)}`
      : `Asym • ${formatInches(coverage)} panels`;

  setText("rulesSummary", rulesSummary);
  setText("openingsSummary", `${openings.length} Added`);
}

function renderWarningsPanel(warnings) {
  const panel = byId("warningsReport");
  if (!panel) return;

  if (!warnings.length) {
    panel.innerHTML = `<div class="good-status">No warnings from current UI checks.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="warning-box">
      <strong>Warnings</strong>
      <ul>
        ${warnings.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

/* ======================
   CUTS TAB RENDERER
====================== */
function buildSidewallCutData(model) {
  const edgeCuts = [];
  const openingCuts = [];
  const panelRows = [];

  if (model.summary?.startPanel !== null) {
    edgeCuts.push({
      label: "Start Panel",
      panel: "P1",
      width: model.summary.startPanel,
      location: "Left Wall End"
    });

    panelRows.push({
      panel: "P1",
      type: "Edge",
      instruction: `Trim panel to ${formatInches(model.summary.startPanel)} at left wall end`
    });
  }

  if (model.summary?.endPanel !== null) {
    const endPanelNumber = Array.isArray(model.panels) ? model.panels.length : "?";
    edgeCuts.push({
      label: "End Panel",
      panel: `P${endPanelNumber}`,
      width: model.summary.endPanel,
      location: "Right Wall End"
    });

    panelRows.push({
      panel: `P${endPanelNumber}`,
      type: "Edge",
      instruction: `Trim panel to ${formatInches(model.summary.endPanel)} at right wall end`
    });
  }

  if (Array.isArray(model.openingAnalysis)) {
    model.openingAnalysis.forEach((opening) => {
      if (!Array.isArray(opening.intersectingPanels) || !opening.intersectingPanels.length) return;

      const panelNames = opening.intersectingPanels.map((cut) => `P${cut.panel}`);

      openingCuts.push({
        label: opening.label || `Opening ${opening.id}`,
        panels: panelNames,
        start: opening.start,
        end: opening.end,
        bottom: opening.bottom,
        top: opening.top,
        intersectingPanels: opening.intersectingPanels
      });

      opening.intersectingPanels.forEach((cut) => {
        panelRows.push({
          panel: `P${cut.panel}`,
          type: "Opening",
          instruction:
            `${opening.label || `Opening ${opening.id}`} cut ` +
            `${formatInches(cut.cutStart)} to ${formatInches(cut.cutEnd)}, ` +
            `height ${formatInches(cut.openingBottom)} to ${formatInches(cut.openingTop)}`
        });
      });
    });
  }

  return { edgeCuts, openingCuts, panelRows };
}

function renderCutsPanel(model) {
  const panel = byId("cutsReport");
  if (!panel) return;

  if (!model) {
    panel.innerHTML = `<div class="empty-state">No cut data available.</div>`;
    return;
  }

  if (model.mode === "gable") {
    panel.innerHTML = `
      <div class="cuts-block">
        <h3>Cut Instructions</h3>
        <div class="empty-state">Use the Summary tab for the full gable cut schedule.</div>
      </div>
    `;
    return;
  }

  const { edgeCuts, openingCuts, panelRows } = buildSidewallCutData(model);

  panel.innerHTML = `
    <div class="cuts-block">
      <h3>Cut Instructions</h3>

      <div class="cuts-section">
        <div class="cuts-section-title">Edge Cuts</div>

        ${
          edgeCuts.length
            ? edgeCuts
                .map(
                  (cut) => `
                    <div class="cut-row">
                      <div class="cut-row-head">
                        <strong>${cut.label}</strong>
                        <span class="cut-badge cut-badge-edge">Edge Cut</span>
                      </div>
                      <div class="cut-row-body">
                        <div class="cut-metric">
                          <span>Panel</span>
                          <strong>${cut.panel}</strong>
                        </div>
                        <div class="cut-metric">
                          <span>Cut Width</span>
                          <strong>${formatInches(cut.width)}</strong>
                        </div>
                        <div class="cut-metric">
                          <span>Location</span>
                          <strong>${cut.location}</strong>
                        </div>
                      </div>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state">No edge cuts detected.</div>`
        }
      </div>

      <div class="cuts-section">
        <div class="cuts-section-title">Opening Cuts</div>

        ${
          openingCuts.length
            ? openingCuts
                .map(
                  (cut) => `
                    <div class="cut-row">
                      <div class="cut-row-head">
                        <strong>${cut.label}</strong>
                        <span class="cut-badge cut-badge-opening">Opening Cut</span>
                      </div>
                      <div class="cut-row-body">
                        <div class="cut-metric">
                          <span>Panels Affected</span>
                          <strong>${cut.panels.join(", ")}</strong>
                        </div>
                        <div class="cut-metric">
                          <span>Horizontal Range</span>
                          <strong>${formatInches(cut.start)} → ${formatInches(cut.end)}</strong>
                        </div>
                        <div class="cut-metric">
                          <span>Vertical Range</span>
                          <strong>${formatInches(cut.bottom)} → ${formatInches(cut.top)}</strong>
                        </div>
                      </div>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state">No opening cuts detected.</div>`
        }
      </div>

      <div class="cuts-section">
        <div class="cuts-section-title">Panel-by-Panel</div>

        ${
          panelRows.length
            ? `
              <div class="cut-table">
                <div class="cut-table-head">
                  <span>Panel</span>
                  <span>Type</span>
                  <span>Instruction</span>
                </div>

                ${panelRows
                  .map(
                    (row) => `
                      <div class="cut-table-row">
                        <span>${row.panel}</span>
                        <span>${row.type}</span>
                        <span>${row.instruction}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<div class="empty-state">No panel cut instructions generated.</div>`
        }
      </div>
    </div>
  `;
}

/* ======================
   PREVIEW VISIBILITY
====================== */
function applyPreviewVisibility() {
  const svg = byId("wallSvg");
  if (!svg) return;

  svg.classList.toggle("grid-hidden", !showGrid);
  svg.classList.toggle("labels-hidden", !showLabels);
}

function fitPreview() {
  updateLayout();
  applyPreviewVisibility();
}

function toggleGrid() {
  showGrid = !showGrid;
  applyPreviewVisibility();
}

function toggleLabels() {
  showLabels = !showLabels;
  applyPreviewVisibility();
}

/* ======================
   TAB VISIBILITY BY MODE
====================== */
function syncTabVisibility() {
  const cutsTab = byId("cutsTab");
  const cutsPanel = byId("cutsPanel");

  if (!cutsTab || !cutsPanel) return;

  const showCuts = currentMode === "sidewall";

  cutsTab.classList.toggle("hidden", !showCuts);
  cutsPanel.classList.toggle("hidden", !showCuts);

  if (!showCuts && cutsTab.classList.contains("active")) {
    activateResultsTab("summaryPanel");
  }
}

/* ======================
   LAYOUT UPDATE
====================== */
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

  const merged = { ...model, ...config };
  const warnings = inferWarnings(merged);

  renderWarningsPanel(warnings);
  renderCutsPanel(merged);
  renderStatusBar(merged, warnings);
  renderSectionSummaries(merged);
  syncTabVisibility();
  applyPreviewVisibility();

  return model;
}

/* ======================
   MODE TOGGLE
====================== */
function switchMode(mode) {
  currentMode = mode;

  const sidewallBtn = byId("sidewallBtn");
  const gableBtn = byId("gableBtn");
  const sidewallCard = byId("sidewallCard");
  const gableCard = byId("gableCard");
  const sidewallFields = byId("sidewallFields");
  const gableFields = byId("gableFields");
  const openingsCard = byId("openingsCard");
  const previewTitle = byId("previewTitle");

  sidewallBtn?.classList.toggle("active", mode === "sidewall");
  gableBtn?.classList.toggle("active", mode === "gable");
  sidewallBtn?.setAttribute("aria-pressed", String(mode === "sidewall"));
  gableBtn?.setAttribute("aria-pressed", String(mode === "gable"));

  sidewallCard?.classList.toggle("hidden", mode !== "sidewall");
  gableCard?.classList.toggle("hidden", mode !== "gable");
  openingsCard?.classList.toggle("hidden", mode !== "sidewall");

  sidewallFields?.classList.toggle("hidden", mode !== "sidewall");
  gableFields?.classList.toggle("hidden", mode !== "gable");

  if (previewTitle) {
    previewTitle.textContent =
      mode === "sidewall" ? "Live Preview – Sidewall" : "Live Preview – Gable End";
  }

  syncTabVisibility();
  renderSectionSummaries(collectFormState());
  updateLayout();
}

/* ======================
   OPENINGS UI
====================== */
function renderOpeningsList() {
  const list = byId("openingsList");
  if (!list) return;

  list.innerHTML = "";

  if (openings.length === 0) {
    list.innerHTML = `<div class="empty-state">No openings added yet.</div>`;
    renderSectionSummaries(collectFormState());
    return;
  }

  openings.forEach((op, index) => {
    const div = document.createElement("div");
    div.className = "opening-item";

    const label = op.label?.trim() || `Opening ${index + 1}`;
    const end = (Number(op.start) || 0) + (Number(op.width) || 0);
    const top = (Number(op.bottom) || 0) + (Number(op.height) || 0);

    div.innerHTML = `
      <span>${label}: ${formatInches(op.start)} → ${formatInches(end)} • ${formatInches(op.bottom)} → ${formatInches(top)}</span>
      <button class="delete-btn" type="button" aria-label="Delete ${label}">X</button>
    `;

    const deleteBtn = div.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        openings.splice(index, 1);
        renderOpeningsList();
        updateLayout();
      };
    }

    list.appendChild(div);
  });

  renderSectionSummaries(collectFormState());
}

function addOpening() {
  if (currentMode !== "sidewall") return;

  const labelInput = byId("openingLabel");
  const startInput = byId("openingStart");
  const bottomInput = byId("openingBottom");
  const widthInput = byId("openingWidth");
  const heightInput = byId("openingHeight");

  const label = labelInput?.value?.trim() || `Opening ${openings.length + 1}`;
  const start = Number(startInput?.value);
  const bottom = Number(bottomInput?.value);
  const width = Number(widthInput?.value);
  const height = Number(heightInput?.value);

  if (![start, bottom, width, height].every(Number.isFinite)) return;
  if (start < 0 || bottom < 0 || width <= 0 || height <= 0) return;

  openings.push({
    id: openings.length + 1,
    label,
    start,
    bottom,
    width,
    height
  });

  if (labelInput) labelInput.value = "";
  if (startInput) startInput.value = "";
  if (bottomInput) bottomInput.value = "";
  if (widthInput) widthInput.value = "";
  if (heightInput) heightInput.value = "";

  renderOpeningsList();
  updateLayout();
}

/* ======================
   ACCORDION
====================== */
function bindAccordion() {
  document.querySelectorAll(".accordion-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      const panel = targetId ? byId(targetId) : null;
      const card = button.closest(".accordion-card");
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      if (!panel || !card) return;

      button.setAttribute("aria-expanded", String(!isExpanded));
      card.classList.toggle("is-open", !isExpanded);
      panel.classList.toggle("hidden", isExpanded);
    });
  });
}

function openAccordion(cardId, panelId) {
  const card = byId(cardId);
  const panel = byId(panelId);
  const toggle = card?.querySelector(".accordion-toggle");

  if (!card || !panel || !toggle) return;

  card.classList.add("is-open");
  panel.classList.remove("hidden");
  toggle.setAttribute("aria-expanded", "true");
}

/* ======================
   RESULT TABS
====================== */
function activateResultsTab(panelId) {
  document.querySelectorAll(".results-tab").forEach((tab) => {
    const isActive = tab.dataset.panel === panelId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll(".results-panel").forEach((panel) => {
    const isActive = panel.id === panelId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function bindResultsTabs() {
  document.querySelectorAll(".results-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("hidden")) return;
      const panelId = tab.dataset.panel;
      if (!panelId) return;
      activateResultsTab(panelId);
    });
  });
}

/* ======================
   FOOTER ACTIONS
====================== */
function focusOpeningsForm() {
  if (currentMode !== "sidewall") return;

  openAccordion("openingsCard", "openingsPanel");
  byId("openingsCard")?.scrollIntoView({ behavior: "smooth", block: "start" });

  setTimeout(() => {
    byId("openingLabel")?.focus();
  }, 220);
}

function openMoreMenuTarget() {
  const warningsText = byId("warningsReport")?.textContent?.trim() || "";
  const hasWarnings =
    warningsText.length > 0 && !warningsText.toLowerCase().includes("no warnings");

  const target = hasWarnings ? "warningsPanel" : "reportPanel";
  activateResultsTab(target);
  byId(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================
   EXPORT
====================== */
function exportSVG() {
  const svgEl = byId("wallSvg");
  if (!svgEl) return;

  const diagramHTML = svgEl.innerHTML.trim();

  const styleBlock = `
    <defs>
      <style>
        .wall-outline {fill:#23282d;stroke:#ecf2f6;stroke-width:1.2}
        .panel-full {fill:rgba(57,213,255,0.06);stroke:rgba(57,213,255,0.5);stroke-width:1}
        .panel-cut {fill:rgba(245,158,11,0.08);stroke:#f59e0b;stroke-width:2}
        .opening-box {fill:rgba(245,158,11,0.14);stroke:#f59e0b;stroke-width:2}
        .panel-seam {stroke:#d9edf7;stroke-width:1.45}
        .rib-line {stroke:#39d5ff;stroke-width:1;stroke-dasharray:2 5;opacity:0.4}
        .dimension-line {stroke:#8aa0b2;stroke-width:1}
        .tick {stroke:#ffffff;stroke-width:2}
        .dimension-text,.total-text,.panel-label {
          font-family:"Fira Code", monospace;
          fill:#f3f8fd;
        }
        .wall-line,.roof-line,.panel-line {stroke:#d8edf7;stroke-width:2}
        .grid-line {stroke:rgba(57,213,255,0.12);stroke-width:1}

        .export-title {
          font-family:"Fira Code", monospace;
          font-size:20px;
          font-weight:600;
          fill:#f3f8fd;
        }
        .export-subtitle {
          font-family:"Fira Code", monospace;
          font-size:12px;
          fill:#9aa6b2;
        }
        .export-section-title {
          font-family:"Fira Code", monospace;
          font-size:14px;
          font-weight:600;
          fill:#f3f8fd;
        }
        .export-body {
          font-family:"Fira Code", monospace;
          font-size:11px;
          fill:#c8d0d8;
        }
        .export-box {
          fill:#2a2f34;
          stroke:#46505a;
          stroke-width:1;
          rx:12;
        }
      </style>
    </defs>`;

  const summaryText = byId("panelSummary")?.textContent?.trim().replace(/\s+/g, " ") || "";
  const reportText = byId("openingReport")?.textContent?.trim().replace(/\s+/g, " ") || "";

  const summaryLines = wrapSvgText(summaryText, 88);
  const reportLines = wrapSvgText(reportText, 88);

  const summaryTspans = summaryLines
    .map((line, index) => `<tspan x="40" dy="${index === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`)
    .join("");

  const reportTspans = reportLines
    .map((line, index) => `<tspan x="40" dy="${index === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`)
    .join("");

  const modeLabel = currentMode === "sidewall" ? "Sidewall Layout" : "Gable Layout";

  const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="920" viewBox="0 0 1000 920">
    ${styleBlock}
    <rect width="100%" height="100%" fill="#1b1d1f"></rect>

    <text x="40" y="42" class="export-title">CR27 Panel Layout Export</text>
    <text x="40" y="64" class="export-subtitle">${modeLabel}</text>

    <rect x="28" y="88" width="944" height="430" class="export-box"></rect>
    <g transform="translate(40,110)">
      ${diagramHTML}
    </g>

    <rect x="28" y="544" width="944" height="140" class="export-box"></rect>
    <text x="40" y="570" class="export-section-title">Panel Summary</text>
    <text x="40" y="596" class="export-body">${summaryTspans}</text>

    <rect x="28" y="706" width="944" height="180" class="export-box"></rect>
    <text x="40" y="732" class="export-section-title">Openings Report</text>
    <text x="40" y="758" class="export-body">${reportTspans}</text>
  </svg>`;

  const blob = new Blob([fullSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panel-layout-${currentMode}-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ======================
   FORM UX
====================== */
function bindFormBehavior() {
  const form = byId("layoutForm");
  if (!form) return;

  form.addEventListener(
    "input",
    debounce(() => {
      renderSectionSummaries(collectFormState());
      updateLayout();
    }, 160)
  );

  document.querySelectorAll('input[type="number"], input[type="text"]').forEach((input) => {
    input.addEventListener("focus", function () {
      if (this.select) this.select();
    });
  });

  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;

    const inputs = Array.from(this.querySelectorAll("input")).filter(
      (el) => !el.closest(".hidden")
    );

    const currentIndex = inputs.indexOf(e.target);

    if (currentIndex > -1 && currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus();
      e.preventDefault();
    } else {
      updateLayout();
    }
  });
}

/* ======================
   BUTTONS
====================== */
function bindButtons() {
  byId("sidewallBtn")?.addEventListener("click", () => switchMode("sidewall"));
  byId("gableBtn")?.addEventListener("click", () => switchMode("gable"));

  byId("addOpeningBtn")?.addEventListener("click", addOpening);
  byId("footerAddOpeningBtn")?.addEventListener("click", focusOpeningsForm);

  byId("generateBtn")?.addEventListener("click", updateLayout);
  byId("exportBtn")?.addEventListener("click", exportSVG);

  byId("moreBtn")?.addEventListener("click", openMoreMenuTarget);

  byId("fitViewBtn")?.addEventListener("click", fitPreview);
  byId("gridToggleBtn")?.addEventListener("click", toggleGrid);
  byId("labelsToggleBtn")?.addEventListener("click", toggleLabels);
}

/* ======================
   INIT
====================== */
document.addEventListener("DOMContentLoaded", () => {
  bindAccordion();
  bindResultsTabs();
  bindFormBehavior();
  bindButtons();

  activateResultsTab("summaryPanel");
  renderOpeningsList();
  renderSectionSummaries(collectFormState());
  syncTabVisibility();
  switchMode("sidewall");
});