# Biodiversity Platform — Frontend

React 19 + TypeScript + Vite, Tailwind v4, TanStack Query, React Router (data router with layout routes, lazy-loaded pages).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL (inlined at build time) |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `tsc -b` + production build |
| `npm run typecheck` | `tsc -b` only (a bare `tsc --noEmit` checks nothing in this project layout) |
| `npm run lint` | oxlint |
| `npm test` | Vitest + React Testing Library |
| `npm run gen:api` | Regenerate `src/types/api.d.ts` from the running backend's OpenAPI schema |

## Structure

- `src/router.tsx` — all routes. `ProtectedRoute` → `AppLayout` (shell, title from route `handle.title`) → pages; `AdminRoute` guards admin pages.
- `src/features/<name>/` — pages, components, services and types per feature.
- `src/components/ui` — shared primitives (Modal, ConfirmDialog, Alert, Select, SearchInput, Combobox…).
- `src/lib` — `iucn.ts` (categories/colours), `errors.ts` (`getErrorMessage`), `download.ts`, `queryKeys.ts`, `constants.ts` (routes and URL helpers).
- `src/types/api.d.ts` — generated; run `npm run gen:api` after backend schema changes (types in `features/*/types.ts` are still hand-written).

## Conventions

- Server data goes through TanStack Query with keys from `lib/queryKeys.ts`; the cache is cleared on sign-out and session expiry.
- The species list is a single page whose filters live in the URL, e.g. `/species?site_id=3&iucn_status=CR,EN,VU`.
- Use `ConfirmDialog` instead of `window.confirm`, and `getErrorMessage` for any caught error.
- Static images live in `public/assets/`.
