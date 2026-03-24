import { formatToField } from "../utils/formatter.js";

export function renderSummary(model) {
  const el = document.getElementById("panelSummary");
  if (!el) return;

  if (model.mode === "gable" && Array.isArray(model.gableCuts)) {
    renderGableSummary(el, model);
    return;
  }

  renderSidewallSummary(el, model);
}

function renderSidewallSummary(el, model) {
  const s = model.summary || {};
  const startPanel = s.startPanel;
  const endPanel = s.endPanel;
  const isBalanced =
    startPanel !== null &&
    endPanel !== null &&
    Number(startPanel) === Number(endPanel);

  el.innerHTML = `
    <div class="summary-block">
      <h3>Panel Summary</h3>

      <div class="summary-grid">
        <div class="summary-stat">
          <span class="summary-label">Wall Length</span>
          <strong class="summary-value">${formatToField(s.wallLength ?? 0)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Panel Coverage</span>
          <strong class="summary-value">${formatToField(s.coverage ?? 0)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Full Panels</span>
          <strong class="summary-value">${s.fullPanels ?? 0}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Openings</span>
          <strong class="summary-value">${Array.isArray(model.openings) ? model.openings.length : 0}</strong>
        </div>
      </div>

      <div class="summary-detail-list">
        ${
          startPanel !== null
            ? `
              <div class="summary-detail-row">
                <span>Start Panel Cut</span>
                <strong>${formatToField(startPanel)}</strong>
              </div>
            `
            : `
              <div class="summary-detail-row">
                <span>Start Panel Cut</span>
                <strong>None</strong>
              </div>
            `
        }

        ${
          endPanel !== null
            ? `
              <div class="summary-detail-row">
                <span>End Panel Cut</span>
                <strong>${formatToField(endPanel)}</strong>
              </div>
            `
            : `
              <div class="summary-detail-row">
                <span>End Panel Cut</span>
                <strong>None</strong>
              </div>
            `
        }

        <div class="summary-detail-row">
          <span>Layout Balance</span>
          <strong class="${isBalanced ? "good-status" : ""}">
            ${
              startPanel !== null && endPanel !== null
                ? isBalanced
                  ? "Matched"
                  : "Unmatched"
                : "Full-span layout"
            }
          </strong>
        </div>
      </div>
    </div>
  `;
}

function renderGableSummary(el, model) {
  const cuts = model.gableCuts || [];
  const wallLength = model.wallLength ?? 0;
  const eaveHeight = model.eaveHeight ?? 0;
  const peakHeight = model.peakHeight ?? 0;
  const panelCoverage = model.panelCoverage ?? 0;

  el.innerHTML = `
    <div class="summary-block">
      <h3>Gable Panel Cuts</h3>

      <div class="summary-grid">
        <div class="summary-stat">
          <span class="summary-label">Wall Length</span>
          <strong class="summary-value">${formatToField(wallLength)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Eave Height</span>
          <strong class="summary-value">${formatToField(eaveHeight)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Peak Height</span>
          <strong class="summary-value">${formatToField(peakHeight)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Panel Coverage</span>
          <strong class="summary-value">${formatToField(panelCoverage)}</strong>
        </div>
      </div>

      <div class="summary-detail-list">
        <div class="summary-detail-row">
          <span>Total Panels</span>
          <strong>${cuts.length}</strong>
        </div>
      </div>

      <div class="summary-cut-stack">
        ${cuts
          .map(
            (cut) => `
              <div class="summary-cut-item">
                <div class="summary-cut-head">
                  <strong>Panel ${cut.panel}</strong>
                </div>
                <div class="summary-cut-values">
                  <span>Left ${formatToField(cut.leftHeight)}</span>
                  <span>Right ${formatToField(cut.rightHeight)}</span>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}