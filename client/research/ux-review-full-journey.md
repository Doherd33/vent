# UX Review: Full User Journey
**Generated:** 2026-03-11
**Pages Reviewed:** 10 (login, hub, operator/index, operator/query, qa/qa, qa/deviations, qa/capas, management/dashboard, operator/feedback, shared nav/styles)
**Reviewer Persona:** QA manager, 8 hours/day, GMP biologics facility

---

## Overall UX Score: 58/100

The product has strong bones — the design language is coherent, the dark theme is appropriate for a QA environment, and the split-panel pattern on QA pages is the right call. But there is a significant and consistent pattern of feature accumulation over user clarity. Animations, orbs, radial menus, and customisation panels are eating attention budget that belongs to the user's actual work.

---

## Page Scores

| Page | Layout | Interaction | Data | A11y | GMP UX | Score |
|------|--------|-------------|------|------|--------|-------|
| auth/login.html | 6/10 | 5/10 | N/A | 5/10 | 4/10 | 50 |
| hub/hub.html | 7/10 | 6/10 | 5/10 | 5/10 | 5/10 | 56 |
| operator/index.html | 4/10 | 3/10 | 5/10 | 3/10 | 4/10 | 38 |
| operator/query.html | 7/10 | 6/10 | 8/10 | 5/10 | 7/10 | 66 |
| qa/qa.html | 8/10 | 7/10 | 7/10 | 5/10 | 7/10 | 68 |
| qa/deviations.html | 8/10 | 7/10 | 7/10 | 5/10 | 8/10 | 70 |
| qa/capas.html | 7/10 | 6/10 | 7/10 | 5/10 | 7/10 | 64 |
| management/dashboard.html | 7/10 | 6/10 | 7/10 | 5/10 | 5/10 | 60 |
| operator/feedback.html | 7/10 | 6/10 | 6/10 | 5/10 | 4/10 | 56 |

---

## Critical UX Issues (fix these first)

### P1 — The cinematic login intro must go

**File:** `client/auth/login.html` + `client/shared/cinematic.js` + `client/shared/login.css`

Users hit a full-screen animated splash with ambient orbs, a canvas frequency visualiser, animated tagline text, and a frequency bar visualiser — before they can even see a login form. This is "dev showing off." In a GMP facility, any operator who needs to log in quickly to flag an observation, or any QA manager arriving at 6 AM for a batch review, does not want to watch an animation before they can type their password.

Specific problems:
- The cinematic screen (`#cinematic`) is full-screen fixed, z-index 1000, and must be dismissed by clicking "Enter Vent" before the login form is visible at all
- Three canvas-drawn animated orbs + a frequency visualiser are running — GPU cost with no user value
- The "Enter Vent" and "Launch Demo" are duplicated on both the cinematic screen and again on the login card below it — two separate UIs for the same action
- The welcome screen (`#welcomeScreen`) then asks "What should we call you?" as a separate name-capture step between the cinematic and the login card. This is a third step before the user has authenticated

**Fix:** Remove the cinematic screen entirely. Go straight to the login card on page load. The login card itself is clean and well-structured — it does not need this preamble.

---

### P2 — operator/index.html is the wrong interface for an operator

**File:** `client/operator/index.html`

This page was supposed to be a fast observation-submission interface ("Flag a concern in 30 seconds"). What it actually is:

- A full-screen dark page built around a pulsing orb (`hub-orb`) with "VENT / TAP TO BEGIN" inside it
- The orb triggers a radial menu (wedge-based, SVG, canvas-rendered, fully configurable with orbit radius, wedge size, corner radius, and glow intensity sliders)
- Clicking an option in the radial menu opens the "Raise Observation" form or other flows
- There is a separate profile panel accessible from "My Profile" button, with: accent theme colour picker, hue slider (0–360), custom menu design sliders (wedge size, orbit radius, corner radius, glow intensity), voice settings (volume, speed, stability, clarity, style, speaker boost, pitch, bass, treble), voice preset save/load, and a voice test button

An operator in gowning, with gloves on, trying to flag a bioreactor alarm in a manufacturing suite does not need to configure wedge geometry or EQ their AI voice. They need a button that says "Report a problem" and a text box.

The orb specifically fails because:
1. It communicates nothing about what it does — "TAP TO BEGIN" is the only affordance
2. Tapping it opens a radial menu that is not self-labelling at a glance
3. The interaction is a novelty interface that will confuse new users and frustrate experienced ones
4. The entire concept of configuring "orbit radius" is a developer concern, not a user concern
5. There is no way to tell where you are in the app — there is no title bar or nav on this screen

The profile settings panel contains 12 sliders. Nobody managing a deviation investigation needs bass and treble control on their AI assistant.

**Fix:** Replace this page with a simple, focused observation-submission form. Large input field, voice record button, submit button. Three elements. Done.

---

### P3 — query.html has dual navigation systems that conflict

**File:** `client/operator/query.html`

The title bar on query.html has five interactive elements on its right side: an SOP search button, a role badge, a username, a "New chat" button, a "Hub" button, and a "Sign out" button. Three of those buttons (`New chat`, `Hub`, `Sign out`) are styled identically with `.sign-out-btn` — the same class. A new user cannot tell which is the primary action.

Separately, the page has:
- A floating `history-toggle` button (left edge)
- A floating `todo-toggle` button (right edge)
- A `hub-orb` section with its own nav (before the title bar appears in DOM order)
- A `vent-hub` full-screen landing state that sits behind the chat interface
- A profile panel (right slide-in)
- A history sidebar (left slide-in with backdrop)
- An SOP search sidebar (right slide-in with backdrop)
- An SOP viewer floating panel
- A bookmarks panel
- A to-do sidebar (separate from history sidebar)
- A GDP check modal

That is 10 separate UI layers on a single page. A QA manager using this daily will have to remember which icon opens which panel. The floating buttons (history, to-do) lack labels — they are icon-only with no tooltip visible until hover.

The `vent-hub` screen — the orb with flow loops that serves as a landing state — exists inside query.html and must be "entered" before the chat UI appears. This means query.html has two distinct states: an orb-based landing screen, and then the actual chat interface. The URL is the same, the page is the same, but the user sees completely different UI.

**Fix:** Remove the `vent-hub` landing state from query.html. The chat interface should be the default state. The orb adds a step before every session. Add labels to the floating buttons or convert them to a slim toolbar below the title bar.

---

### P4 — The hub is a navigation page that doubles as a branding exercise

**File:** `client/hub/hub.html`

The hub has:
- A 260x260px animated orb (`hub-orb-wrap`) with three concentric rotating ellipse animations, four pulsing flow nodes, and an inner specular highlight animation
- A "VENT" label inside the orb
- "Welcome back, [name]. Manufacturing Intelligence Platform" text below it
- Then the module cards below that

The orb consumes roughly 30–40% of the initial vertical viewport and communicates: nothing. It is a logo. It does not indicate the user's most urgent task, it does not show pending deviations or overdue CAPAs, it does not link anywhere. It is there to look impressive.

For a pharma QA manager arriving each morning, the hub should answer: "What needs my attention today?" Not: "Here is a pretty animation."

Also: the hub card grid shows up to 12 cards depending on role. For a QA role that is the full set. Twelve cards in a 3-column grid with no grouping by workflow stage makes it hard to scan. "Raise Observation" and "Charlie AI" are operationally very different from "Deviations" and "CAPAs" — but visually they sit side by side with equal weight.

**Fix:** Shrink the orb to a logo mark (40px, top-left, done). Replace the empty centre of the hub with an urgent items summary: open deviations count, overdue CAPAs, pending approvals. Group hub cards by workflow stage: Operator tools | QA tools | Management tools.

---

### P5 — Design system is partially ignored — hardcoded hex values everywhere in QA pages

**Files:** `client/qa/qa.html`, `client/qa/deviations.html`, `client/qa/capas.html`

`styles.css` defines CSS variables like `--bg`, `--s1`, `--s2`, `--border`, `--text`, `--mid`, `--dim`. These are the design system.

The QA pages frequently bypass these:
- `background: #252526` instead of `var(--s1)`
- `background: #1e1e1e` instead of `var(--bg)`
- `color: #8e8e8e` instead of `var(--mid)`
- `border: 1px solid #3c3c3c` instead of `var(--border)`
- `color: #5a5a5a` instead of `var(--dim)`
- `background: #007acc` hardcoded (the accent blue) instead of `var(--accent)`
- `background: #094771` hardcoded for active list items (the blue highlight) — not in the design system at all

This means: if the theme hue changes (and query.html allows users to change the hue slider from 0–360), the QA pages do not update. They are frozen to #007acc regardless. The operator sees teal UI, clicks to Deviations, sees blue UI. Visual inconsistency between pages.

The status bar at the bottom of qa.html and deviations.html has `background: #007acc` hardcoded. This is the one element on the entire page with a solid blue background — it looks like a VS Code status bar, which is exactly what it is mimicking. A pharma QA tool should not look like VS Code.

---

## Improvement Opportunities (ordered by impact)

### 1. The bottom log panel on QA/Deviations is misleading for non-developers

**Files:** `client/qa/qa.html`, `client/qa/deviations.html`, `client/qa/capas.html`

Each of these pages has a resizable bottom panel with "TERMINAL / PROBLEMS / OUTPUT" tabs that displays a console-style log in `JetBrains Mono` font. For a QA manager, seeing a monospace console with log entries like `[INFO] 14:23:01 - Loaded 12 submissions` is confusing. Is this a system log? Is it something they need to act on? It adds noise and implies the software is a developer tool.

Replace with an activity feed ("Recent actions in this session") or remove the bottom panel entirely. The resize handle between the main panel and this log panel is also tiny (4px) and easy to accidentally drag.

### 2. The VS Code aesthetic is the wrong reference for a regulated pharma product

The QA pages (qa.html, deviations.html, capas.html) have deliberately adopted the VS Code interface pattern: draggable resize handles between panels, editor tabs with X close buttons, a blue status bar at the bottom with VS Code-style info, monospace log output, and active selections styled with `#094771` (the VS Code selected-item blue). These are technically functional but they carry the wrong connotations. A pharma inspector reviewing the system for 21 CFR Part 11 compliance will raise an eyebrow at an interface that looks like a code editor.

The right reference is something closer to a clinical workstation or an enterprise quality system — more utilitarian and professional, less "developer's personal project."

### 3. Suggestion chips on query.html are hardcoded and static

**File:** `client/operator/query.html` lines 537–546

Eight suggestion chips are hardcoded into the empty state: "pH control", "pH probe calibration", "Inoculation criteria", etc. These are upstream bioreactor questions. A user in media prep, QC, or CIP gets the same chips every session. The area select dropdown (Upstream, Media Prep, Harvest, CIP, QC, General) already captures the user's area — the suggestion chips should change to match the selected area. As built, the area selector and the suggestion chips are disconnected.

### 4. The SOP search sidebar on query.html duplicates the chat itself

**File:** `client/operator/query.html`

There is a dedicated "SOP search" panel (toggle from title bar, magnifier icon) that has two modes: AI discovery ("Describe what you're working on") and keyword search. But the main chat input already accepts plain language questions and returns sourced SOP answers. The SOP search sidebar and the chat are solving the same problem with two different UIs. A user cannot tell which to use.

### 5. The to-do list on query.html does not belong on a SOP query tool

**File:** `client/operator/query.html`

There is a floating to-do sidebar on the SOP chat page that lets users add personal tasks. A GMP quality event system has formal task tracking through CAPAs and workflow states. A personal to-do list in a floating panel on the AI chat page will either be ignored or accumulate unregulated task records that sit outside the audit trail. Cut it.

### 6. Empty state emoji on QA pages is jarring

**Files:** `client/qa/qa.html`, `client/qa/deviations.html`, `client/qa/capas.html`

The empty state when no item is selected uses `.ei { font-size: 36px; }` which renders a large emoji character (e.g. "📋"). Emoji in a regulated quality management system are unprofessional. Use an SVG icon that matches the established icon language already used everywhere else in the design system.

### 7. Annotation reaction chips on qa.html are social media UI in a GMP system

**File:** `client/qa/qa.html`

Observations and comments in the detail panel have `.reaction-chip` elements — emoji reaction buttons (like, heart, etc.) on QA investigation comments. In a 21 CFR Part 11 context, every action in a quality record must be attributable to a specific user and timestamped. A thumbs-up reaction chip creates the impression of non-binding, social commentary on a formal quality record. This must be removed. If users need to acknowledge they've read something, implement a formal "Acknowledged" button that generates an audit entry.

### 8. The profile hue slider (0–360°) changes the app theme in real time but QA pages don't respond

**File:** `client/operator/query.html` profile panel

The hue slider changes `--hue` on the document root, which changes `var(--accent)` across the whole app. But `qa.html`, `deviations.html`, and `capas.html` all have `#007acc` hardcoded in dozens of places, so they don't respond to the hue change. The result is a user setting teal as their accent colour in the chat page, then visiting Deviations to find everything is still VS Code blue. Either complete the design system adoption across all pages (fix issue P5 above), or remove the hue picker entirely — a QA tool should have a fixed, authoritative visual identity.

### 9. The "My Profile" button on query.html/operator page opens a settings panel that belongs in a dedicated settings page

**File:** `client/operator/query.html`

The profile panel has: name/role display, 5 colour palettes, a hue slider, 4 menu design sliders, 4 voice parameter sliders, 3 audio processing sliders, 2 preference toggles, voice preset save/load — all inside a right-edge slide-in panel on the main chat page. This is a settings page crammed into a panel. Move voice and theme settings to a dedicated `/settings` page. On the main chat page, show only the user's name and a link to settings.

### 10. nav.js injects nav tabs dynamically, but query.html hardcodes them too

**File:** `client/operator/query.html` lines 218–224

The shared nav.js rebuilds the nav from `MVP_TABS` dynamically. But query.html also contains a hardcoded `<nav class="title-nav" id="mainNav">` with static anchor tags already in it. Nav.js then replaces the innerHTML of `#mainNav`. The hardcoded tabs serve as a flash-of-old-content before JS runs. They are also not the full set — they show only 6 tabs regardless of role. Clean this up: the nav div should be empty in HTML and populated entirely by nav.js.

---

## Accessibility Gaps (WCAG 2.1 AA)

### Colour contrast on dim/mid text fails 4.5:1 ratio

`--mid: #8e8e8e` on `--bg: #1e1e1e` gives a contrast ratio of approximately 4.3:1 — marginally below the 4.5:1 AA threshold for normal text. Most of the metadata text (card-meta, filter labels, timestamps, section labels) uses `--mid` or `--dim: #5a5a5a`. `#5a5a5a` on `#1e1e1e` is approximately 3.1:1 — a clear WCAG AA failure for text smaller than 18px.

Every secondary text label in the QA pages fails contrast at `10px` and `11px` font sizes. At those sizes, even the 3:1 Large Text exception does not apply (requires 18px normal weight or 14px bold).

### Icon-only buttons have no accessible label

On query.html: the history toggle button is icon-only (no text, no aria-label). Same for the to-do toggle, the SOP search toggle, and the analysis modal icons inside the history sidebar. These are completely invisible to screen readers.

The mobile hamburger on all pages does have `aria-label="Menu"` — that pattern should be applied consistently to all icon-only controls.

### Focus indicators are absent

There are no visible focus styles defined in styles.css or any page CSS. The browser default focus ring is suppressed by the CSS reset or by default styling on inputs (`.esig-body input:focus { border-color:#007acc; outline:none; }`). Keyboard-only users and users navigating by tab will have no visible indicator of where focus sits.

Every `outline: none` should be replaced with a custom visible focus indicator: `outline: 2px solid var(--accent); outline-offset: 2px`.

### Form fields lack associated labels in some contexts

The textarea in operator/index.html submission form has no `<label>`. The consent checkboxes use a custom toggle pattern but the checkbox itself is `display:none` with no aria-checked state management. The voice settings sliders have `<label>` elements but they are not programmatically associated with `for`/`id` pairs.

### Timestamps are not in facility-local time (GMP critical)

No timestamps anywhere in the visible UI are explicitly labelled with a timezone. The audit trail entries in qa.html show timestamps in monospace (`color:#5a5a5a`). In a multi-site GMP operation, a timestamp that says "14:23:01" without a timezone makes the audit trail ambiguous. All timestamps should display with an explicit timezone suffix: "14:23:01 UTC" or "14:23:01 IST". This is an ALCOA+ data integrity requirement (Attributable, Legible, Contemporaneous, Original, Accurate — the "Accurate" pillar includes timezone-unambiguous times).

---

## Design System Violations

1. QA pages bypass CSS variables with hardcoded hex literals throughout — `#252526`, `#1e1e1e`, `#3c3c3c`, `#8e8e8e`, `#5a5a5a`, `#007acc`, `#094771`, `#4ec9b0`, `#ffc64d`, `#f44747`. Colours that exist as variables in styles.css.

2. The `--bg` variable in styles.css is `#1e1e1e`, but login.css sets `background: #0a0a0c` and hub.html uses `--hue: 252` in a local override. These inconsistencies mean no single source of truth for the background colour.

3. Button classes: styles.css defines no button classes at all — every page defines its own `.wf-btn`, `.action-btn`, `.continue-btn`, `.cine-enter`, `.cine-demo`, etc. There are at least 8 different button class families across the pages. A design system without a button component is not a design system.

4. Border radius is inconsistent: `border-radius: 2px` on QA cards, `border-radius: 8px` on hub cards, `border-radius: 12px` on query.html input box, `border-radius: 6px` on esig modals. No documented radius scale.

5. Font sizes below 10px are used in production: `.risk-badge { font-size: 9px }`, `.audit-hash { font-size: 9px }`, `.type-badge { font-size: 9px }`. At 1920x1080 with standard DPI these are readable. At higher DPI or on a QA manager's laptop at arm's length from a secondary monitor, they will be illegible.

6. `styles.css` does not include shared button, form input, modal, or badge component styles. Every page re-implements these from scratch. The total CSS across all pages is several thousand lines of which at least 60% is duplication of the same 10 patterns.

---

## GMP-Specific UX Issues

### Electronic signature modal is adequate but not prominent enough

The e-signature modal (`.esig-overlay`) in qa.html and deviations.html collects password, reason, and role. This is the right pattern for 21 CFR Part 11. However:
- The "meaning of signature" (what exactly is being approved, the specific record ID and state transition) is shown only in the modal header paragraph, in 11px `--mid` colour text. It should be prominent — 14px minimum, full text of what is being signed.
- There is no final confirmation step: the user types their password and clicks "Sign". A single-click sign could result in inadvertent approvals. Consider requiring the user to type the record ID or their username as an additional confirmation for critical state transitions (approval, closure, director signoff).

### Audit trail hash is visible but incomprehensible

**File:** `client/qa/qa.html`

Each audit entry has an `.audit-hash` element displaying a hash string in 9px monospace with `color: #3c3c3c` (nearly invisible on the `#1e1e1e` background). The hash is there, which is correct for data integrity. But:
- It is styled to be intentionally hard to read (`color: #3c3c3c`, 9px) — this undermines the purpose of showing it
- There is no explanation of what the hash is or what to do with it
- There is no mechanism to verify the hash against a reference

For an FDA inspection, the auditor will ask "how do I verify this hasn't been tampered with?" The hash needs to be visible, accompanied by a "Verify" action, and the verification result should be shown inline.

### Status lifecycle is not consistently visible

On qa.html the status workflow buttons (`wf-btn`) appear inline in the detail panel. On deviations.html the same pattern applies. But neither page shows a clear visual timeline of where the current record sits in its full lifecycle (e.g. Draft → Open → Investigating → Root Cause Identified → CAPA Linked → Closed). The operator/index.html feedback flow does have a timeline component (`.tl-item` with done/now/next dots) — that pattern should be applied to all quality records in the QA module. A QA manager should be able to see at a glance: "this deviation is at step 3 of 6".

### Required fields are not marked

None of the forms across any page mark required fields with the standard asterisk or required indicator. The e-signature modal requires a password but it is styled identically to the reason field, which may be optional. In a GMP context, required fields must be unambiguous.

---

## Recommended Quick Wins (under 30 minutes each)

1. **Remove the cinematic intro screen.** Delete the `#cinematic` div from login.html and remove the `cinematic.js` script tag. The login card appears immediately. Users get to work immediately. (~15 min)

2. **Add `aria-label` to all icon-only buttons.** Search for `<button class="history-toggle"`, `<button class="todo-toggle"`, `<button class="sop-search-btn"` and add descriptive aria-label attributes. (~20 min)

3. **Replace emoji in empty states with SVG icons.** In qa.html/deviations.html/capas.html, replace `.empty-state .ei` content with the existing SVG icon patterns already used throughout the pages. (~20 min)

4. **Add timezone suffix to all timestamp displays.** In the audit trail and submission lists, append ` UTC` (or read from facility config) to all timestamp strings. (~25 min)

5. **Replace the three identically-styled buttons in the query.html title bar right side.** "New chat", "Hub", "Sign out" all use `.sign-out-btn`. Give "Hub" a different class, or remove it (the nav already has the app name linking to hub). Remove "New chat" from the title bar and keep it only in the history sidebar. (~20 min)

6. **Remove the bottom log panel from QA pages for non-admin roles.** Show it only when `role === 'admin'`. For QA managers it is noise. (~15 min)

7. **Add visible focus indicators.** In styles.css, add: `*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`. This one rule fixes the entire site. (~5 min)

8. **Delete the annotation reaction chips from qa.html.** Find `.annotation-reactions` and remove it. Emoji reactions on QA investigation records are inappropriate for a regulated system. (~10 min)

9. **Remove the to-do sidebar from query.html.** Delete the `#todoSidebar`, `#todoBackdrop`, `.todo-toggle` button, and all `todo*` JavaScript. Personal task tracking does not belong in an audited SOP query tool. (~20 min)

10. **Cut the voice audio processing sliders.** Remove pitch, bass, treble, stability, clarity, style sliders from the profile settings panel. Keep only volume and speed. EQ controls are not user-facing features for a quality management tool. (~15 min)

---

## Summary: What to Remove vs What to Keep

### Remove outright
- Cinematic login intro (`#cinematic`, `cinematic.js`)
- Welcome name-capture screen (`#welcomeScreen`, `welcome.js`)
- The hub and query page orbs as the primary navigation interaction
- Radial menu on operator/index.html — replace with a plain form
- 12 voice customisation sliders (keep volume + speed only)
- Menu design sliders (wedge size, orbit radius, corner radius) — entirely dev-facing
- Bottom log panel for non-admin roles
- To-do sidebar on query.html
- Emoji reaction chips on QA annotation comments
- Frequency visualiser canvas on login page

### Simplify significantly
- Login page: remove cinematic + welcome, show login card immediately
- Hub: remove the orb decoration, add an urgent-items summary above the cards
- query.html: remove the `vent-hub` landing state, start directly in chat mode; consolidate SOP search into the chat input bar
- Profile panel: one section only — name, role, theme colour choice (3 swatches, no slider), sign out

### Keep and polish
- Split-panel layout on QA/Deviations/CAPAs — this is the right pattern
- The chat interface on query.html — clean, clear, well-structured
- The electronic signature modal — correct for 21 CFR Part 11, needs prominence fixes
- The audit trail with hash — correct principle, needs contrast and verify action
- Status badges with colour coding — clear and consistent
- The hub cards layout — good information density, needs grouping by workflow
- Suggestion chips on the query empty state — useful, needs to be area-aware
