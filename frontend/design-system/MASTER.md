# BioData — Design System (Master)

Source of truth for the frontend's look and behaviour. Generated with the UI UX Pro Max
skill (`--design-system`, variance 4 / motion 3 / density 7) and adapted to the existing
green brand. Page-specific deviations go in `pages/<page>.md` and override this file.

Tokens live in `src/index.css` (`@theme` for light, `.dark` for dark).

## Style

- **App pages:** Data-Dense Dashboard. Border-first separation, flat surfaces, shadows only
  on overlays (modals, dropdowns, popovers). KPI row → charts → tables.
- **Landing:** Enterprise Gateway. Mission hero, role split, trust signals (CRE, GBIF, IUCN).
- Avoid: ornate decoration on data pages, ambient looping motion, low-contrast grey text.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F7FAF7` | `#0D1410` | Page background |
| `surface` | `#FFFFFF` | `#121B15` | Cards, sidebar, header, inputs |
| `surface-muted` | `#F0F5F1` | `#16211A` | Table header, hover rows, wells |
| `fg` | `#0F1F17` | `#EEF4EF` | Primary text (16 : 1) |
| `fg-muted` | `#4B5B52` | `#9DB0A3` | Secondary text (7 : 1) |
| `fg-subtle` | `#5F6E65` | `#7F9488` | Meta text, placeholders, icons (≥ 4.5 : 1) |
| `line` / `line-strong` | `#E2EBE4` / `#C9D8CD` | `#223228` / `#2F4638` | Borders |
| `primary` / `on-primary` | `#0B5D1E` / white | `#4CC596` / `#052707` | Primary actions, active nav (8 : 1) |
| `primary-soft` | `#E6F2E8` | `#17301F` | Active/selected tint |
| `link` | `#0F7A2C` | `#4CC596` | Links, focus ring |
| `accent` / `accent-fg` | `#D97706` / `#B45309` | `#F59E0B` | Needs-review, highlights |
| `danger` | `#DC2626` | `#F87171` | Destructive actions, errors |

- IUCN Red List colours (`src/lib/iucn.ts`, `Badge` `iucn-*` tones) are the official palette — never restyle them.
- Lichen `#9EF01A` is decorative only (selection, accents on dark green). It fails contrast on white.
- Never use opacity on `ink-950` for text below `/60`; use `fg-subtle` instead.

## Typography

- Body / UI: **Fira Sans** (400, 500, 600, 700).
- Data: **Fira Code** (`font-mono`) for IDs, coordinates, counts in tables.
- Display: **Montserrat** (600–800, `font-display`) for page and section headings only.
- Scale: 12 / 13 / 14 (UI default) / 16 / 20 / 24 / 30 / 36. Numbers use `tabular-nums`.
- Scientific names are always *italic*.

## Spacing, radius, elevation

- 4px base: 4 · 8 · 12 · 16 · 24 · 32 · 48. Grid gap 16px. Card padding 16px (20px ≥ lg).
- Radius: controls 8px (`rounded-lg`), cards 12px (`rounded-xl`), pills only for badges/chips.
- Elevation: `border-line` for cards; `shadow-overlay` only for floating layers.

## Components

- **Button:** `primary` · `secondary` · `ghost` · `danger`; `md` 40px, `lg` 48px.
- **Input / Select / Search:** 40px, `border-line`, 2px `ring` on focus, label above,
  helper/error below linked via `aria-describedby`.
- **Table:** `surface-muted` header, 40px rows (`px-4 py-2.5` cells), hover tint, numeric columns right-aligned
  and `tabular-nums`, wrapped in `overflow-x-auto`.
- **StatCard:** small muted label above a large tabular value; icon in a `primary-soft` tile.
- **Sidebar:** active item = `primary-soft` tint + 3px left bar in `primary`.
- **Loading:** skeleton blocks (`animate-pulse bg-mist-100`) for lists; spinner only for full-page.

## Motion

- Transitions 150–200ms ease-out on colour/border/shadow. Entrances ≤ 300ms, 8px rise.
- No looping ambient motion on app pages. `MotionConfig reducedMotion="user"` at the root and a
  global `prefers-reduced-motion` CSS override.

## Accessibility checklist

- [ ] Text contrast ≥ 4.5 : 1 in both themes
- [ ] Visible focus ring on every interactive element
- [ ] `cursor-pointer` on clickable elements
- [ ] Inline errors with `aria-describedby`; long forms get a focusable error summary
- [ ] Decorative icons `aria-hidden`; icon-only buttons have `aria-label`
- [ ] Tables scroll horizontally on mobile
- [ ] Checked at 375 / 768 / 1024 / 1440 px
