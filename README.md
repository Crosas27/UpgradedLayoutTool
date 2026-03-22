# UpgradedLayoutTool
New revised by Grok agent. 

# Panel Layout Tool

A fast, lightweight, and fully vanilla web application for generating precise panel layouts and cutting reports for metal building construction.

**Sidewall mode** – straight panels with ribs, openings, and seam analysis  
**Gable mode** – sloped roof panels with accurate height calculations for each panel cut

Built entirely with HTML, CSS, and JavaScript so it runs instantly on any device — including mobile phones.

### Live Demo

(paste live demo link here)

---

### Features
- Real-time live preview (updates instantly as you type)
- Full sidewall layout engine with ribs, seams, and openings analysis
- Complete gable-end calculations (added today)
- Automatic panel cutting reports and material summary
- Opening warnings (rib centerline hits)
- One-tap SVG export for cutting or printing
- Mobile-optimized dark interface with large touch targets
- No build tools, no dependencies, no installation required

---

### Architecture

The application follows a clean, modular architecture designed for easy maintenance on a phone:

- **Core Logic** (`js/core/layoutEngine.js`)  
  Contains `generateLayout()` for sidewalls and the new `generateGableLayout()` for gable ends. All math is pure JavaScript with consistent panel-stepping logic.

- **Renderers** (separate modules)  
  - `svgRenderer.js` – draws the interactive sidewall diagram  
  - `renderGable()` – draws the sloped gable visualization  
  - `summaryRenderer.js` & `openingReportRenderer.js` – generate reports

- **Utilities**  
  - `svgUtils.js` – reusable SVG drawing helpers  
  - `formatter.js` – feet-and-inches + fractional formatting

- **UI Layer** (`app.js` + `index.html` + `styles.css`)  
  Handles real-time form updates, opening management, and SVG export using a simple debounce pattern.

State flows from the form → `collectFormState()` → layout engine → renderers. This separation keeps the code readable and allows easy addition of new modes.

---

### File Structure
