import { formatToField } from "../utils/formatter.js"
import {
  setupSvg,
  getDrawArea,
  drawLine,
  drawText,
  drawGrid
} from "../utils/svgUtils.js"

export function renderGable(model) {
  const svg = document.getElementById("wallSvg")
  if (!svg) return

  const width  = svg.clientWidth || 900
  const height = 380

  setupSvg(svg, width, height)
  drawGrid(svg, width, height)

  const { margin, drawWidth, drawHeight } = getDrawArea(width, height)

  const { wallLength, eaveHeight, peakHeight, gableCuts } = model
  if (!wallLength || !peakHeight) return

  const scale = calculateScale(drawWidth, drawHeight, wallLength, peakHeight)

  const wallLeft  = margin
  const wallRight = wallLeft + wallLength * scale
  const baseY     = margin + drawHeight
  const eaveY     = baseY - eaveHeight * scale
  const peakX     = wallLeft + (wallLength * scale) / 2
  const peakY     = baseY - peakHeight * scale

  // Walls & roof
  drawLine(svg, wallLeft, baseY, wallRight, baseY, "wall-line")
  drawLine(svg, wallLeft, baseY, wallLeft, eaveY, "wall-line")
  drawLine(svg, wallRight, baseY, wallRight, eaveY, "wall-line")
  drawLine(svg, wallLeft, eaveY, peakX, peakY, "roof-line")
  drawLine(svg, wallRight, eaveY, peakX, peakY, "roof-line")

  // Panel seams & labels (cleaned & simplified)
  gableCuts.forEach((panel, i) => {
    if (panel.start === undefined) return
    const x = wallLeft + panel.start * scale
    const seamHeight = Math.max(panel.leftHeight || 0, panel.rightHeight || 0)
    const seamTop = baseY - seamHeight * scale

    drawLine(svg, x, baseY, x, seamTop, "panel-line")

    const midX = wallLeft + ((panel.start + panel.end) / 2) * scale
    const labelY = baseY - seamHeight * scale - 12 - (i % 2 === 0 ? 0 : 14)
    drawText(svg, midX, labelY, `${formatToField(panel.leftHeight)} → ${formatToField(panel.rightHeight)}`)
  })

  // Peak label
  drawText(svg, peakX, peakY - 10, formatToField(peakHeight))
}

/* Helper functions added for completeness */
function calculateScale(drawWidth, drawHeight, wallLength, peakHeight) {
  const scaleX = drawWidth / wallLength
  const scaleY = drawHeight / peakHeight
  return Math.min(scaleX, scaleY) * 0.95
}