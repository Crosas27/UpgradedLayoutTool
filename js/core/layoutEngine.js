export function generateLayout(config) {
  const wallLength    = Number(config.wallLength)    || 0
  const wallHeight    = Number(config.wallHeight)    || 120
  const panelCoverage = Number(config.panelCoverage) || 36
  const ribSpacing    = Number(config.ribSpacing)    || 12
  const startOffset   = Number(config.startOffset)   || 0
  const openings      = Array.isArray(config.openings) ? config.openings : []

  const panels = calculatePanels(wallLength, panelCoverage)
  const seams  = panels.map(p => p.start).concat(wallLength)
  const ribs   = calculateRibs(wallLength, ribSpacing, startOffset)

  const summary        = generatePanelSummary(wallLength, panelCoverage, panels)
  const openingAnalysis = analyzeOpenings(openings, seams, ribs)

  return {
    wallLength,
    wallHeight,                    // ← NEW: Added for sidewall mode
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
  }
}

/* ====================== GABLE MODE ====================== */
export function generateGableLayout(config) {
  const wallLength    = Number(config.wallLength)    || 0
  const eaveHeight    = Number(config.eaveHeight)    || 120
  const peakHeight    = Number(config.peakHeight)    || 180
  const panelCoverage = Number(config.panelCoverage) || 36

  const gableCuts = calculateGablePanels(wallLength, panelCoverage, eaveHeight, peakHeight)

  return {
    wallLength,
    eaveHeight,
    peakHeight,
    panelCoverage,
    gableCuts,
    mode: "gable"
  }
}

/* ---------------- SIDEWALL HELPERS ---------------- */
function calculatePanels(length, coverage) {
  const panels = []
  let pos = 0
  let i = 1

  while (pos < length) {
    const end = Math.min(pos + coverage, length)
    panels.push({
      panel: i,
      start: pos,
      end,
      width: end - pos
    })
    pos += coverage
    i++
  }
  return panels
}

function calculateRibs(length, spacing, start) {
  const ribs = []
  let pos = start
  while (pos <= length) {
    ribs.push({ position: pos })
    pos += spacing
  }
  return ribs
}

function generatePanelSummary(wallLength, coverage, panels) {
  const fullPanels = panels.filter(p => p.width === coverage).length
  const first = panels[0] || null
  const last  = panels[panels.length - 1] || null

  return {
    wallLength,
    coverage,
    fullPanels,
    startPanel: first && first.width !== coverage ? first.width : null,
    endPanel:   last  && last.width  !== coverage ? last.width  : null
  }
}

function analyzeOpenings(openings, seams, ribs) {
  const edgeTolerance = 0.5
  const results = []

  openings.forEach((opening, index) => {
    const start = Number(opening.start) || 0
    const width = Number(opening.width) || 0
    const end   = start + width

    const nearestLeftSeam  = findNearestValue(start, seams)
    const nearestRightSeam = findNearestValue(end, seams)

    const leftEdgeHits  = ribs.filter(r => Math.abs(r.position - start) <= edgeTolerance)
    const rightEdgeHits = ribs.filter(r => Math.abs(r.position - end)   <= edgeTolerance)

    const intersectingPanels = []
    for (let i = 0; i < seams.length - 1; i++) {
      const panelStart = seams[i]
      const panelEnd   = seams[i + 1]
      if (end <= panelStart || start >= panelEnd) continue

      intersectingPanels.push({
        panel: i + 1,
        panelStart,
        panelEnd,
        cutStart: Math.max(start, panelStart) - panelStart,
        cutEnd:   Math.min(end, panelEnd) - panelStart
      })
    }

    const warnings = []
    if (leftEdgeHits.length > 0)  warnings.push("Left jamb edge lands on a rib centerline (within ½ inch tolerance).")
    if (rightEdgeHits.length > 0) warnings.push("Right jamb edge lands on a rib centerline (within ½ inch tolerance).")

    results.push({
      id: index + 1,
      start, width, end,
      nearestLeftSeam,
      nearestRightSeam,
      leftOffsetFromSeam:  start - nearestLeftSeam,
      rightOffsetFromSeam: end - nearestRightSeam,
      leftEdgeHits:  leftEdgeHits.map(r => r.position),
      rightEdgeHits: rightEdgeHits.map(r => r.position),
      intersectingPanels,
      warnings
    })
  })

  return results
}

function findNearestValue(target, values) {
  if (!values.length) return 0
  let nearest = values[0]
  let smallestDiff = Math.abs(target - nearest)

  values.forEach(value => {
    const diff = Math.abs(target - value)
    if (diff < smallestDiff) {
      smallestDiff = diff
      nearest = value
    }
  })
  return nearest
}

/* ---------------- GABLE PANEL CALCULATIONS ---------------- */
function calculateGablePanels(length, coverage, eaveHeight, peakHeight) {
  const rise = peakHeight - eaveHeight
  const half = length / 2
  const cuts = []
  let pos = 0
  let i = 1

  while (pos < length) {
    const end = Math.min(pos + coverage, length)

    const leftHeight  = heightAt(pos, half, eaveHeight, rise)
    const rightHeight = heightAt(end, half, eaveHeight, rise)

    cuts.push({
      panel: i,
      start: pos,
      end,
      leftHeight: Math.round(leftHeight * 1000) / 1000,
      rightHeight: Math.round(rightHeight * 1000) / 1000
    })

    pos += coverage
    i++
  }
  return cuts
}

function heightAt(x, half, eaveHeight, rise) {
  if (x <= half) {
    return eaveHeight + rise * (x / half)
  } else {
    return eaveHeight + rise * ((half * 2 - x) / half)
  }
}