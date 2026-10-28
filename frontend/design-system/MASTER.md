# BioData — Design System (Master)

Source of truth for the frontend's look and behaviour. Generated with the UI UX Pro Max
skill (`--design-system`, variance 4 / motion 3 / density 7) and adapted to the existing
green brand. Page-specific deviations go in `pages/<page>.md` and override this file.

Tokens live in `src/index.css` (`@theme` for light, `.dark` for dark).

## Style — Aurora Glass

- **Everywhere:** frosted glass panels (`glass` utility: translucent fill, 18px backdrop blur,
  hairline border, top highlight) floating over a slowly drifting aurora (`AuroraBackground`,
  green / lime / teal glows). The brand gradient (`--gradient-primary`) marks primary actions,
  icon tiles and the active nav indicator, with a soft `--color-glow` shadow.
- **App pages:** data-first layout on glass: KPI row → charts → tables. Floating sidebar and
  mobile tab bar. Popovers, dropdowns and inputs stay solid (`bg-surface`) for legibility.
- **Landing:** Enterprise Gateway. Mission hero, role split, trust signals (CRE, GBIF, IUCN).
- Avoid: glass on top of glass, glass for dropdowns/inputs, glows behind text, low-contrast grey text.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F2F7F3` | `#060D09` | Page background under the aurora |
| `surface` | `#FFFFFF` | `#101A14` | Solid layers: inputs, dropdowns, popovers |
| `--glass-bg` | `rgba(255,255,255,.66)` | `rgba(16,28,21,.58)` | Cards, sidebar, panels (via `glass`) |
| `surface-muted` | `rgba(15,31,23,.045)` | `rgba(255,255,255,.045)` | Table header, hover rows, wells |
| `fg` | `#0F1F17` | `#EEF4EF` | Primary text (16 : 1) |
| `fg-muted` | `#4B5B52` | `#A6B8AC` | Secondary text (7 : 1) |
| `fg-subtle` | `#5F6E65` | `#8A9E92` | Meta text, placeholders, icons (≥ 4.5 : 1) |
| `line` / `line-strong` | 9% / 20% ink | 8% / 16% white | Borders |
| `primary` / `on-primary` | `#0B5D1E` / white | `#4CC596` / `#052707` | Primary actions, active nav (8 : 1) |
| `--gradient-primary` | `#064E1A → #0F7A2C` | `#4CC596 → #9EF01A` | Primary buttons, icon tiles, avatar |
| `primary-soft` | 10% green | 14% green | Active/selected tint |
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
- Radius: controls 12px (`rounded-xl`), cards and panels 16px (`rounded-2xl`), auth cards 24px,
  pills only for badges/chips.
- Elevation: `glass` for panels (its own shadow); `lift` for clickable cards; `shadow-overlay`
  for popovers and dialogs.

## Components

- **Button:** `primary` (gradient + glow) · `secondary` (translucent) · `ghost` · `danger`;
  `md` 40px, `lg` 48px; press scales to 0.97.
- **Input / Select / Search:** 40px, `border-line`, 2px `ring` on focus, label above,
  helper/error below linked via `aria-describedby`.
- **Table:** `surface-muted` header, 40px rows (`px-4 py-2.5` cells), hover tint, numeric columns right-aligned
  and `tabular-nums`, wrapped in `overflow-x-auto`.
- **StatCard:** glass, small muted label above a large count-up value (`CountUp`); icon in a
  gradient tile.
- **Sidebar:** floating glass panel; the active item is a `primary-soft` pill that slides between
  items (framer `layoutId`) with a glowing gradient bar.
- **Loading:** skeleton blocks (`animate-pulse bg-mist-100`) for lists; spinner only for full-page.

## Motion (lively)

- Page change: content fades up 10px (350ms). Lists and tables: `stagger-in` (rows rise 8px,
  40ms apart). KPI numbers count up. Clickable cards `lift` with a glow. Nav indicator springs.
- Ambient: the aurora drifts over 26–38s; landing hero has a three.js relief.
- `MotionConfig reducedMotion="user"` at the root, a global `prefers-reduced-motion` CSS override,
  and `useReducedMotion` checks for scroll-linked and imperative animations.

## Accessibility checklist

- [ ] Text contrast ≥ 4.5 : 1 in both themes
- [ ] Visible focus ring on every interactive element
- [ ] `cursor-pointer` on clickable elements
- [ ] Inline errors with `aria-describedby`; long forms get a focusable error summary
- [ ] Decorative icons `aria-hidden`; icon-only buttons have `aria-label`
- [ ] Tables scroll horizontally on mobile
- [ ] Checked at 375 / 768 / 1024 / 1440 px
