/// svgUtils.js ///

const NS = "http://www.w3.org/2000/svg";

function createSvgEl(tagName, className) {
    const el = document.createElementNS(NS, tagName);
    if (className) el.setAttribute("class", className);
    return el;
}

export function setupSvg(svg, width, height) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

export function drawRect(svg, x, y, w, h, className) {
    const rect = createSvgEl("rect", className);
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    svg.appendChild(rect);
    return rect;
}

export function drawLine(svg, x1, y1, x2, y2, className) {
    const line = createSvgEl("line", className);
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    svg.appendChild(line);
    return line;
}

export function drawText(svg, x, y, text, className, anchor = "middle") {
    const t = createSvgEl("text", className);
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor);
    t.setAttribute("dominant-baseline", "middle");
    t.textContent = text;
    svg.appendChild(t);
    return t;
}

export function getDrawArea(width, height) {
    const margin = Math.max(20, Math.min(40, width * 0.05));
    return {
        margin,
        drawWidth: width - margin * 2,
        drawHeight: height - margin * 2,
    };
}

export function drawGrid(svg, width, height, step = 40) {
    for (let x = 0; x <= width; x += step) {
        drawLine(svg, x, 0, x, height, "grid-line");
    }

    for (let y = 0; y <= height; y += step) {
        drawLine(svg, 0, y, width, y, "grid-line");
    }
}
