# Product

## Register

product

## Users

Five trusted, non-technical church staff (CCI Ikorodu) responsible for managing physical assets — sound, light, and projection equipment — across departments. All five hold identical, full access; there is no admin/standard tier. They use the system in short, task-focused bursts throughout the week: adding a newly acquired item, logging a defect the moment they notice it, starting or closing out a repair, checking what's low on stock before a service. Periodically (weekly check-ins, quarterly spot-checks) they pull reports for accountability. They are not IT staff — the interface must be self-explanatory with no training document required.

## Product Purpose

Centralize an inventory that currently lives nowhere reliable (paper, memory, scattered spreadsheets) into one system: track every asset's status end-to-end (Available → In Use → Defective → Under Repair → Retired), log and resolve defects with a full repair history, flag low stock before it becomes a Sunday-morning problem, and keep an immutable audit trail so any change is traceable to a person and a time. Success looks like: 100% of physical assets captured within 30 days of go-live, defects always matched to a logged record, and quarterly spot-checks confirming the system matches reality.

## Brand Personality

Warm and confident. This is internal ops tooling, not a consumer app or a corporate SAP relic — it should feel like a tool built *for* the people using it, not imposed on them. Confidence comes from decisive typography (a bold display face) and a single, deliberate accent color used with intent, not decoration. Warmth comes from plain language, generous spacing, and forgiving interactions — nothing punishes a non-technical user for a wrong click. Precise where it matters (status, numbers, audit history), relaxed everywhere else.

## Anti-references

No specific named anti-reference, but explicitly avoid:
- The generic dated enterprise/legacy-ERP look (dense gray toolbars, bevelled buttons, SAP-era admin chrome).
- Stock Bootstrap/AdminLTE admin-template genericness.
- Overly playful consumer-app treatment — this is still a work tool for volunteers managing real church property, not a lifestyle app.

## Design Principles

1. **Practical clarity over decoration.** Every screen serves one concrete task — log an item, resolve a defect, pull a report. Density and legibility win over ornamentation; nothing is on a screen "for design's sake."
2. **Confidence through restraint.** The accent color and display type carry the brand's personality. Everywhere else stays quiet so status and data lead — the one-voice rule, not a rainbow of emphasis.
3. **Status is always legible.** Item and defect states (Available, In Use, Defective, Under Repair, Retired, Open, Resolved…) must be instantly scannable via a consistent, color-coded badge language used identically everywhere.
4. **Built for trusted non-technical users.** No jargon, generous touch targets, forgiving interactions. Consequential actions (retire an item, mark a defect not repairable) get a confirmation step; nothing destructive happens in one click.
5. **Accountability by design.** The audit trail and repair history are first-class surfaces, not an afterthought buried in Settings — every action should feel traceable back to a person and a moment.

## Accessibility & Inclusion

Standard WCAG AA: body text ≥4.5:1 contrast against the black background (this rules out low-opacity gray-on-black as a default body color), full keyboard navigability, visible focus states, and a responsive layout that holds down to a 375px mobile viewport per the PRD's usability requirement. Reduced-motion alternatives on every animation.
