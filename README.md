# CCI Ikorodu Inventory

An inventory management system for tracking physical church assets — sound, light, and projection equipment — across departments at CCI Ikorodu. It captures every asset's lifecycle end-to-end (Available → In Use → Defective → Under Repair → Retired), logs and resolves defects with a full repair history, flags low stock before it becomes a Sunday-morning problem, and keeps an audit trail so every change traces back to a person and a time.

Built for five trusted, non-technical staff who all hold identical full access. The interface is meant to be self-explanatory — no training document required.

> **Status: prototype.** All data is seeded in memory and resets on reload. There is no backend, database, or real authentication yet — see [Current limitations](#current-limitations).

## Features

- **Dashboard** — at-a-glance counts, category breakdown, defect summary, and an attention strip for items needing action.
- **Inventory** — browse, add, and edit assets; retire and reactivate items with confirmation on consequential actions.
- **Defects** — log a defect the moment it's noticed, start a repair, and close it out with a tracked repair history.
- **Reports** — pull accountability views for weekly check-ins and quarterly spot-checks.
- **Settings** — manage users, departments, and categories.
- **Audit trail** — every create, edit, retire, and repair status change is recorded.

Consistent, color-coded status badges are used identically everywhere so item and defect states are always scannable. The layout is responsive down to a 375px mobile viewport.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4** with **[shadcn/ui](https://ui.shadcn.com)** (Radix primitives)
- **[Recharts](https://recharts.org)** for data visualization
- **date-fns**, **Tabler** / **Heroicons**

State lives in a React context store ([lib/store.tsx](lib/store.tsx)) seeded from mock data ([lib/mock-data.ts](lib/mock-data.ts)).

## Getting started

Requires Node.js 18+ (Node 24 LTS recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Any credentials work at the login screen — auth is mocked.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with `--fix` |

## Project structure

```
app/
  (app)/            Authenticated shell — dashboard, inventory, defects, reports, settings
  login/            Mock sign-in
  layout.tsx        Root layout + fonts
components/
  ui/               shadcn/ui primitives
  dashboard/        Dashboard sections (cards, breakdowns, attention strip)
lib/
  store.tsx         In-memory data store (context + mutations)
  mock-data.ts      Seed data
  types.ts          Domain model (items, defects, audit, statuses)
hooks/              Shared React hooks
```

## Design

Dark-mode, warm-and-confident internal ops tooling — decisive display type (Anton) and a single deliberate accent (`#FF3B3B`), with everything else kept quiet so status and data lead. The full design language, color tokens, and typography scale live in [DESIGN.md](DESIGN.md); product goals, users, and principles in [PRODUCT.md](PRODUCT.md).

## Current limitations

This is an MVP prototype. Not yet implemented:

- **Persistence** — data is in-memory only and resets on reload.
- **Backend / database** — no server-side storage; the domain types in [lib/types.ts](lib/types.ts) mark prototype-only fields that won't map to a future DB schema.
- **Real authentication** — the login screen accepts anything.
- **Image upload** — item images are placeholders.
