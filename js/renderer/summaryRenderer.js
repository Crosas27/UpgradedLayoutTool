import { formatToField } from "../utils/formatter.js";

export function renderSummary(model) {
    const el = document.getElementById("panelSummary");
    if (!el) return;

    let html = "";

    if (model.mode === "gable" && model.gableCuts) {
// ==================== GABLE END SUMMARY ====================
        html = `<h3>Gable Panel Cuts</h3>`;
        model.gableCuts.forEach((cut) => {
            html += `
        <div class="panel-cut-list">
          <strong>Panel ${cut.panel}:</strong> 
          Left ${formatToField(cut.leftHeight)} → 
          Right ${formatToField(cut.rightHeight)}
        </div>`;
        });
    } else {
// ==================== SIDEWALL SUMMARY (unchanged) ====================
        const s = model.summary || {};
        html = `
      <h3>Panel Summary</h3>
      <p><strong>Wall Length:</strong> ${formatToField(s.wallLength)}</p>
      <p><strong>Panel Coverage:</strong> ${formatToField(s.coverage)}</p>
      <p><strong>Full Panels:</strong> ${s.fullPanels}</p>
    `;
        if (s.startPanel !== null)
            html += `<p><strong>Start Panel:</strong> ${formatToField(
                s.startPanel
            )}</p>`;
        if (s.endPanel !== null)
            html += `<p><strong>End Panel:</strong> ${formatToField(
                s.endPanel
            )}</p>`;
    }

    el.innerHTML = html;
}
