import { generateLayout, generateGableLayout } from "./js/core/layoutEngine.js";
import { renderSvg } from "./js/renderer/svgRenderer.js";
import { renderGable } from "./js/renderer/gableRenderer.js";
import { renderOpeningReport } from "./js/renderer/openingReportRenderer.js";
import { renderSummary } from "./js/renderer/summaryRenderer.js";

let openings = [];
let currentMode = "sidewall";

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
    return `${num}"`;
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

function setHTML(id, value) {
    const el = byId(id);
    if (el) el.innerHTML = value;
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
            mode: "sidewall",
        };
    }

    return {
        wallLength: Number(byId("gableWallLength")?.value) || 480,
        eaveHeight: Number(byId("eaveHeight")?.value) || 120,
        peakHeight: Number(byId("peakHeight")?.value) || 180,
        panelCoverage: Number(byId("gablePanelCoverage")?.value) || 36,
        openings: [],
        mode: "gable",
    };
}

/* ======================
   STATUS + UI SUMMARIES
====================== */
function inferWarnings(model) {
    if (!model) return [];

    const warnings = [];

    if (model.mode === "sidewall") {
        if (Array.isArray(model.openingAnalysis)) {
            model.openingAnalysis.forEach((opening) => {
                if (
                    Array.isArray(opening.warnings) &&
                    opening.warnings.length
                ) {
                    opening.warnings.forEach((warning) => {
                        warnings.push(`Opening ${opening.id}: ${warning}`);
                    });
                }
            });
        }

        if (
            model.summary?.startPanel !== null &&
            model.summary?.endPanel !== null
        ) {
            if (model.summary.startPanel !== model.summary.endPanel) {
                warnings.push(
                    `Start panel (${model.summary.startPanel}") and end panel (${model.summary.endPanel}") do not match.`
                );
            }
        }

        if (
            (Number(model.startOffset) || 0) >=
                (Number(model.ribSpacing) || 0) &&
            (Number(model.ribSpacing) || 0) > 0
        ) {
            warnings.push(
                "Start offset is greater than or equal to rib spacing."
            );
        }
    }

    if (model.mode === "gable") {
        if (
            (Number(model.peakHeight) || 0) <= (Number(model.eaveHeight) || 0)
        ) {
            warnings.push("Peak height should be greater than eave height.");
        }

        if (!Array.isArray(model.gableCuts) || model.gableCuts.length === 0) {
            warnings.push("No gable panels were generated.");
        }
    }

    return warnings;
}

function inferCuts(model) {
    if (!model) return [];

    const cuts = [];

    if (model.mode === "sidewall") {
        if (model.summary?.startPanel !== null) {
            cuts.push(`Start panel cut: ${model.summary.startPanel}"`);
        }

        if (model.summary?.endPanel !== null) {
            cuts.push(`End panel cut: ${model.summary.endPanel}"`);
        }

        if (
            Array.isArray(model.openingAnalysis) &&
            model.openingAnalysis.length
        ) {
            model.openingAnalysis.forEach((opening) => {
                if (
                    Array.isArray(opening.intersectingPanels) &&
                    opening.intersectingPanels.length
                ) {
                    cuts.push(
                        `Opening ${opening.id} crosses ${opening.intersectingPanels.length} panel(s).`
                    );
                }
            });
        }

        if (cuts.length === 0) {
            cuts.push("No edge or opening cuts detected.");
        }
    }

    if (model.mode === "gable") {
        if (Array.isArray(model.gableCuts) && model.gableCuts.length) {
            const first = model.gableCuts[0];
            const last = model.gableCuts[model.gableCuts.length - 1];

            cuts.push(`Gable panels generated: ${model.gableCuts.length}`);
            cuts.push(
                `First panel heights: ${first.leftHeight}" to ${first.rightHeight}".`
            );
            cuts.push(
                `Last panel heights: ${last.leftHeight}" to ${last.rightHeight}".`
            );
        } else {
            cuts.push("No gable cut data available.");
        }
    }

    return cuts;
}

function renderStatusBar(model, warnings = []) {
    const wallLength =
        currentMode === "sidewall"
            ? Number(model?.wallLength) ||
              Number(byId("wallLength")?.value) ||
              480
            : Number(model?.wallLength) ||
              Number(byId("gableWallLength")?.value) ||
              480;

    const coverage =
        currentMode === "sidewall"
            ? Number(model?.panelCoverage) ||
              Number(byId("panelCoverage")?.value) ||
              36
            : Number(model?.panelCoverage) ||
              Number(byId("gablePanelCoverage")?.value) ||
              36;

    const rib =
        Number(model?.ribSpacing) || Number(byId("ribSpacing")?.value) || 12;
    const warningCount = warnings.length;

    setText(
        "statusMode",
        currentMode === "sidewall" ? "Sidewall" : "Gable End"
    );
    setText("statusLength", formatInches(wallLength));
    setText(
        "statusWarnings",
        warningCount
            ? `${warningCount} Warning${warningCount > 1 ? "s" : ""}`
            : "OK"
    );
    setText("statusCoverage", `${formatInches(coverage)} Coverage`);
    setText(
        "statusRib",
        currentMode === "sidewall" ? `${formatInches(rib)} Rib` : "Gable Mode"
    );
    setText(
        "statusOpenings",
        `${openings.length} Opening${openings.length === 1 ? "" : "s"}`
    );

    const warningEl = byId("statusWarnings");
    if (warningEl) {
        warningEl.classList.toggle("status-pill-warning", warningCount > 0);
    }
}

function renderSectionSummaries(model) {
    if (currentMode === "sidewall") {
        const wallLength =
            Number(model?.wallLength) ||
            Number(byId("wallLength")?.value) ||
            480;
        setText(
            "sidewallSummary",
            `Sidewall • ${formatFeetInches(wallLength)}`
        );
    } else {
        const wallLength =
            Number(model?.wallLength) ||
            Number(byId("gableWallLength")?.value) ||
            480;
        setText("gableSummary", `Gable • ${formatFeetInches(wallLength)}`);
    }

    const coverage =
        currentMode === "sidewall"
            ? Number(model?.panelCoverage) ||
              Number(byId("panelCoverage")?.value) ||
              36
            : Number(model?.panelCoverage) ||
              Number(byId("gablePanelCoverage")?.value) ||
              36;

    const rib =
        Number(model?.ribSpacing) || Number(byId("ribSpacing")?.value) || 12;
    const rulesSummary =
        currentMode === "sidewall"
            ? `PBR • ${formatInches(coverage)} / ${formatInches(rib)}`
            : `Gable • ${formatInches(coverage)} panels`;

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

function renderCutsPanel(cuts) {
    const panel = byId("cutsReport");
    if (!panel) return;

    panel.innerHTML = `
    <div class="panel-cut-list">
      <strong>Cut Review</strong>
      <ul>
        ${cuts.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
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

    const warnings = inferWarnings({ ...model, ...config });
    const cuts = inferCuts({ ...model, ...config });

    renderWarningsPanel(warnings);
    renderCutsPanel(cuts);
    renderStatusBar({ ...model, ...config }, warnings);
    renderSectionSummaries({ ...model, ...config });

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
    const previewTitle = byId("previewTitle");

    sidewallBtn?.classList.toggle("active", mode === "sidewall");
    gableBtn?.classList.toggle("active", mode === "gable");
    sidewallBtn?.setAttribute("aria-pressed", String(mode === "sidewall"));
    gableBtn?.setAttribute("aria-pressed", String(mode === "gable"));

    sidewallCard?.classList.toggle("hidden", mode !== "sidewall");
    gableCard?.classList.toggle("hidden", mode !== "gable");

    sidewallFields?.classList.toggle("hidden", mode !== "sidewall");
    gableFields?.classList.toggle("hidden", mode !== "gable");

    if (previewTitle) {
        previewTitle.textContent =
            mode === "sidewall"
                ? "Live Preview – Sidewall"
                : "Live Preview – Gable End";
    }

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
        div.innerHTML = `
  <span>Opening ${index + 1}: ${op.start}" → ${op.start + op.width}"</span>
  <button class="delete-btn" type="button" aria-label="Delete opening ${
      index + 1
  }">X</button>
`

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

    const startInput = byId("openingStart");
    const widthInput = byId("openingWidth");

    const start = Number(startInput?.value);
    const width = Number(widthInput?.value);

    if (!Number.isFinite(start) || !Number.isFinite(width)) return;
    if (start < 0 || width <= 0) return;

    openings.push({ start, width });

    if (startInput) startInput.value = "";
    if (widthInput) widthInput.value = "";

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
            const panelId = tab.dataset.panel;
            if (!panelId) return;
            activateResultsTab(panelId);
        });
    });
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
        .wall-outline {fill:#0d1626;stroke:#d6e7f7;stroke-width:1.2}
        .panel-full {fill:rgba(59,211,255,0.06);stroke:rgba(59,211,255,0.5);stroke-width:1}
        .panel-cut {fill:rgba(245,158,11,0.08);stroke:#f59e0b;stroke-width:2}
        .opening-box {fill:rgba(59,211,255,0.08);stroke:#dbeafe;stroke-width:2}
        .panel-seam {stroke:#cfe8ff;stroke-width:1.45}
        .rib-line {stroke:#3bd3ff;stroke-width:1;stroke-dasharray:2 5;opacity:0.4}
        .dimension-line {stroke:#7ea4c2;stroke-width:1}
        .tick {stroke:#ffffff;stroke-width:2}
        .dimension-text,.total-text,.panel-label {font-family:"Fira Code",monospace;fill:#f3f8fd}
        .wall-line,.roof-line,.panel-line {stroke:#cbe6ff;stroke-width:2}
      </style>
    </defs>`;

    const summaryText =
        byId("panelSummary")?.textContent?.trim().replace(/\s+/g, " ") || "";
    const reportText =
        byId("openingReport")?.textContent?.trim().replace(/\s+/g, " ") || "";

    const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720" viewBox="0 0 900 720">
    ${styleBlock}
    <rect width="100%" height="100%" fill="#0a0f1a"></rect>
    <g transform="translate(0,20)">${diagramHTML}</g>
    <text x="30" y="460" font-family="Fira Code" font-size="14" fill="#f3f8fd">=== PANEL SUMMARY ===</text>
    <text x="30" y="490" font-family="Fira Code" font-size="12" fill="#b7c4d6">${summaryText}</text>
    <text x="30" y="540" font-family="Fira Code" font-size="14" fill="#f3f8fd">=== OPENINGS REPORT ===</text>
    <text x="30" y="570" font-family="Fira Code" font-size="12" fill="#b7c4d6">${reportText.substring(
        0,
        300
    )}...</text>
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

    document.querySelectorAll('input[type="number"]').forEach((input) => {
        input.addEventListener("focus", function () {
            this.select();
        });
    });

    form.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;

        const inputs = Array.from(
            this.querySelectorAll('input[type="number"]:not(.hidden)')
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
    byId("sidewallBtn")?.addEventListener("click", () =>
        switchMode("sidewall")
    );
    byId("gableBtn")?.addEventListener("click", () => switchMode("gable"));

    byId("addOpeningBtn")?.addEventListener("click", addOpening);
    byId("footerAddOpeningBtn")?.addEventListener("click", addOpening);

    byId("generateBtn")?.addEventListener("click", updateLayout);
    byId("exportBtn")?.addEventListener("click", exportSVG);

    byId("moreBtn")?.addEventListener("click", () => {
        activateResultsTab("reportPanel");
        document
            .querySelector(".results-card")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    byId("fitViewBtn")?.addEventListener("click", updateLayout);
    byId("gridToggleBtn")?.addEventListener("click", () => {
        byId("wallSvg")?.classList.toggle("grid-hidden");
    });
    byId("labelsToggleBtn")?.addEventListener("click", () => {
        byId("wallSvg")?.classList.toggle("labels-hidden");
    });
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
    switchMode("sidewall");
});
