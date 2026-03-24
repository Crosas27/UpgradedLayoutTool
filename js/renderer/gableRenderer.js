import { formatToField } from "../utils/formatter.js";
import {
    setupSvg,
    getDrawArea,
    drawLine,
    drawText,
    drawGrid,
} from "../utils/svgUtils.js";

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function shouldShowPanelLabel(panelWidthPx) {
    return panelWidthPx >= 34;
}

export function renderGable(model) {
    const svg = document.getElementById("wallSvg");
    if (!svg) return;

    const width = svg.clientWidth || 900;
    const height = svg.clientHeight || 320;

    setupSvg(svg, width, height);
    drawGrid(svg, width, height);

    const { wallLength, eaveHeight, peakHeight, gableCuts } = model;
    if (!wallLength || !peakHeight || !Array.isArray(gableCuts)) return;

    const { margin, drawWidth, drawHeight } = getResponsiveDrawArea(
        width,
        height
    );
    const scale = calculateScale(drawWidth, drawHeight, wallLength, peakHeight);

    const wallLeft = margin;
    const wallRight = wallLeft + wallLength * scale;
    const baseY = height - margin;
    const eaveY = baseY - eaveHeight * scale;
    const peakX = wallLeft + (wallLength * scale) / 2;
    const peakY = baseY - peakHeight * scale;

    // Base / walls / roof
    drawLine(svg, wallLeft, baseY, wallRight, baseY, "wall-line");
    drawLine(svg, wallLeft, baseY, wallLeft, eaveY, "wall-line");
    drawLine(svg, wallRight, baseY, wallRight, eaveY, "wall-line");
    drawLine(svg, wallLeft, eaveY, peakX, peakY, "roof-line");
    drawLine(svg, wallRight, eaveY, peakX, peakY, "roof-line");

    // Gable panel seams + alternating labels
    gableCuts.forEach((panel, i) => {
        if (panel.start === undefined || panel.end === undefined) return;

        const seamX = wallLeft + panel.start * scale;
        const seamHeight = Math.max(
            Number(panel.leftHeight) || 0,
            Number(panel.rightHeight) || 0
        );
        const seamTopY = baseY - seamHeight * scale;

        drawLine(svg, seamX, baseY, seamX, seamTopY, "panel-line");

        const panelWidthPx = (panel.end - panel.start) * scale;
        if (!shouldShowPanelLabel(panelWidthPx)) return;

        const midX = wallLeft + ((panel.start + panel.end) / 2) * scale;
        const labelOffset = i % 2 === 0 ? 12 : 26;
        const labelY = seamTopY - labelOffset;

        drawText(
            svg,
            midX,
            labelY,
            `${formatToField(panel.leftHeight)} → ${formatToField(
                panel.rightHeight
            )}`,
            "panel-label"
        );
    });

    // Final seam at wall end
    drawLine(svg, wallRight, baseY, wallRight, eaveY, "panel-line");

    // Peak label
    drawText(
        svg,
        peakX,
        peakY - 12,
        `Peak ${formatToField(peakHeight)}`,
        "dimension-text total-text"
    );

    // Eave labels
    drawText(
        svg,
        wallLeft,
        eaveY - 10,
        `Eave ${formatToField(eaveHeight)}`,
        "dimension-text"
    );
    drawText(
        svg,
        wallRight,
        eaveY - 10,
        `Eave ${formatToField(eaveHeight)}`,
        "dimension-text"
    );

    // Bottom span label
    drawLine(
        svg,
        wallLeft,
        baseY + 24,
        wallRight,
        baseY + 24,
        "dimension-line"
    );
    drawText(
        svg,
        wallLeft + (wallRight - wallLeft) / 2,
        baseY + 16,
        `Span ${formatToField(wallLength)}`,
        "dimension-text total-text"
    );
}

function getResponsiveDrawArea(width, height) {
    const margin = clamp(width * 0.05, 20, 36);
    const drawWidth = width - margin * 2;
    const drawHeight = height - margin * 2 - 28;
    return { margin, drawWidth, drawHeight };
}

function calculateScale(drawWidth, drawHeight, wallLength, peakHeight) {
    const scaleX = drawWidth / wallLength;
    const scaleY = drawHeight / peakHeight;
    return Math.min(scaleX, scaleY) * 0.95;
}
