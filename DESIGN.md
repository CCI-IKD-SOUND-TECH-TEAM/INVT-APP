---
name: CCI Ikorodu Inventory
description: A confident, warm dark-mode inventory system for church asset management
colors:
  bg: "#000000"
  surface: "#121214"
  surface-raised: "#1A1A1D"
  surface-sunken: "#0A0A0B"
  border: "#2A2A2E"
  border-subtle: "#1E1E21"
  ink: "#F5F5F4"
  ink-muted: "#A3A3AC"
  ink-faint: "#6B6B72"
  accent: "#FF3B3B"
  accent-deep: "#E62E2E"
  accent-tint: "#2E1212"
  status-good: "#34D399"
  status-info: "#60A5FA"
  status-caution: "#F5A623"
  status-critical: "#FF3B3B"
  status-neutral: "#71717A"
typography:
  display:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "clamp(2rem, 3.2vw, 3.25rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "clamp(1.375rem, 2vw, 1.875rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "0.01em"
  title:
    fontFamily: "Lato, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Lato, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Lato, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge-status:
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
---

# Design System: CCI Ikorodu Inventory

## 1. Overview

**Creative North Star: "The Warehouse at Night"**

Picture the equipment store after everyone's gone home: shelves of sound and light gear sitting in the dark, each item's status catching a single point of red light — the one thing that needs your attention. That's the system. The canvas is committed black, not a tinted-dark "dashboard gray" — surfaces separate by subtle lightness steps and borders, never by drop shadow, because shadows don't read against true black. Anton carries the confidence: big, condensed, all-business headlines and KPI numbers that don't apologize for taking up space. Lato carries the warmth: everything a non-technical volunteer actually reads — labels, table rows, form copy — stays relaxed, legible, and plain-spoken. The accent red (`rgb(255, 59, 59)`) is spent deliberately: primary actions, the "something needs attention" signal (Defective, Open, Critical), and nowhere else. This system explicitly rejects the dated enterprise-ERP look (bevelled gray toolbars, dense chrome) and stock admin-template genericness — density comes from real information, not decoration.

**Key Characteristics:**
- True-black canvas with tonal (not shadow-based) surface layering
- One accent color, spent on purpose: primary actions + "needs attention" states
- Anton for structural confidence (titles, KPIs), Lato for everyday reading (data, forms, labels)
- A single shared badge vocabulary reused everywhere status appears (item status, defect severity, defect status)
- Generous touch targets and confirmation steps before anything consequential — built for trusted, non-technical users

## 2. Colors

Committed color strategy: a true-black stage with tonal-gray layering, and one saturated accent used with intent rather than spread thin.

### Primary
- **Signal Red** (`#FF3B3B` / `rgb(255, 59, 59)`): The one accent. Primary buttons, active nav state, focus rings, links, and the "needs attention" semantic (Defective items, Open defects, High severity). Used sparingly — if more than ~10-15% of a screen is red, pull it back.
- **Signal Red Deep** (`#E62E2E`): Hover/active state for anything using Signal Red.
- **Signal Red Tint** (`#2E1212`): Faint background wash behind critical badges/rows — never used at full saturation as a fill.

### Neutral
- **True Black** (`#000000`): The page canvas. Non-negotiable per brand — this is not a "near-black dashboard gray."
- **Char Surface** (`#121214`): Cards, table rows, widget panels — the first lift off the canvas.
- **Char Surface Raised** (`#1A1A1D`): Modals, dropdowns, popovers — the second lift, for anything that floats above page content.
- **Char Surface Sunken** (`#0A0A0B`): Input field backgrounds, code-like or secondary wells — sits between page and surface.
- **Line** (`#2A2A2E`): Default borders and dividers.
- **Line Subtle** (`#1E1E21`): Quiet internal dividers (table row separators) that shouldn't compete with content.
- **Bone** (`#F5F5F4`): Primary text. A warm off-white, never pure `#FFFFFF` for body copy — softer on true black.
- **Bone Muted** (`#A3A3AC`): Secondary text, captions, timestamps. Still ≥4.5:1 against both `#000000` and `#121214`.
- **Bone Faint** (`#8A8A93`): Quiet caption text (KPI card footers, form hints, timestamps), placeholder text, and disabled text. Verified ≥4.5:1 against both `#000000` (~6.1:1) and the `#121214` card surface (~5.5:1) — this is the AA floor; do not go lighter/grayer for any text a user must read. (Was `#6B6B72` in an earlier revision — that measured ~3.97:1 on true black and failed AA for the caption copy it was applied to.)

### Semantic (status vocabulary — shared across item status, defect severity, defect status)
- **Good / Available / Resolved** (`#34D399`): Available items, Resolved defects, Low severity.
- **Active / In Use / Informational** (`#60A5FA`): In Use items, informational states.
- **Caution / Under Repair** (`#F5A623`): Under Repair items and defects, Medium severity.
- **Critical / Defective / Open / High** (`#FF3B3B`, same value as Signal Red): Defective items, Open defects, High severity — the accent doing double duty as both "act now" CTA color and "something's wrong" signal is intentional, not a collision.
- **Neutral / Retired / Not Repairable** (text `#A3A3AC` on a `#71717A`-derived 16% tint): Retired items, Not Repairable defects — deliberately desaturated to read as "no longer active." The badge *text* uses Bone Muted (`#A3A3AC`) rather than `#71717A` directly; `#71717A` alone is only ~4.3:1 on true black and would fail AA, so it drives the background tint while Bone Muted carries the label.

### Named Rules
**The One Voice Rule.** Signal Red is the only saturated color with a subjective "brand" role. Every other color in the system is either a neutral gray-black step or a desaturated semantic (status) color. If a screen needs a second "loud" color, the answer is to use Signal Red more precisely, not to add a second accent.

**The No-Shadow Rule.** Depth comes from surface lightness steps (`Black → Char Surface → Char Surface Raised`) plus 1px borders, never from `box-shadow` blur — blur is invisible against true black and reads as a bug, not elevation.

## 3. Typography

**Display Font:** Anton (with `'Arial Narrow', sans-serif` fallback)
**Body Font:** Lato (with `system-ui, sans-serif` fallback)

**Character:** Anton is condensed, bold, and a little loud on purpose — it's the system's one moment of visual confidence, reserved for page titles and the big numbers on dashboard KPI widgets. Lato is the workhorse: humanist, warm, highly legible at small sizes, used for every piece of copy a user actually has to read and act on. The pairing is a deliberate contrast — shout the structure, speak the content plainly.

### Hierarchy
- **Display** (400, `clamp(2rem, 3.2vw, 3.25rem)`, line-height 1.02): Dashboard KPI values only (Total Assets count, etc.) — the single largest text on any screen.
- **Headline** (400, `clamp(1.375rem, 2vw, 1.875rem)`, line-height 1.08): Screen titles ("Inventory", "Defect Log", "Add Item").
- **Title** (700, 1.0625rem, line-height 1.3): Card/widget headers, modal titles, defect item names.
- **Body** (400, 0.9375rem, line-height 1.6): Table content, form copy, descriptions. Cap prose at 65–75ch.
- **Label** (700, 0.75rem, letter-spacing 0.04em, uppercase where used for table headers and badges only — never as a decorative eyebrow above sections): Table column headers, status badges, form field labels.

### Named Rules
**The Anton-Never-Reads Rule.** Anton is never used for body copy, table data, or anything a user must read carefully — it's a condensed display face and gets fatiguing past a headline. If it's more than one line and someone has to actually parse it, it's Lato.

## 4. Elevation

Flat-by-default, tonal-layered system — no drop shadows anywhere in the resting state, because soft shadow blur is functionally invisible against a true-black canvas and looks like a rendering error rather than depth. Hierarchy is conveyed entirely by surface lightness step (Black → Char Surface → Char Surface Raised) and 1px borders. The one exception is a narrow, purposeful accent-tinted glow — never a neutral shadow — used only on the primary button's hover/focus state and on the active nav indicator, to reinforce the One Voice Rule rather than fight it.

### Shadow Vocabulary
- **accent-focus-glow** (`box-shadow: 0 0 0 3px rgba(255, 59, 59, 0.25)`): Keyboard focus ring on interactive elements — accent-tinted, not a generic blue browser default.
- **scrim-modal** (`background: rgba(0, 0, 0, 0.72)`): Full-screen backdrop behind modals/dialogs — a darkening scrim rather than a shadow, since the modal itself already sits on the next surface step up.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The only depth cues are surface-step color and 1px border; shadows appear only as a direct response to interaction state (focus, hover on the primary CTA), never as passive card styling.

## 5. Components

### Buttons
- **Shape:** `10px` radius (`{rounded.md}`) — soft enough to feel approachable, structured enough to feel like a tool.
- **Primary:** Signal Red background (`#FF3B3B`), white text, `12px 20px` padding, Lato 700. Used for exactly one primary action per screen (Save, Log Defect, Start Repair).
- **Secondary:** Char Surface Raised background (`#1A1A1D`), Bone text, 1px `Line` border. Used for secondary actions (Cancel, Export).
- **Ghost:** Transparent background, Bone Muted text, no border; underline or background-tint only on hover. Used for tertiary/low-emphasis actions (View, row-level links).
- **Danger:** Same shape as Primary but reserved for genuinely destructive/consequential confirmations (Retire Item, Mark Not Repairable) — always behind a confirmation dialog, never a first click.
- **Hover / Focus:** Primary darkens to Signal Red Deep (`#E62E2E`) plus a `0 0 0 3px rgba(223,78,78,0.25)` focus glow on keyboard focus. 160ms ease-out-quart background transition; no scale/bounce.

### Status Badges (signature component)
- **Style:** Fully rounded (`999px`) **outlined** pill — transparent fill, 1px `Line` (`#2A2A2E`) border, `4px 10px` padding (a hair tighter on the left for the icon). A leading **solid, tone-colored status icon** carries the semantic color; the **text label is neutral Bone** (`#F5F5F4`), sentence-case (the status string as written — "In Use", "Under Repair"), Lato 500. Color lives in the icon, not the whole chip — so a table of statuses stays calm and the badges never compete with the Primary button's full-saturation Signal Red.
- **Icon language:** one glyph per state, colored from the shared Section 2 palette — `CheckCircle` (good: Available, Resolved), `PlayCircle` (info: In Use), `ExclamationCircle` (critical: Defective, Open), `MinusCircle` / `XCircle` (neutral: Retired / Not Repairable). The single in-progress state, **Under Repair**, uses a spinning `ArrowPath` (caution amber) to signal active work — every other glyph is static. The word names the state, so color is never the only indicator (WCAG 1.4.1).
- **States:** One badge per status value (Available, In Use, Defective, Under Repair, Retired // Open, Resolved, Not Repairable). The icon + color mapping is identical everywhere a status appears — dashboard, listing table, detail view.
- **Severity is not a badge.** Low / Medium / High render as **quiet colored text** (`SeverityLabel`), same shared palette (Low = good, Medium = caution, High = critical), no pill. Status is the state a user acts on and gets the badge; severity is a supporting attribute and sits back a weight, so a defect row shows one pill, not two competing ones.

### Cards / Containers (Dashboard widgets, list rows as cards on mobile)
- **Corner Style:** `14px` radius (`{rounded.lg}`).
- **Background:** Char Surface (`#121214`) on the Black page canvas.
- **Shadow Strategy:** None at rest — see Elevation. Border only.
- **Border:** 1px `Line` (`#2A2A2E`); on interactive/clickable cards (KPI widgets), border shifts to `rgba(223,78,78,0.4)` on hover.
- **Internal Padding:** `24px` (`{spacing.lg}`) desktop, `16px` (`{spacing.md}`) mobile.

### Inputs / Fields
- **Style:** Char Surface Sunken background (`#0A0A0B`), 1px `Line` border, `10px` radius, `11px 14px` padding, Lato body text, Bone Faint placeholder (verified ≥4.5:1, not a lighter throwaway gray).
- **Focus:** Border shifts to Signal Red, plus the accent-focus-glow shadow token. No color-only signal — border weight also increases to 1.5px for users with color vision deficiency.
- **Error:** Border shifts to `#FF3B3B` with a small inline error message below in the same red, prefixed by an icon (not color alone).
- **Disabled:** Char Surface background, Bone Faint text, no border-hover response.

### Navigation
- **Style:** Fixed left sidebar (desktop) on Black, Lato labels at Body size with icon prefix. Default state: Bone Muted text/icon. Hover: Bone text, Char Surface background tint. Active: Bone text, Signal Red left-edge indicator dot (not a border stripe — a small dot or icon fill, per the side-stripe ban) plus Char Surface background.
- **Mobile:** Collapses to a bottom tab bar or a slide-in drawer behind a hamburger trigger at ≤768px; same color/state logic.

### Repair Timeline (signature component)
A vertical timeline in the Defect detail view: each status change (Open → Under Repair → Resolved) is a node on a Line-colored vertical rule, with the node itself filled in the semantic color of that status, a Title-weight label, and Bone Muted timestamp/user metadata beneath. This is the accountability surface made visible — it should never be collapsed behind a tab.

## 6. Do's and Don'ts

### Do:
- **Do** keep the page canvas true black (`#000000`) — surfaces lift via `#121214` / `#1A1A1D` steps, never via shadow.
- **Do** reserve full-saturation Signal Red (`#FF3B3B`) for primary actions and "needs attention" semantics only.
- **Do** use Anton exclusively for headlines and KPI numbers — never for body copy, table data, or button labels longer than 2-3 words.
- **Do** use the same status badge (color, shape, label) for a given state everywhere it appears — dashboard, table, detail view.
- **Do** require a confirmation step before Retire, Mark Not Repairable, or any status change that's hard to undo.
- **Do** verify placeholder and muted text against true black — treat `#6B6B72` as the lightness floor, not a starting point to go lighter from.

### Don't:
- **Don't** use the dated enterprise-ERP look — no bevelled gray toolbars, no dense admin-template chrome.
- **Don't** use a generic Bootstrap/AdminLTE admin-template visual language.
- **Don't** tip into a playful consumer-app register — no bouncy motion, no emoji-heavy copy; this is a work tool for volunteers handling real church property.
- **Don't** apply drop-shadow blur to cards or panels at rest — it's invisible on true black and reads as a bug.
- **Don't** use `border-left`/`border-right` color stripes as a status or navigation-active indicator — use a filled dot, icon, or full badge instead.
- **Don't** add a second saturated accent color alongside Signal Red — desaturated semantic status colors are the only exception, and they're capped at moderate saturation by design.
- **Don't** set body or label text lighter/grayer than `#6B6B72` — it will fail contrast against both the black canvas and the `#121214` surface step.
