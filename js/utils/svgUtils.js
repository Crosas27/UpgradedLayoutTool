const NS = "http://www.w3.org/2000/svg"

export function setupSvg(svg, width, height) {
  svg.innerHTML = ""
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", height)
}

export function drawRect(svg, x, y, w, h, className) {
  const rect = document.createElementNS(NS, "rect")
  rect.setAttribute("x", x)
  rect.setAttribute("y", y)
  rect.setAttribute("width", w)
  rect.setAttribute("height", h)
  if (className) rect.setAttribute("class", className)
  svg.appendChild(rect)
}

export function drawLine(svg, x1, y1, x2, y2, className) {
  const line = document.createElementNS(NS, "line")
  line.setAttribute("x1", x1)
  line.setAttribute("y1", y1)
  line.setAttribute("x2", x2)
  line.setAttribute("y2", y2)
  if (className) line.setAttribute("class", className)
  svg.appendChild(line)
}

export function drawText(svg, x, y, text, className, anchor = "middle") {
  const t = document.createElementNS(NS, "text")
  t.setAttribute("x", x)
  t.setAttribute("y", y)
  t.setAttribute("text-anchor", anchor)
  if (className) t.setAttribute("class", className)
  t.textContent = text
  svg.appendChild(t)
}

/* Added for gable renderer support */
export function getDrawArea(width, height) {
  const margin = 40
  return {
    margin,
    drawWidth: width - margin * 2,
    drawHeight: height - margin * 2
  }
}

export function drawGrid(svg, width, height) {
  const gridColor = "#1e2937"
  // Light vertical grid
  for (let x = 0; x < width; x += 40) {
    drawLine(svg, x, 0, x, height, "grid-line")
  }
  // Light horizontal grid
  for (let y = 0; y < height; y += 40) {
    drawLine(svg, 0, y, width, y, "grid-line")
  }
}