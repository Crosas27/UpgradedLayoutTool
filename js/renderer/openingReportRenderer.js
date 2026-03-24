function inchesText(value) {
    return `${Math.round(Number(value || 0) * 1000) / 1000}"`;
}

function offsetText(value) {
    const rounded = Math.round(Number(value || 0) * 1000) / 1000;
    if (rounded === 0) return `0"`;
    return rounded > 0
        ? `${rounded}" right of seam`
        : `${Math.abs(rounded)}" left of seam`;
}

function metricRow(label, value) {
    return `
    <div class="report-metric-row">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

export function renderOpeningReport(model) {
    const container = document.getElementById("openingReport");
    if (!container) return;

    const analysis = model.openingAnalysis || [];

    if (!analysis.length) {
        container.innerHTML = `
      <div class="report-block">
        <h3>Openings Report</h3>
        <div class="empty-state">No openings entered.</div>
      </div>
    `;
        return;
    }

    let html = `
    <div class="report-block">
      <h3>Openings Report</h3>
      <div class="report-stack">
  `;

    analysis.forEach((item) => {
        const leftHits = item.leftEdgeHits?.length
            ? item.leftEdgeHits.map(inchesText).join(", ")
            : "None";

        const rightHits = item.rightEdgeHits?.length
            ? item.rightEdgeHits.map(inchesText).join(", ")
            : "None";

        html += `
      <section class="opening-report-card">
        <div class="opening-report-head">
          <h4>Opening ${item.id}</h4>
          <span class="${
              item.warnings?.length
                  ? "report-badge report-badge-warn"
                  : "report-badge report-badge-good"
          }">
            ${
                item.warnings?.length
                    ? `${item.warnings.length} Warning${
                          item.warnings.length > 1 ? "s" : ""
                      }`
                    : "Clear"
            }
          </span>
        </div>

        <div class="report-metric-grid">
          ${metricRow("Start", inchesText(item.start))}
          ${metricRow("Width", inchesText(item.width))}
          ${metricRow("End", inchesText(item.end))}
          ${metricRow("Nearest Left Seam", inchesText(item.nearestLeftSeam))}
          ${metricRow("Nearest Right Seam", inchesText(item.nearestRightSeam))}
          ${metricRow("Left Jamb Offset", offsetText(item.leftOffsetFromSeam))}
          ${metricRow(
              "Right Jamb Offset",
              offsetText(item.rightOffsetFromSeam)
          )}
          ${metricRow("Left Edge Hits", leftHits)}
          ${metricRow("Right Edge Hits", rightHits)}
        </div>
    `;

        if (item.intersectingPanels?.length) {
            html += `
        <div class="panel-cut-list report-subsection">
          <strong>Panels affected</strong>
          <ul>
            ${item.intersectingPanels
                .map(
                    (cut) => `
                  <li>
                    Panel ${cut.panel} • cut ${inchesText(
                        cut.cutStart
                    )} to ${inchesText(cut.cutEnd)}
                    <br />
                    <span class="report-subtext">
                      Panel span ${inchesText(cut.panelStart)} to ${inchesText(
                        cut.panelEnd
                    )}
                    </span>
                  </li>
                `
                )
                .join("")}
          </ul>
        </div>
      `;
        }

        if (item.warnings?.length) {
            html += `
        <div class="warning-box">
          <strong>Warnings</strong>
          <ul>
            ${item.warnings.map((w) => `<li>${w}</li>`).join("")}
          </ul>
        </div>
      `;
        } else {
            html += `
        <div class="report-clear good-status">
          <strong>Status:</strong> Clear
        </div>
      `;
        }

        html += `
      </section>
    `;
    });

    html += `
      </div>
    </div>
  `;

    container.innerHTML = html;
}
