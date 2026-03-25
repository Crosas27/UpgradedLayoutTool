# CR27 Panel Layout Tool

## Overview

CR27 is a mobile-first field layout assistant for 
residential metal siding panel planning. It helps 
with **sidewall** and **gable end** layout 
visualization, opening placement review, rib and seam
 awareness, cut review, and SVG export.

The app is designed around a simple field workflow:

1. Enter wall geometry
2. Choose **Sidewall** or **Gable End**
3. Define panel coverage and rib spacing
4. Add openings where needed
5. Preview the layout
6. Review **Summary**, **Warnings**, **Cuts**, 
   and **Report**
7. Export an SVG layout sheet

The project currently focuses on **layout planning 
and field decision support**, not estimating, 
inventory, or crew management.

---

## Core Purpose

The app helps answer practical questions such as:

- How many panels does this wall take?
- Do I end with a cut panel?
- Where do seams fall?
- Where do ribs fall?
- Which panels are affected by an opening?
- Does a jamb land on a rib?
- For a gable, what are the left and right 
  cut heights for each panel?

---

## Supported Modes

### 1. Sidewall Mode

Sidewall mode is for vertical panel layout across 
a rectangular wall plane.

**Inputs**
- Wall Length
- Wall Height
- Panel Coverage
- Rib Spacing
- Start Offset

**Opening Inputs**
- Opening Label
- Start from Left
- Bottom from Base
- Opening Width
- Opening Height

**Outputs**
- Panel layout
- Seam positions
- Rib positions
- Opening intersection analysis
- Warnings
- Summary
- Cut instructions

### 2. Gable End Mode

Gable mode supports asymmetrical roofs and gable 
wall panel planning.

**Inputs**
- Wall Length
- Left Eave Height
- Right Eave Height
- Peak Height
- Ridge Position from Left
- Panel Coverage

**Outputs**
- Per-panel left and right cut heights
- Asymmetrical gable preview
- Gable summary schedule
- Warnings for invalid roof geometry

---

## UI Structure

### Status Bar
Displays:
- Mode
- Wall length
- Warning count or OK state
- Panel coverage
- Rib or gable indicator
- Opening count

### Control Stack
Contains:
- Mode toggle
- Sidewall accordion
- Gable accordion
- Openings accordion

### Preview Card
Contains:
- Preview title
- Export button
- Fit / Grid / Labels buttons
- SVG preview area

### Results Dock
Tabbed panels:
- Summary
- Warnings
- Cuts
- Report

**Important behavior**
- In **Sidewall mode**, all four tabs are available.
- In **Gable mode**, the **Cuts** tab is hidden 
because the full gable cut schedule already lives 
in **Summary**.

### Sticky Footer
Contains:
- Generate
- More actions shortcut
- Add Opening shortcut

---

## Main Files

- `index.html`
- `styles.css`
- `app.js`
- `js/core/layoutEngine.js`
- `js/renderer/svgRenderer.js`
- `js/renderer/gableRenderer.js`
- `js/renderer/openingReportRenderer.js`
- `js/renderer/summaryRenderer.js`
- `js/utils/svgUtils.js`
- `js/utils/formatter.js`

---

## Application Flow

1. User enters layout inputs
2. `app.js` collects current form state
3. Depending on mode:
   - `generateLayout()` runs for sidewall
   - `generateGableLayout()` runs for gable
4. The returned model is rendered by:
   - `renderSvg()` for sidewall
   - `renderGable()` for gable
5. Additional renderers update:
   - Summary tab
   - Opening report tab
   - Warnings tab
   - Cuts tab
6. Status bar and section summaries are refreshed
7. Export builds a printable SVG sheet from the 
current preview and report data

---

## Sidewall Logic

### Sidewall Model Generation

The sidewall model is created by 
`generateLayout(config)`.

It reads:
- `wallLength`
- `wallHeight`
- `panelCoverage`
- `ribSpacing`
- `startOffset`
- `openings`

It computes:
- `panels`
- `seams`
- `ribs`
- `summary`
- `openingAnalysis`

Returned model shape:

```js
{
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
}
```

### Panel Calculation

Panels are generated left-to-right using panel 
coverage width.

Logic:
- Start at `0`
- Repeatedly add panel widths of `panelCoverage`
- Last panel is truncated to wall end if needed

Each panel object:

```js
{
  panel: 1,
  start: 0,
  end: 36,
  width: 36
}
```

If wall length is not evenly divisible by panel 
coverage, the final panel becomes a cut panel.

### Seam Calculation

Seams are derived from panel boundaries:
- Every panel `start`
- Plus final wall end

This seam array is used for:
- Nearest seam checks
- Opening intersection analysis
- Seam rendering

### Rib Calculation

Ribs are calculated from:
- `startOffset`
- `ribSpacing`

Logic:
- Begin at `startOffset`
- Keep adding `ribSpacing`
- Stop once rib position exceeds wall length

Each rib object:

```js
{
  position: 12
}
```

### Panel Summary Logic

The summary includes:
- Wall length
- Coverage
- Full panel count
- Start panel cut width
- End panel cut width

Definitions:
- **Full panel**: panel width exactly equals coverage
- **Start panel cut**: first panel if not full width
- **End panel cut**: last panel if not full width

This summary feeds:
- Summary tab
- Cuts tab
- Warnings logic

---

## Opening Logic

### Opening Data Model

Each opening currently supports:

```js
{
  id,
  label,
  start,
  bottom,
  width,
  height,
  end,
  top
}
```

Meaning:
- `start`: inches from left wall edge
- `bottom`: inches from base
- `width`: opening width
- `height`: opening height
- `end`: start + width
- `top`: bottom + height

### Opening Normalization

`normalizeOpenings()` converts user-entered opening
 objects into consistent geometry and auto-computes:
- `end`
- `top`
- Default label
- Fallback ID

### Opening Analysis

`analyzeOpenings(openings, seams, ribs, wallHeight)` 
 evaluates each opening against:
- Seam positions
- Rib positions
- Wall height
- Intersecting panels

For every opening, it calculates:
- Start
- End
- Bottom
- Top
- Nearest left seam
- Nearest right seam
- Left offset from seam
- Right offset from seam
- Left rib hits
- Right rib hits
- Intersecting panels
- Warnings

### Rib Hit Logic

There is an `edgeTolerance` of `0.5` inches.

A jamb edge is considered to hit a rib if:

```js
Math.abs(rib.position - openingEdge) <= 0.5
```

Warnings are added if:
- Left jamb lands on a rib centerline
- Right jamb lands on a rib centerline

### Wall Limit Warnings

Warnings are also added if:
- Opening top exceeds wall height
- Opening bottom falls below wall base
- Opening extends beyond wall length

### Intersecting Panel Logic

For each seam span, the app checks whether an 
opening overlaps the panel horizontally.

For every affected panel, it stores:

```js
{
  panel,
  panelStart,
  panelEnd,
  cutStart,
  cutEnd,
  openingBottom,
  openingTop,
  openingHeight
}
```

This is the groundwork for a future fabrication-grade 
cut list.

---

## Gable Logic

### Gable Model Generation

The gable model is created by 
`generateGableLayout(config)`.

It reads:
- `wallLength`
- `leftEaveHeight`
- `rightEaveHeight`
- `peakHeight`
- `ridgePosition`
- `panelCoverage`

Then computes:
- `gableCuts`

Returned model shape:

```js
{
  wallLength,
  leftEaveHeight,
  rightEaveHeight,
  peakHeight,
  ridgePosition,
  panelCoverage,
  gableCuts,
  mode: "gable"
}
```

### Asymmetrical Gable Geometry

Unlike a simple symmetrical gable, this model allows:
- Different left and right eave heights
- An off-center ridge position

This is handled by `heightAtAsymmetricalGable()`.

#### Left side slope

If `x <= ridgePosition`:

```js
leftEaveHeight + riseLeft * (x / runLeft)
```

Where:
- `runLeft = ridgePosition`
- `riseLeft = peakHeight - leftEaveHeight`

#### Right side slope

If `x > ridgePosition`:

```js
peakHeight - dropRight * (distanceFromRidge / runRight)
```

Where:
- `runRight = wallLength - ridgePosition`
- `dropRight = peakHeight - rightEaveHeight`

This creates independent left and right roof slopes.

### Gable Panel Cut Calculation

Panels are created across wall length using 
`panelCoverage`.

For each panel:
- Calculate height at panel start
- Calculate height at panel end

Each entry becomes:

```js
{
  panel,
  start,
  end,
  leftHeight,
  rightHeight
}
```

This produces the cut schedule used in:
- Gable preview
- Gable summary table

---

## Rendering Logic

### Sidewall SVG Renderer

`renderSvg(model)` draws:
- Wall outline
- Panels
- Seams
- Ribs
- Top dimension ticks and labels
- Wall height callout
- Total length callout
- Openings in their actual vertical position

Openings are rendered using:
- `start`
- `bottom`
- `width`
- `height`

So the preview reflects actual opening placement 
within wall height.

### Gable SVG Renderer

`renderGable(model)` draws:
- Baseline
- Left and right wall lines
- Roof lines
- Ridge location
- Vertical panel seam lines
- Peak label
- Left and right eave labels
- Wall span and ridge position label

It uses asymmetrical height logic so the roof 
shape matches:
- Different eave heights
- Off-center ridge

### SVG Utilities

`svgUtils.js` provides helpers for:
- Setting up SVG
- Drawing rectangles
- Drawing lines
- Drawing text
- Drawing background grid

---

## Tabs Logic

### Summary Tab

**Sidewall Summary shows:**
- Wall length
- Wall height
- Panel coverage
- Full panel count
- Opening count
- Layout status
- Start/end cut values
- Opening geometry summary cards

**Gable Summary shows:**
- Wall length
- Left eave height
- Right eave height
- Peak height
- Ridge position
- Panel coverage
- Total panel count
- Ridge centered or offset status
- First and last panel summary
- Full panel-by-panel cut schedule

### Warnings Tab

Warnings are derived from current model state.

**Sidewall warnings may include:**
- Jamb edge on rib centerline
- Start/end cut mismatch
- Bad start offset
- Opening top exceeds wall height
- Opening extends past wall

**Gable warnings may include:**
- Peak height not above eave
- Ridge outside wall span
- No gable panels generated

### Cuts Tab

**Sidewall Cuts tab shows:**
- Edge Cuts
- Opening Cuts
- Panel-by-Panel instructions

**Gable Cuts tab**
- Hidden in gable mode because Summary already 
contains the full cut schedule

### Report Tab

Opening report details:
- Label
- Start
- Bottom
- Width
- Height
- End
- Top
- Seam offsets
- Rib hits
- Affected panels
- Warnings

---

## Footer and Action Logic

### Generate
Runs a fresh layout calculation and rerender.

### More (`...`)
Acts as a smart shortcut:
- If warnings exist, jump to Warnings
- Otherwise jump to Report

### Add Opening
In sidewall mode:
- Opens the Openings accordion
- Scrolls to it
- Focuses the opening label field

---

## Preview Controls

### Fit
Re-runs layout and reapplies preview visibility state.

### Grid
Toggles `grid-hidden` class on the SVG.

### Labels
Toggles `labels-hidden` class on the SVG.

These controls persist across rerenders because 
visibility state is tracked in `app.js`.

---

## Export Logic

The app exports a structured SVG report sheet.

### Export includes:
- Title block
- Mode subtitle
- Enlarged preview frame
- Panel summary section
- Openings report section

The export is portrait-oriented and designed to 
fill mobile screen preview better than the earlier 
smaller export version.

### Export content source
It uses:
- Current SVG preview markup
- Current summary tab content
- Current report tab content

The export summary/report areas are rebuilt into 
line-based text blocks rather than dumping one giant 
paragraph.

---

## Visual System

The app uses:
- **Charcoal** surfaces
- **Cyan** for technical interaction and active states
- **Orange** for warnings and cut emphasis

This supports a field-tool look:
- Industrial
- Technical
- Mobile-friendly
- High contrast

---

## Current Limitations

### 1. Sidewall cut list is not yet a full 
fabrication-grade cut engine The current Cuts 
tab is a strong field guide, but not yet a full 
manufacturing instruction system.

### 2. Opening cut logic is still mostly 
horizontal-first. 
The data model now includes vertical geometry, 
but future work can go further with:
- Exact notch rectangles
- Top and bottom trim details
- Panel-specific cut shapes

### 3. Export is improved but not yet a perfect 
clone of the in-app cards
It is structured and readable, 
but not a pixel-perfect reproduction of live UI cards.

### 4. No persistence layer yet
Inputs are not fully saved across sessions unless 
browser behavior preserves them.

---

## Recommended Future Improvements

### Field usefulness
- True feet / inches / fraction display mode
- Copyable field notes
- Persistent saved layout state
- Opening highlight in preview when selected
- Panel-specific focus mode

### Sidewall cut logic
- Full panel-by-panel rectangular cut breakdown
- Cut classification by opening type
- Trim / clearance notes
- Notch geometry reporting

### Gable improvements
- Cut severity or steepness notes
- Ridge asymmetry notes
- Special peak panel emphasis
- Export-specific gable schedule layout

### UX
- Optional presets
- Session save / restore
- Mode-specific export templates
- True bottom-sheet menu for `...`

---

## Development Principles

### 1. Layout logic should remain model-first
UI should reflect the model, not invent geometry 
on its own.

### 2. Sidewall and gable should share shell behavior, 
but not force identical output
Different wall types deserve different information 
architecture.

### 3. Summary should stay an overview
If detailed cut schedules belong there for gable, 
that is acceptable, but duplication across tabs 
should be avoided.

### 4. Openings should remain explicit user inputs
The system should not auto-detect openings or 
invent them.

---

## Glossary

### Panel Coverage
The effective horizontal width one panel covers.

### Seam
The boundary between two adjacent panels.

### Rib
A recurring panel profile line used as a layout reference.

### Start Offset
Horizontal offset applied before the rib sequence begins.

### Opening Start
Distance from left wall edge to opening left jamb.

### Opening Bottom
Distance from wall base to opening bottom edge.

### Ridge Position
Distance from left wall edge to roof ridge.

---

## Project Identity

**Project Name:** CR27 Panel Layout Tool  
**Primary Use:** personal field layout assistant 
for metal siding panel installations

The app is meant to help a human make 
layout decisions faster and with fewer mistakes, 
which is one of the few genuinely respectable 
uses of software.
