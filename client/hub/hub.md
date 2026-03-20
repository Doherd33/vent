# Hub — Command Centre

The hub is the landing page after login. It serves two purposes:

1. **Mission select** — shows role-filtered feature cards (left panel) for navigating to other modules
2. **3D facility viewer** — interactive Three.js model of the Wuxi MFG6 upstream perfusion facility (centre), with equipment inspection, process data, SOP viewer, and facility navigation

---

## File Structure

```
client/hub/
├── hub.html           (325 lines)  HTML shell + inline auth/role scripts
├── hub.css            (799 lines)  All hub-specific styles (HUD layout, panels, 3D viewport, SOP viewer)
├── hub.md             This file
├── models/            Directory for .glb Blender models (round-trip pipeline)
└── js/
    ├── main.js        (48 lines)   Entry point — imports all modules, resize handler, animation loop
    ├── scene.js       (86 lines)   Three.js core: scene, camera, renderer, controls, materials, shared state
    ├── helpers.js     (235 lines)  Geometry builders: makeVessel, makeBox, makeRoom, makePipe, makeLabel3D, etc.
    ├── facility.js    (543 lines)  Builds entire 3D facility: bioreactor stations, seed room, media prep, parts wash
    ├── data.js        (615 lines)  Process data, equipment docs, document content, AI query responses
    ├── ui.js          (430 lines)  Equipment detail panel: process parameters, document browser
    ├── sop-viewer.js  (266 lines)  Floating SOP viewer: tabbed docs, AI chat, concern form, draggable
    ├── interaction.js (137 lines)  Raycaster hover/click, equipment highlight, selection state
    ├── nav.js         (47 lines)   Facility camera navigation: fly-to views for each area
    └── export.js      (115 lines)  GLTF export for Blender, PBR lighting, GLB model loader
```

Shared files used by the hub:
- `client/shared/nav.js` — auth guard, nav bar injection, sign-out, role filtering
- `client/shared/styles.css` — global CSS (fonts, colours, resets)
- `server/routes/auth.js` — only `GET /auth/me` is called (by nav.js auth guard)

---

## Module Dependency Graph

```
main.js
├── scene.js          (Three.js core — no dependencies)
├── facility.js       (side-effect: builds 3D equipment on import)
│   ├── scene.js
│   └── helpers.js
│       └── scene.js
├── interaction.js    (side-effect: sets up hover/click handlers)
│   ├── scene.js
│   └── ui.js
│       ├── data.js   (pure data, no dependencies)
│       └── sop-viewer.js
│           └── data.js
├── nav.js            (side-effect: wires facility nav buttons)
│   └── scene.js
└── export.js         (side-effect: GLTF export button + model loader)
    └── scene.js
```

**Shared state pattern:** `scene.js` creates and exports `scene`, `camera`, `renderer`, `controls`, `equipment[]`, `bioreactors[]`, and materials. All other modules import what they need from it. The `equipment` and `bioreactors` arrays are `const` references with mutable contents — modules push into them freely.

---

## How It Works

### Page Load Sequence

1. **Token check** — inline `<script>` in `<head>` redirects to login if `vent_token` is missing
2. **Theme hue** — applies saved theme colour from localStorage
3. **nav.js** — auth guard (verifies JWT), injects nav tabs, sets role badge
4. **Role filtering** — inline `<script>` hides mission cards based on `cardRules[role]`
5. **Three.js module** — `<script type="module" src="js/main.js">` loads the module graph:
   - `scene.js` creates the renderer, camera, and materials
   - `facility.js` builds all 3D equipment (bioreactors, rooms, instruments, pipes)
   - `interaction.js` sets up hover labels and click-to-inspect
   - `nav.js` wires facility navigation buttons
   - `export.js` sets up GLTF export and model loading
   - `main.js` starts the animation loop (impeller rotation, camera transitions)

### 3D Facility Layout

The facility models Wuxi Biologics MFG6 (Dundalk) upstream perfusion:

| Area | Equipment | Real Brands |
|------|-----------|-------------|
| **Production BR Suite** | 3x 1000L bioreactors + control towers, gas panels, feed/bleed totes, ATF filters, SU filters | Sartorius BIOSTAT STR, Repligen XCell ATF, Bronkhorst EL-FLOW |
| **Seed Room** | 3x 20L + 3x 50L bioreactors, BSC, cell counter, analyser, osmometer, microscope | Sartorius BIOSTAT STR, Thermo Herasafe 2030i, Beckman Vi-CELL BLU, Roche Cedex HiRes, Advanced Instruments OsmoPRO, Olympus CKX53 |
| **Inoculation Room** | Inoculation vessel, glass pass-through | — |
| **Media Prep** | 4000L + 2000L vessels, platform/stairs, lab bench, instruments, WFI, sterile filter, tube welder | Sartorius Flexsafe, Mettler Toledo, Sartorius BioWelder TC |
| **Downstream** | Harvest sump, Protein A + IEX columns, UF/DF skid, fill tank | Cytiva AKTA, Sartorius Sartoflow |
| **Parts Wash** | Dirty → Washer → Clean → Autoclave → Sterile (3 rooms + 2 machines) | Belimed PG 8527, Getinge GSS 6713 |

### Equipment Interaction

- **Hover** — highlights equipment wireframe, shows name + description tooltip
- **Click** — opens detail panel (right side) with:
  - Process data (live parameters, bar charts, stage tabs for bioreactors)
  - Documents tab (SOPs, PBRs, specs, logs — filterable)
  - Clicking a document opens the **floating SOP viewer**
- **ESC** — deselects equipment, closes panels

### Floating SOP Viewer

- Tabbed interface (open multiple documents)
- Document content with section headings
- AI chat panel (keyword-matched responses from `DOC_QUERY_RESPONSES`)
- Suggestion chips for common questions
- "Raise Concern" form (error, outdated, safety, process change)
- Draggable window, maximize/close controls

### Facility Navigation

Buttons in top-left of viewport fly the camera to preset views:
- Overview, Bioreactors, ATF Systems, Seed Room, Inoculation, Downstream, Media Prep, Parts Wash

### Blender Round-Trip Pipeline

1. **Export** — click "EXPORT GLTF" button to download the wireframe scene as `.gltf`
2. **Model in Blender** — open in Blender, replace wireframes with proper models
3. **Import back** — drop `.glb` files in `models/`, add entries to `MODEL_MAP` in `export.js`
4. The loader automatically replaces wireframes with Blender models while preserving click behaviour

---

## Role-Based Card Visibility

| Role | Cards visible |
|------|--------------|
| **operator** | Charlie AI, Raise Observation, My Activity, GDP Check, Feedback |
| **training** | Charlie AI, Raise Observation, My Activity, Doc Builder, Feedback |
| **qa** | All except Analytics |
| **director** | All cards |
| **msat** | Charlie AI, Raise Observation, My Activity, Doc Builder |
| **engineering** | Charlie AI, Raise Observation, My Activity, Doc Builder |
| **admin** | All cards |

`cardRules` in hub.html and `rules` in nav.js are **two separate lists** that must stay in sync.

---

## The 12 Feature Cards

| Card | Links to | Key |
|------|----------|-----|
| Charlie AI | `/operator/query.html` | charlie |
| Raise Observation | `/operator/query.html?openVent=1` | observe |
| My Activity | `/qa/submissions.html` | activity |
| QA Centre | `/qa/qa.html` | qa |
| Deviations | `/qa/deviations.html` | deviations |
| CAPAs | `/qa/capas.html` | capas |
| Change Control | `/qa/change-control.html` | change |
| Doc Control | `/qa/documents.html` | doccontrol |
| Doc Builder | `/qa/builder.html` | builder |
| GDP Check | `/operator/query.html?gdp=1` | gdp |
| Analytics | `/management/dashboard.html` | analytics |
| Feedback | `/operator/feedback.html` | feedback |

---

## Code Organisation History

The hub started as a single `hub.html` file. As the 3D facility grew, it became a 3,614-line monolith (69% Three.js, 22% CSS, 8% HTML). It was refactored into 10 ES modules + external CSS with zero behaviour change:

- **Before:** 1 file, 3,614 lines, painful to debug
- **After:** 12 files, largest is 615 lines (data.js), most are under 300 lines
- **Performance:** identical — Vite serves native ES modules in dev, Rollup bundles for production
