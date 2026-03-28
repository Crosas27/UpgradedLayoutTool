// svgRenderer.js

import {
  setupSvg,
  drawRect,
  drawLine,
  drawText
} from "../utils/svgUtils.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shouldShowPanelLabel(panelWidthPx) {
  return panelWidthPx >= 28;
}

function shouldShowOpeningLabel(openingWidthPx, openingHeightPx) {
  return openingWidthPx >= 42 && openingHeightPx >= 18;
}

export function renderSvg(model) {
  const svg = document.getElementById("wallSvg");
  if (!svg || !model.wallLength || !model.wallHeight) return;

  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 320;

  setupSvg(svg, width, height);

  const frag = document.createDocumentFragment();

  const paddingX = clamp(width * 0.045, 18, 32);
  const topZone = clamp(height * 0.16, 40, 72);
  const bottomZone = clamp(height * 0.2, 44, 80);

  const drawWidth = width - paddingX * 2;
  const drawHeight = height - topZone - bottomZone;
  const scaleX = drawWidth / model.wallLength;
  const scaleY = drawHeight / model.wallHeight;
  const scale = Math.min(scaleX, scaleY);

  const wallW = model.wallLength * scale;
  const wallH = model.wallHeight * scale;

  const wallX = (width - wallW) / 2;
  const wallY = topZone + (drawHeight - wallH) / 2;

  const markLineY = wallY - 26;
  const totalLineY = wallY + wallH + 28;

  // Wall outline
  drawRect(frag, wallX, wallY, wallW, wallH, "wall-outline");

  // Panels
  model.panels.forEach((panel, index) => {
    const x = wallX + panel.start * scale;
    const w = (panel.end - panel.start) * scale;
    const isCut = (panel.end - panel.start) !== model.panelCoverage;

    drawRect(frag, x, wallY, w, wallH, isCut ? "panel-cut" : "panel-full");

    if (shouldShowPanelLabel(w)) {
      drawText(
        frag,
        x + w / 2,
        wallY + wallH / 2,
        String(index + 1),
        "panel-label"
      );
    }
  });

  // Seams
  const seamPositions = model.panels.map((p) => p.start);
  seamPositions.push(model.wallLength);

  seamPositions.forEach((pos) => {
    const x = wallX + pos * scale;
    drawLine(frag, x, wallY, x, wallY + wallH, "panel-seam");
  });

  // Ribs
  model.ribs.forEach((rib) => {
    const x = wallX + rib.position * scale;
    drawLine(frag, x, wallY, x, wallY + wallH, "rib-line");
  });

  // Top dimension line
  drawLine(frag, wallX, markLineY, wallX + wallW, markLineY, "dimension-line");

  seamPositions.forEach((pos) => {
    const x = wallX + pos * scale;
    drawLine(frag, x, markLineY - 6, x, markLineY + 6, "tick");
  });

  // Dimension labels with adaptive density
  const labeledPositions = [];
  for (let pos = 0; pos <= model.wallLength; pos += model.panelCoverage) {
    labeledPositions.push(pos);
  }
  if (labeledPositions.at(-1) !== model.wallLength) {
    labeledPositions.push(model.wallLength);
  }

  let lastX = -Infinity;
  const minSpacing = width < 480 ? 60 : 48;

  labeledPositions.forEach((pos) => {
    const x = wallX + pos * scale;
    const isStart = pos === 0;
    const isEnd = pos === model.wallLength;

    if (!isStart && !isEnd && (x - lastX < minSpacing || wallX + wallW - x < minSpacing)) {
      return;
    }

    drawText(frag, x, markLineY - 10, `${Math.round(pos)}"`, "dimension-text");
    lastX = x;
  });

  // Bottom total length
  drawLine(frag, wallX, totalLineY, wallX + wallW, totalLineY, "dimension-line");
  drawText(
    frag,
    wallX + wallW / 2,
    totalLineY - 8,
    `${Math.round(model.wallLength)}"`,
    "dimension-text total-text"
  );

  // Left wall height callout
  drawLine(frag, wallX - 18, wallY, wallX - 18, wallY + wallH, "dimension-line");
  drawLine(frag, wallX - 24, wallY, wallX - 12, wallY, "tick");
  drawLine(frag, wallX - 24, wallY + wallH, wallX - 12, wallY + wallH, "tick");
  drawText(
    frag,
    wallX - 28,
    wallY + wallH / 2,
    `${Math.round(model.wallHeight)}"`,
    "dimension-text"
  );

  // Openings overlay + labels
  model.openings.forEach((opening, index) => {
    const x = wallX + (Number(opening.start) || 0) * scale;
    const y =
      wallY +
      wallH -
      ((Number(opening.bottom) || 0) + (Number(opening.height) || 0)) * scale;
    const w = (Number(opening.width) || 0) * scale;
    const h = (Number(opening.height) || 0) * scale;

    drawRect(frag, x, y, w, h, "opening-box");

    if (shouldShowOpeningLabel(w, h)) {
      const label = opening.label?.trim() || `O${index + 1}`;
      drawText(frag, x + w / 2, y + h / 2, label, "dimension-text");
    } else {
      drawText(frag, x + w / 2, wallY + wallH + 16, `O${index + 1}`, "dimension-text");
    }
  });

  svg.appendChild(frag);
}
