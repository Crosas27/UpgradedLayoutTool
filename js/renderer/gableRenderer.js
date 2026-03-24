// gableRenderer.js

import { formatToField } from "../utils/formatter.js";
import {
  setupSvg,
  drawLine,
  drawText,
  drawGrid
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

  const {
    wallLength,
    leftEaveHeight,
    rightEaveHeight,
    peakHeight,
    ridgePosition,
    gableCuts
  } = model;

  if (
    !wallLength ||
    !peakHeight ||
    !Array.isArray(gableCuts) ||
    !gableCuts.length
  ) {
    return;
  }

  const marginX = clamp(width * 0.05, 20, 36);
  const topMargin = clamp(height * 0.14, 24, 54);
  const bottomMargin = clamp(height * 0.18, 34, 70);

  const drawWidth = width - marginX * 2;
  const drawHeight = height - topMargin - bottomMargin;

  const scaleX = drawWidth / wallLength;
  const scaleY = drawHeight / peakHeight;
  const scale = Math.min(scaleX, scaleY) * 0.95;

  const roofWidth = wallLength * scale;
  const roofHeight = peakHeight * scale;

  const wallLeft = (width - roofWidth) / 2;
  const wallRight = wallLeft + roofWidth;
  const baseY = topMargin + roofHeight;

  const ridgeX = wallLeft + ridgePosition * scale;
  const ridgeY = baseY - peakHeight * scale;

  const leftEaveY = baseY - leftEaveHeight * scale;
  const rightEaveY = baseY - rightEaveHeight * scale;

  // Base line
  drawLine(svg, wallLeft, baseY, wallRight, baseY, "wall-line");

  // Side wall lines
  drawLine(svg, wallLeft, baseY, wallLeft, leftEaveY, "wall-line");
  drawLine(svg, wallRight, baseY, wallRight, rightEaveY, "wall-line");

  // Roof lines
  drawLine(svg, wallLeft, leftEaveY, ridgeX, ridgeY, "roof-line");
  drawLine(svg, wallRight, rightEaveY, ridgeX, ridgeY, "roof-line");

  // Panel seams and labels
  gableCuts.forEach((panel, i) => {
    if (panel.start === undefined || panel.end === undefined) return;

    const seamX = wallLeft + panel.start * scale;
    const seamHeight = heightAtAsymmetricalGable(
      panel.start,
      wallLength,
      leftEaveHeight,
      rightEaveHeight,
      peakHeight,
      ridgePosition
    );
    const seamTopY = baseY - seamHeight * scale;

    drawLine(svg, seamX, baseY, seamX, seamTopY, "panel-line");

    const panelWidthPx = (panel.end - panel.start) * scale;
    if (!shouldShowPanelLabel(panelWidthPx)) return;

    const midX = wallLeft + ((panel.start + panel.end) / 2) * scale;
    const maxHeight = Math.max(Number(panel.leftHeight) || 0, Number(panel.rightHeight) || 0);
    const maxHeightY = baseY - maxHeight * scale;
    const labelOffset = i % 2 === 0 ? 12 : 26;
    const labelY = maxHeightY - labelOffset;

    drawText(
      svg,
      midX,
      labelY,
      `${formatToField(panel.leftHeight)} → ${formatToField(panel.rightHeight)}`,
      "panel-label"
    );
  });

  // Final right seam
  const rightHeightAtEnd = heightAtAsymmetricalGable(
    wallLength,
    wallLength,
    leftEaveHeight,
    rightEaveHeight,
    peakHeight,
    ridgePosition
  );
  const rightTopY = baseY - rightHeightAtEnd * scale;
  drawLine(svg, wallRight, baseY, wallRight, rightTopY, "panel-line");

  // Peak label
  drawText(
    svg,
    ridgeX,
    ridgeY - 12,
    `Peak ${formatToField(peakHeight)}`,
    "dimension-text total-text"
  );

  // Left eave label
  drawText(
    svg,
    wallLeft,
    leftEaveY - 10,
    `L Eave ${formatToField(leftEaveHeight)}`,
    "dimension-text"
  );

  // Right eave label
  drawText(
    svg,
    wallRight,
    rightEaveY - 10,
    `R Eave ${formatToField(rightEaveHeight)}`,
    "dimension-text"
  );

  // Ridge position label
  drawLine(svg, wallLeft, baseY + 24, wallRight, baseY + 24, "dimension-line");
  drawText(
    svg,
    wallLeft + roofWidth / 2,
    baseY + 16,
    `Span ${formatToField(wallLength)} • Ridge ${formatToField(ridgePosition)} from left`,
    "dimension-text total-text"
  );
}

function heightAtAsymmetricalGable(
  x,
  wallLength,
  leftEaveHeight,
  rightEaveHeight,
  peakHeight,
  ridgePosition
) {
  const safeRidge = clamp(ridgePosition, 0.001, wallLength - 0.001);

  if (x <= safeRidge) {
    const runLeft = safeRidge;
    const riseLeft = peakHeight - leftEaveHeight;
    return leftEaveHeight + riseLeft * (x / runLeft);
  }

  const runRight = wallLength - safeRidge;
  const distanceFromRidge = x - safeRidge;
  const dropRight = peakHeight - rightEaveHeight;

  return peakHeight - dropRight * (distanceFromRidge / runRight);
}
