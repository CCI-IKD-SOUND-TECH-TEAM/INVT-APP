---
target: dashboard overview
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-07-04T11-40-41Z
slug: app-app-dashboard-page-tsx
---
# Critique — Dashboard overview (app/(app)/dashboard/page.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Defect summary is silently windowed to 30 days with no label |
| 2 | Match System / Real World | 4 | Plain, domain-fluent language ("Log a defect", "in flight") |
| 3 | User Control and Freedom | 3 | n/a for an overview; deep-links + nav cover it |
| 4 | Consistency and Standards | 3 | Two twin bar-widgets encode color differently (semantic vs neutral) |
| 5 | Error Prevention | 3 | Little to get wrong on a read-only overview |
| 6 | Recognition Rather Than Recall | 3 | Low-stock rows have no severity gradient — all amber |
| 7 | Flexibility and Efficiency | 2 | No date-range control, no keyboard shortcuts, "top 8" is fixed |
| 8 | Aesthetic and Minimalist Design | 3 | 4-color KPI chip row + 2 empty "0" defect rows add mild noise |
| 9 | Error Recovery | 3 | n/a — nothing to recover from here |
| 10 | Help and Documentation | 2 | No contextual help; hidden 30-day window is unexplained |
| **Total** | | **29/40** | **Good — solid foundation, targeted fixes** |

## Anti-Patterns Verdict
Not AI slop. Detector scan clean (exit 0, 0 findings). The design system is coherent and genuinely followed: true-black canvas, tonal surface steps, one accent spent with restraint. The deliberate choice to render category bars in neutral gray (not status colors) with an in-code rationale is a sophisticated, correct call most generators would get wrong.

## What's Working
- **One-voice discipline holds.** Red is reserved for "needs attention"; category magnitude is carried by bar length + value, not hue. This is restraint most dashboards fail.
- **KPI cards are real affordances**, not vanity tiles — each deep-links into a pre-filtered inventory view.
- **Domain-fluent copy.** "every asset, defect, and repair in flight" reads like a tool built for these five people, exactly the brief.

## Priority Issues

**[P1] Two "total assets" numbers on screen disagree (28 vs 26).**
The KPI reads Total Assets 28 ("excludes retired"); Assets by Category reads "26 total". `categoryData` is `.slice(0, 8)`, so any 9th+ category is silently dropped and its items vanish from the rollup. For non-technical staff whose success metric is literally "the system matches reality," two numbers that should match but don't — with no explanation — erodes trust in the whole tool.
Fix: either show all categories (or an "Other · N" row absorbing the tail) so the total reconciles, or label it "Top 8 categories" and match the count to the visible rows.

**[P1] The dashboard leads with the vanity metric, not the actionable one.**
The largest, brightest number is Total Assets (28) — a number nobody acts on. The things that need Sunday-morning action — 4 Defective, 7 Low Stock, 2 Open defects — are quieter and lower. The visual hierarchy is inverted relative to the job-to-be-done.
Fix: promote the actionable signals. Give Defective/Low-Stock more weight (ordering, size, or a compact "needs attention" banner), or reorder so the eye lands on what to act on first.

**[P2] Low-stock rows are uniformly amber — no severity gradient.**
"1 / 4" (25%, order now) and "3 / 10" (30%, order soon) render identically. When everything is amber, nothing is. Staff can't triage at a glance.
Fix: scale emphasis to how close to zero — critical (red) at/below ~⅓ of threshold or ≤1 remaining, caution (amber) otherwise; sort most-urgent first.

**[P2] The 30-day window on Defect Status Summary is invisible.**
Resolved and Not Repairable are silently time-boxed to 30 days (Open/Under Repair are not), and both render as empty "0" tracks. A user reading "Resolved 0" concludes nothing was ever fixed.
Fix: label the window ("last 30 days"), and render zero-rows more quietly or drop the empty bar so the widget doesn't show two dead tracks.

**[P3] The right rail is two near-identical bar lists; the left column leaves dead space.**
Defect Summary and Category Breakdown are both label+bar+number lists stacked together — they read as one widget shown twice. Meanwhile `items-start` leaves a tall black gap under the short left table.
Fix: differentiate the two widgets' form (e.g. defect status as segmented/stat row, category as bars), and let the columns balance in height.

## Persona Red Flags
**Alex (power user):** The 30-day window is hardcoded — no way to change the range. "Top 8" categories is fixed. No keyboard entry to Log-a-defect. He can't tune the one dashboard he stares at weekly.
**Sam (accessibility):** Defect Open vs Under Repair is distinguished by bar color with same-weight muted labels — close to color-only. Labels + numbers save it, but the differentiation leans visual. (Focus states and contrast from the design system are otherwise strong.)
**Riley (stress tester):** Immediately spots 28≠26. Adds a 9th category and watches items disappear from the rollup with no warning. Files a bug.

## Minor Observations
- Green "Active Assets" chip is decorative — "Active" isn't an alert state; the green competes with the meaningful red/amber chips.
- Four differently-colored icon chips make the KPI row the most colorful band on the page, slightly against "confidence through restraint."
- `DefectSummary` bars animate width on mount every navigation; fine, but verify a reduced-motion path.

## Questions to Consider
- What's the ONE thing a staffer should see and act on within 3 seconds of opening this? Does the current hierarchy point there?
- If Total Assets and "26 total" must both exist, how does the tool prove to a skeptical volunteer that both are right?
- Would this dashboard survive a quarterly spot-check where someone counts shelves against the screen?
