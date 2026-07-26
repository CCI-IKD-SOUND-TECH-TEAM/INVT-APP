/**
 * Email design tokens — the DESIGN.md palette as literal hex values.
 *
 * app/globals.css can't be reused here: email clients don't support CSS custom
 * properties, so every colour has to be inlined at the point of use. This file
 * is the single source for templates so the hex codes aren't scattered.
 *
 * Keep in sync with DESIGN.md §2 and the :root block in app/globals.css.
 */

export const color = {
  // Surface ladder (DESIGN.md "The Warehouse at Night")
  bg: "#000000",
  surface: "#121214",
  surfaceRaised: "#1a1a1d",
  surfaceSunken: "#0a0a0b",

  line: "#2a2a2e",
  lineSubtle: "#1e1e21",

  // Ink. ink-faint is #8a8a93, not DESIGN.md's original #6b6b72 — globals.css
  // raised it because #6b6b72 measured ~3.97:1 on black and failed WCAG AA.
  ink: "#f5f5f4",
  inkMuted: "#a3a3ac",
  inkFaint: "#8a8a93",

  // The one accent (DESIGN.md "The One Voice Rule")
  brand: "#ff3b3b",
  brandDeep: "#e62e2e",
  brandTint: "#2e1212",

  // Shared status vocabulary
  statusGood: "#34d399",
  statusInfo: "#60a5fa",
  statusCaution: "#f5a623",
  statusCritical: "#ff3b3b",
  statusNeutral: "#a3a3ac",

  white: "#ffffff",
} as const;

/**
 * Anton and Lato are loaded via next/font in the app, but email clients strip
 * @font-face — Gmail and Outlook will never render them. These stacks fall back
 * to the closest web-safe equivalents, matching the fallbacks DESIGN.md already
 * declares in its typography block.
 */
export const font = {
  display: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  body: "'Lato', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  full: "999px",
} as const;

/** Maps a defect severity to its status colour (DESIGN.md §2 semantic vocabulary). */
export function severityColor(severity: "Low" | "Medium" | "High"): string {
  if (severity === "High") return color.statusCritical;
  if (severity === "Medium") return color.statusCaution;
  return color.statusGood;
}
