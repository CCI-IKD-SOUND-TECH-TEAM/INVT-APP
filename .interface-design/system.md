# CCI Ikorodu Inventory — Interface System

Source of truth is `DESIGN.md` + `app/globals.css`. This file mirrors it into
interface-design's working format so the skill inherits the existing system
instead of proposing a new one. Update `DESIGN.md` first for any real change;
sync this file after.

## Direction and feel

"The Warehouse at Night" — the equipment store after everyone's gone home:
shelves of gear in the dark, each item's status catching one point of red
light. Confident, warm, serious work tool for trusted non-technical
volunteers — not a playful consumer app, not a dated enterprise-ERP admin
template. Density comes from real information, not decoration.

## Depth strategy: flat + tonal (not shadows)

Committed choice, stated explicitly in DESIGN.md: no `box-shadow` at rest.
Shadow blur is invisible against true black and reads as a rendering bug, not
elevation. Hierarchy comes entirely from:
- Surface lightness steps: `#000000` (canvas) → `#121214` card → `#1A1A1D`
  raised (modals/popovers) → `#0A0A0B` sunken (inputs).
- 1px borders (`--border #2A2A2E`, `--line-subtle #1E1E21` for quiet
  dividers).

Exception: a narrow accent-tinted glow (`0 0 0 3px rgba(255,59,59,.25)`) on
keyboard focus and the primary button's hover — never a neutral shadow, never
passive card styling.

This *is* the correct dark-mode move per interface-design's own guidance
("shadows are weak on dark — lean on borders") — no conflict, hold the line.

## Spacing & radius

- Base unit: 4px. Scale: `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48`.
- Radius scale, concentric outward→inward: `lg 14px` (cards/containers) →
  `md 10px` (buttons, inputs, nested cells) → `sm 6px` (chips inside cells) →
  `full 999px` (status badges only).
- Card padding: 24px desktop, 16px mobile. Symmetrical unless content forces
  otherwise.

## Typography

Anton (display) for structural confidence — KPI numerals and screen titles
only, never body copy, never anything read carefully (Anton-Never-Reads
Rule). Lato (body) for everything a volunteer actually reads.

Five-level hierarchy (exceeds the 4-level minimum):
- Display `clamp(2rem,3.2vw,3.25rem)` / 400 / 1.02 lh — dashboard KPI values only.
- Headline `clamp(1.375rem,2vw,1.875rem)` / 400 / 1.08 lh — screen titles.
- Title `1.0625rem` / 700 / 1.3 lh — card/widget headers.
- Body `0.9375rem` / 400 / 1.6 lh — table content, forms, descriptions.
- Label `0.75rem` / 700 / 1.3 lh / 0.04em tracking / uppercase — column headers, badges, field labels.

## Color

One accent: Signal Red `#FF3B3B` (`--brand`). True-black canvas, one gray
family (char/bone), no blue, no second saturated hue.

- **Glyph-Only Rule**: semantic hue lives on a ≤16px glyph or 6px dot —
  never on body text or a numeral. KPI values, counts, and session stats stay
  neutral ink regardless of the state they describe.
- **Resting-Normal Rule**: a state that is simply fine gets no hue (Available,
  Resolved, Low severity read in muted ink, not green).
- **One Voice Rule**: Signal Red is the only subjective "brand" color; every
  other color is a neutral step or a desaturated semantic.

## Motion

- Custom ease, not a built-in curve: `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)`.
- Durations: `--duration-fast: 160ms` (background/color transitions),
  `--duration-base: 220ms`.
- No scale/bounce on press or hover — deliberate, keeps the serious
  work-tool register (stated explicitly in DESIGN.md's Do/Don't list). Do
  not add `active:scale-*` press feedback here even though the generic skill
  guidance suggests it — this project opted out on purpose.
- **Fixed 2026-09-12**: `--ease-out-quart` is now mapped into the Tailwind
  `@theme inline` block in `globals.css`, so `ease-out-quart` is a real
  utility. `duration-160`/`duration-220` needed no theme mapping — Tailwind
  v4's `duration-<n>` accepts any bare integer natively. Dashboard
  transitions now use `duration-160 ease-out-quart` (fast) or
  `duration-220 ease-out-quart` (base) instead of the generic
  `duration-150`/`duration-200 ease-out`. Verified by compiling the actual
  production CSS and grepping for the class rules — don't reuse the token
  *names* (`duration-fast`/`duration-base`) as class names, Tailwind won't
  recognize them without an explicit `--duration-*` theme mapping, which
  doesn't exist here; use the numeric values directly.

## Key component patterns

- **Button primary** — 44px h (`h-11`) · 20px x-padding, 16px with icon ·
  `rounded-md` (10px) · Lato 700 · `bg-brand-deep` → `bg-brand-deeper` hover.
- **Card** — `rounded-lg` (14px) · `border-border` 1px · `bg-card` · no
  shadow · 24px padding desktop / 16px mobile.
- **Status badge** — fully rounded pill, transparent fill, 1px border,
  `4px 10px` padding, colored leading icon, neutral-ink label text. Same
  icon+color mapping everywhere a status appears.
- **KPI card** (`components/dashboard/SectionCards.tsx`) — label (h-label) +
  optional tone-tinted icon chip (34px, desktop only) → Anton display value
  (`clamp(2rem,6cqi,2.75rem)`, tabular-nums) → muted footnote. Numeral always
  neutral ink; tone lives on the icon chip only. Hover: `-translate-y-0.5` +
  `border-brand/40`, 150ms.
- **Severity** — quiet text, never a badge (keeps a defect row to one pill).

## Resolved drift (2026-09-12 dashboard review)

All three findings from the initial review were fixed and verified against
a real production build (`npm run build`, grepped the compiled CSS chunk for
the resulting utility classes):

1. `AttentionStrip.tsx` `Segment` — count numeral is neutral ink again; tone
   moved to a leading `size-1.5 rounded-full` dot, matching
   `DefectSummary`'s `CELL[key].dot` convention. Glyph-Only Rule restored.
2. Motion tokens wired up — `ease-out-quart` mapped into `@theme inline`;
   all dashboard transitions use `duration-160`/`duration-220
   ease-out-quart` instead of generic Tailwind `duration-150`/`duration-200
   ease-out`.
3. `WeeklyCheckCard.tsx` `CheckCell` (`CELL_CLASS`) — added `min-h-10` so the
   single-tap "start check" control meets the touch-target size DESIGN.md
   promises.

No remaining open items from this pass.
