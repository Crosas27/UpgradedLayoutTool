// layoutEngine.js

export function generateLayout(config) {
  const wallLength = Number(config.wallLength) || 0;
  const wallHeight = Number(config.wallHeight) || 120;
  const panelCoverage = Number(config.panelCoverage) || 36;
  const ribSpacing = Number(config.ribSpacing) || 12;
  const startOffset = Number(config.startOffset) || 0;
  const openings = Array.isArray(config.openings) ? normalizeOpenings(config.openings) : [];

  const panels = calculatePanels(wallLength, panelCoverage);
  const seams = panels.map((p) => p.start).concat(wallLength);
  const ribs = calculateRibs(wallLength, ribSpacing, startOffset);

  const summary = generatePanelSummary(wallLength, panelCoverage, panels);
  const openingAnalysis = analyzeOpenings(openings, seams, ribs, wallHeight);

  return {
    wallLength,
    wallHeight,
    panelCoverage,
    ribSpacing,
    startOffset,
    panels,
    seams,
    ribs,
    openings,
    openingAnalysis,
    summary,
    mode: "sidewall"
  };
}

/* ====================== GABLE MODE ====================== */
export function generateGableLayout(config) {
  const wallLength = Number(config.wallLength) || 0;
  const leftEaveHeight = Number(config.leftEaveHeight) || 120;
  const rightEaveHeight = Number(config.rightEaveHeight) || 120;
  const peakHeight = Number(config.peakHeight) || 180;
  const ridgePosition = Number(config.ridgePosition) || wallLength / 2;
  const panelCoverage = Number(config.panelCoverage) || 36;

  const gableCuts = calculateAsymmetricalGablePanels(
    wallLength,
    panelCoverage,
    leftEaveHeight,
    rightEaveHeight,
    peakHeight,
    ridgePosition
  );

  return {
    wallLength,
    leftEaveHeight,
    rightEaveHeight,
    peakHeight,
    ridgePosition,
    panelCoverage,
    gableCuts,
    mode: "gable"
  };
}

/* ---------------- SIDEWALL HELPERS ---------------- */
function normalizeOpenings(openings) {
  return openings.map((opening, index) => {
    const start = Number(opening.start) || 0;
    const bottom = Number(opening.bottom) || 0;
    const width = Number(opening.width) || 0;
    const height = Number(opening.height) || 0;

    return {
      id: Number(opening.id) || index + 1,
      label: opening.label?.trim() || `Opening ${index + 1}`,
      start,
      bottom,
      width,
      height,
      end: start + width,
      top: bottom + height
    };
  });
}

function calculatePanels(length, coverage) {
  const panels = [];
  let pos = 0;
  let i = 1;

  while (pos < length) {
    const end = Math.min(pos + coverage, length);
    panels.push({
      panel: i,
      start: pos,
      end,
      width: end - pos
    });
    pos += coverage;
    i++;
  }

  return panels;
}

function calculateRibs(length, spacing, start) {
  const ribs = [];
  let pos = start;

  while (pos <= length) {
    ribs.push({ position: pos });
    pos += spacing;
  }

  return ribs;
}

function generatePanelSummary(wallLength, coverage, panels) {
  const fullPanels = panels.filter((p) => p.width === coverage).length;
  const first = panels[0] || null;
  const last = panels[panels.length - 1] || null;

  return {
    wallLength,
    coverage,
    fullPanels,
    startPanel: first && first.width !== coverage ? first.width : null,
    endPanel: last && last.width !== coverage ? last.width : null
  };
}

// Returns the index of the first element in sorted arr that is >= val.
function lowerBound(arr, val) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    arr[mid] < val ? (lo = mid + 1) : (hi = mid);
  }
  return lo;
}

function analyzeOpenings(openings, seams, ribs, wallHeight) {
  const edgeTolerance = 0.5;
  const results = [];

  openings.forEach((opening, index) => {
    const start = Number(opening.start) || 0;
    const bottom = Number(opening.bottom) || 0;
    const width = Number(opening.width) || 0;
    const height = Number(opening.height) || 0;
    const end = start + width;
    const top = bottom + height;

    const nearestLeftSeam = findNearestValue(start, seams);
    const nearestRightSeam = findNearestValue(end, seams);

    const leftEdgeHits = ribs.filter((r) => Math.abs(r.position - start) <= edgeTolerance);
    const rightEdgeHits = ribs.filter((r) => Math.abs(r.position - end) <= edgeTolerance);

    const intersectingPanels = [];
    // Binary search to the first seam that could start a panel overlapping the opening.
    const startIdx = Math.max(0, lowerBound(seams, start) - 1);
    for (let i = startIdx; i < seams.length - 1 && seams[i] < end; i++) {
      const panelStart = seams[i];
      const panelEnd = seams[i + 1];
      if (end <= panelStart || start >= panelEnd) continue;

      intersectingPanels.push({
        panel: i + 1,
        panelStart,
        panelEnd,
        cutStart: Math.max(start, panelStart) - panelStart,
        cutEnd: Math.min(end, panelEnd) - panelStart,
        openingBottom: bottom,
        openingTop: top,
        openingHeight: height
      });
    }

    const warnings = [];

    if (leftEdgeHits.length > 0) {
      warnings.push("Left jamb edge lands on a rib centerline (within ½ inch tolerance).");
    }

    if (rightEdgeHits.length > 0) {
      warnings.push("Right jamb edge lands on a rib centerline (within ½ inch tolerance).");
    }

    if (top > wallHeight) {
      warnings.push("Opening top exceeds wall height.");
    }

    if (bottom < 0) {
      warnings.push("Opening bottom is below the wall base.");
    }

    if (end > seams[seams.length - 1]) {
      warnings.push("Opening extends past wall length.");
    }

    results.push({
      id: opening.id || index + 1,
      label: opening.label || `Opening ${index + 1}`,
      start,
      bottom,
      width,
      height,
      end,
      top,
      nearestLeftSeam,
      nearestRightSeam,
      leftOffsetFromSeam: start - nearestLeftSeam,
      rightOffsetFromSeam: end - nearestRightSeam,
      leftEdgeHits: leftEdgeHits.map((r) => r.position),
      rightEdgeHits: rightEdgeHits.map((r) => r.position),
      intersectingPanels,
      warnings
    });
  });

  return results;
}

// Binary search for nearest value in a sorted array. O(log n).
function findNearestValue(target, sortedValues) {
  if (!sortedValues.length) return 0;

  const idx = lowerBound(sortedValues, target);

  if (idx === 0) return sortedValues[0];
  if (idx === sortedValues.length) return sortedValues[sortedValues.length - 1];

  const before = sortedValues[idx - 1];
  const after = sortedValues[idx];
  return (target - before) <= (after - target) ? before : after;
}

/* ---------------- GABLE PANEL CALCULATIONS ---------------- */
function calculateAsymmetricalGablePanels(
  length,
  coverage,
  leftEaveHeight,
  rightEaveHeight,
  peakHeight,
  ridgePosition
) {
  const cuts = [];
  let pos = 0;
  let i = 1;

  while (pos < length) {
    const end = Math.min(pos + coverage, length);

    const leftHeight = heightAtAsymmetricalGable(
      pos,
      length,
      leftEaveHeight,
      rightEaveHeight,
      peakHeight,
      ridgePosition
    );

    const rightHeight = heightAtAsymmetricalGable(
      end,
      length,
      leftEaveHeight,
      rightEaveHeight,
      peakHeight,
      ridgePosition
    );

    cuts.push({
      panel: i,
      start: pos,
      end,
      leftHeight: round3(leftHeight),
      rightHeight: round3(rightHeight)
    });

    pos += coverage;
    i++;
  }

  return cuts;
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

function round3(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
