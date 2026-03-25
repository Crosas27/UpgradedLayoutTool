// summaryRenderer.js

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
  const openingsCount = Array.isArray(model.openings) ? model.openings.length : 0;
  const wallHeight = Number(model.wallHeight) || 0;

  const startPanel = s.startPanel;
  const endPanel = s.endPanel;

  const hasBothCuts = startPanel !== null && endPanel !== null;
  const isBalanced = hasBothCuts && Number(startPanel) === Number(endPanel);

  el.innerHTML = `
    <div class="summary-block">
      <h3>Panel Summary</h3>

      <div class="summary-grid">
        <div class="summary-stat">
          <span class="summary-label">Wall Length</span>
          <strong class="summary-value">${formatToField(s.wallLength ?? 0)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Wall Height</span>
          <strong class="summary-value">${formatToField(wallHeight)}</strong>
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
          <strong class="summary-value">${openingsCount}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Layout Status</span>
          <strong class="summary-value ${
            hasBothCuts ? (isBalanced ? "good-status" : "") : "good-status"
          }">
            ${
              hasBothCuts
                ? isBalanced
                  ? "Matched"
                  : "Unmatched"
                : "Full-span"
            }
          </strong>
        </div>
      </div>

      <div class="summary-detail-list">
        <div class="summary-detail-row">
          <span>Start Panel Cut</span>
          <strong>${startPanel !== null ? formatToField(startPanel) : "None"}</strong>
        </div>

        <div class="summary-detail-row">
          <span>End Panel Cut</span>
          <strong>${endPanel !== null ? formatToField(endPanel) : "None"}</strong>
        </div>

        <div class="summary-detail-row">
          <span>Openings with Geometry</span>
          <strong>${openingsCount > 0 ? `${openingsCount} tracked` : "None"}</strong>
        </div>

        <div class="summary-detail-row">
          <span>Wall Mode</span>
          <strong>Sidewall</strong>
        </div>
      </div>

      ${
        openingsCount > 0
          ? `
            <div class="summary-cut-stack">
              ${model.openings
                .map(
                  (opening, index) => `
                    <div class="summary-cut-item">
                      <div class="summary-cut-head">
                        <strong>${opening.label?.trim() || `Opening ${index + 1}`}</strong>
                      </div>
                      <div class="summary-cut-values">
                        <span>X ${formatToField(opening.start)} → ${formatToField(
                          (Number(opening.start) || 0) + (Number(opening.width) || 0)
                        )}</span>
                        <span>Y ${formatToField(opening.bottom)} → ${formatToField(
                          (Number(opening.bottom) || 0) + (Number(opening.height) || 0)
                        )}</span>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderGableSummary(el, model) {
  const cuts = model.gableCuts || [];
  const wallLength = model.wallLength ?? 0;
  const leftEaveHeight = model.leftEaveHeight ?? 0;
  const rightEaveHeight = model.rightEaveHeight ?? 0;
  const peakHeight = model.peakHeight ?? 0;
  const ridgePosition = model.ridgePosition ?? 0;
  const panelCoverage = model.panelCoverage ?? 0;

  const first = cuts[0] || null;
  const last = cuts[cuts.length - 1] || null;
  const ridgeCentered =
    Math.abs(Number(ridgePosition) - Number(wallLength) / 2) < 0.001;

  el.innerHTML = `
    <div class="summary-block">
      <h3>Gable Summary</h3>

      <div class="summary-grid">
        <div class="summary-stat">
          <span class="summary-label">Wall Length</span>
          <strong class="summary-value">${formatToField(wallLength)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Left Eave</span>
          <strong class="summary-value">${formatToField(leftEaveHeight)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Right Eave</span>
          <strong class="summary-value">${formatToField(rightEaveHeight)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Peak Height</span>
          <strong class="summary-value">${formatToField(peakHeight)}</strong>
        </div>

        <div class="summary-stat">
          <span class="summary-label">Ridge Position</span>
          <strong class="summary-value">${formatToField(ridgePosition)}</strong>
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

        <div class="summary-detail-row">
          <span>Ridge Layout</span>
          <strong class="${ridgeCentered ? "good-status" : ""}">
            ${ridgeCentered ? "Centered" : "Offset"}
          </strong>
        </div>

        <div class="summary-detail-row">
          <span>Gable Type</span>
          <strong>
            ${
              Number(leftEaveHeight) === Number(rightEaveHeight)
                ? "Symmetrical Eaves"
                : "Asymmetrical Eaves"
            }
          </strong>
        </div>

        <div class="summary-detail-row">
          <span>Wall Mode</span>
          <strong>Gable End</strong>
        </div>
      </div>

      ${
        first && last
          ? `
            <div class="summary-cut-stack">
              <div class="summary-cut-item">
                <div class="summary-cut-head">
                  <strong>First Panel</strong>
                </div>
                <div class="summary-cut-values">
                  <span>Left ${formatToField(first.leftHeight)}</span>
                  <span>Right ${formatToField(first.rightHeight)}</span>
                </div>
              </div>

              <div class="summary-cut-item">
                <div class="summary-cut-head">
                  <strong>Last Panel</strong>
                </div>
                <div class="summary-cut-values">
                  <span>Left ${formatToField(last.leftHeight)}</span>
                  <span>Right ${formatToField(last.rightHeight)}</span>
                </div>
              </div>
            </div>
          `
          : ""
      }

      ${
        cuts.length
          ? `
            <div class="gable-cut-schedule">
              <div class="gable-cut-schedule-head">
                <span>Panel</span>
                <span>Left</span>
                <span>Right</span>
              </div>

              ${cuts
                .map(
                  (cut) => `
                    <div class="gable-cut-row">
                      <strong>P${cut.panel}</strong>
                      <span>${formatToField(cut.leftHeight)}</span>
                      <span>${formatToField(cut.rightHeight)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}