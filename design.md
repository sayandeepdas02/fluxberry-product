# Fluxberry Design System

This document is the design backbone of the Fluxberry product. Every page, component, and pixel pushed to this codebase must conform to the rules, scales, and patterns documented here. Treat it as the voice of a resident design engineer — always present, always enforcing.

Reference implementation lives in `frontend/`. Key files: `tailwind.config.ts` (all tokens), `app/globals.css` (CSS custom properties + utility layer), `components/ui/` (26 primitives), `components/marketing/` (ruled-paper system).

---

## 1. Foundations

### 1.1 Typeface

**Geist** by Vercel — the only typeface family in the product.

| Family | CSS variable | Tailwind class | Fallback |
|---|---|---|---|
| Geist Sans | `--font-geist-sans` | `font-sans` | `ui-sans-serif, system-ui, sans-serif` |
| Geist Mono | `--font-geist-mono` | `font-mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` |

Loaded via `geist/font/sans` and `geist/font/mono` in `app/layout.tsx`. Applied as CSS variable classes on `<html>`.

OpenType features on `<body>`: `font-feature-settings: 'cv11', 'ss01'; text-rendering: optimizeLegibility;`

**Rules:**
- Never add a third typeface. If you need visual contrast, use Geist Mono.
- Never use font-weight 700 (bold) on marketing pages. Marketing headings are weight **500** (medium) — the restraint is the whole look.
- Dashboard headings are weight **600** (semibold). Dashboard body is **400** (regular).

### 1.2 Color System

The product has two color worlds that never mix:

**Dashboard** — HSL custom properties, light/dark aware, consumed via `hsl(var(--token))`. Class-based dark mode (`darkMode: ['class']`).

**Marketing** — flat hex tokens (`berry-*`, `ink-*`), light-only, no dark mode.

#### Dashboard Palette

| Token | Light (HSL) | Dark (HSL) | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `222 47% 7%` | Page surface |
| `--foreground` | `222 47% 11%` | `210 40% 96%` | Body text |
| `--card` | `0 0% 100%` | `222 47% 9%` | Card/panel surface |
| `--primary` | `330 81% 60%` | `330 80% 62%` | Brand pink, CTAs, focus rings |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Text on primary |
| `--secondary` | `210 40% 96%` | `217 33% 17%` | Secondary surface, active nav |
| `--muted` | `210 40% 98%` | `217 33% 15%` | Muted backgrounds |
| `--muted-foreground` | `215 16% 47%` | `215 20% 65%` | Secondary text, placeholders |
| `--accent` | `210 40% 96%` | `217 33% 17%` | Hover highlight |
| `--destructive` | `0 72% 51%` | `0 63% 45%` | Error, danger |
| `--success` | `142 71% 39%` | `142 71% 45%` | Success states |
| `--warning` | `38 92% 50%` | `38 92% 55%` | Warning states |
| `--border` | `214 32% 91%` | `217 33% 20%` | All borders |
| `--input` | `214 32% 91%` | `217 33% 20%` | Input borders |
| `--ring` | `330 81% 60%` | `330 80% 62%` | Focus ring (matches primary) |
| `--radius` | `0.6rem` | `0.6rem` | Base border-radius |

**Rules:**
- Semantic badges use 10% opacity tints: `bg-primary/10 text-primary`, `bg-success/10 text-success`, etc.
- Never use raw hex/rgb in dashboard code. Always reference the CSS custom property tokens.

#### Marketing Palette

**Berry scale** (brand pink):

| Token | Hex | Usage |
|---|---|---|
| `berry-50` | `#fdf2f8` | Kicker backgrounds, subtle fills |
| `berry-100` | `#fce7f3` | — |
| `berry-200` | `#fbcfe8` | Blockquote borders, announcement pill tags |
| `berry-400` | `#f472b6` | — |
| `berry-500` | `#ec4899` | Logo mark (top-left), list markers |
| `berry-600` | `#db2777` | CTA button background, auth button, icons |
| `berry-700` | `#be185d` | CTA button border, link color, micro labels, focus outline |
| `berry-900` | `#831843` | Link hover |

**Ink scale** (neutrals):

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#202020` | Primary heading text |
| `ink-secondary` | `#2a2a2a` | — |
| `ink-muted` | `#81838a` | H2 second line (the "consequence" line), muted headings |
| `ink-line` | `#f0f0f0` | Interior rules (lighter weight, between cells) |
| `ink-50` | `#fafafa` | Page backgrounds (auth shell, dotted surfaces) |
| `ink-100` | `#f2f2f2` | Hover states, code block backgrounds |
| `ink-200` | `#e8e8e8` | **Structural lines** — frame rails, section borders, header rule |
| `ink-300` | `#c4c4c4` | Crosshairs, dashed rules, corner marks |
| `ink-400` | `#7a7a7a` | Mono labels, counters, metadata |
| `ink-500` | `#6b6b6b` | Secondary body text |
| `ink-600` | `#646464` | Body text on marketing pages |

**The two-weight line system is critical:**
- `ink-200` for structural lines (borders that define sections and rails)
- `ink-line` for interior lines (the lighter rules between grid cells)
- Never swap them — it collapses the visual hierarchy.

---

## 2. Typography Scales

### 2.1 Dashboard Scale (role-named)

| Class | Size | Line-height | Weight | Tracking |
|---|---|---|---|---|
| `text-display` | 48px | 54px | 700 | -0.02em |
| `text-page-title` | 28px | 34px | 600 | -0.01em |
| `text-section-title` | 18px | 24px | 600 | — |
| `text-card-title` | 16px | 22px | 600 | — |
| `text-subtle-title` | 14px | 20px | 600 | — |
| `text-body-lg` | 17px | 26px | 400 | — |
| `text-body` | 14px | 22px | 400 | — |
| `text-body-sm` | 13px | 20px | 400 | — |
| `text-caption` | 12px | 16px | 500 | 0.01em |

Heading components (`components/ui/heading.tsx`):
- `<H1>` = `text-page-title` (h1)
- `<H2>` = `text-section-title` (h2)
- `<H3>` = `text-card-title` (h3)
- `<H4>` = `text-subtle-title` (h4)

**Rules:**
- Use the semantic name (`text-card-title`), never raw size (`text-base font-semibold`).
- `text-caption` is the smallest text anywhere in the dashboard. Never go below 12px.
- Metrics/numbers use `font-mono tabular-nums` for alignment.

### 2.2 Marketing Scale (mk-* prefix)

| Class | Size | Line-height | Weight | Tracking |
|---|---|---|---|---|
| `text-mk-hero` | clamp(40px, 5vw, 60px) | 1.04 | 500 | -0.032em |
| `text-mk-h1` | clamp(36px, 4vw, 48px) | 1.15 | 500 | -0.03em |
| `text-mk-h2` | clamp(32px, 3.35vw, 44px) | 1.14 | 500 | -0.045em |
| `text-mk-h3` | 28px | 1.3 | 500 | -0.01em |
| `text-mk-h4` | 24px | 1.3 | 500 | -0.03em |
| `text-mk-h5` | 20px | 1.25 | 500 | -0.025em |
| `text-mk-title` | 17px | 24px | 500 | — |
| `text-mk-lead` | 18px | 1.55 | 400 | -0.01em |
| `text-mk-body` | 16px | 24px | 400 | — |
| `text-mk-label` | 14px | 21px | 400 | — |
| `text-mk-nav` | 13px | 16px | 450 | — |
| `text-mk-meta` | 13px | 20px | 400 | — |
| `text-mk-micro` | 12px | 16px | 500 | 0.04em |

**Rules:**
- All marketing headings are weight **500**. Never use 600 or 700 on marketing pages.
- Tight negative tracking is essential — these headings breathe through letterspacing, not whitespace.
- Mono labels (counters, section numbers, panel headers) use `font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400`.

---

## 3. Ruled-Paper Design Language

The marketing pages use a "ruled notebook" metaphor. Every visual treatment comes from this mental model: ruled lines, crosshairs at intersections, corner marks on panels, hatched margins, dotted graph paper.

### 3.1 Structural Elements

**Rails** (`.mk-rails`): Vertical border lines at 24px from each edge, running the full height. They frame the content column like notebook margin lines.

**Sections** (`<Section>`): `border-x border-b border-ink-200 bg-white`, max-width 1200px, margin auto. No border-radius — ruled paper has square corners.

**Dividers** (`<Divider>`): Two variants:
- `line` — single horizontal rule with crosshairs at rail intersections
- `band` — 33px tall gap with two horizontal rules (top + bottom), two rail segments, four crosshairs, and hatched gutters

**Frame** (`<Frame>`): Outer wrapper, max-width 1248px (1200px content + 24px padding each side).

### 3.2 Decorative Marks

**Crosshairs** (`.mk-cross-tl/tr/bl/br`): 8x8px plus-signs at rule intersections. Color: `ink-300`. Built with pseudo-elements positioned to center on the intersection point. Also available as `<CrossMark>` SVG (9x9px, `currentColor`).

**Corner marks** (`.mk-corners > span`): 8x8px squares with `border: 1px solid ink-300; background: #fff` at each corner of a panel, offset to straddle the border.

**Diagonal hatch** (`.mk-hatch`): `repeating-linear-gradient(315deg, rgb(196 196 196/0.56) 0 1px, transparent 0 50%); background-size: 10px 10px`. Used in divider band gutters.

### 3.3 Surface Treatments

**Dotted surface** (`.mk-surface`): `radial-gradient(ink-200 1px, transparent 1px); background-size: 18px 18px` on `bg-ink-50`. Graph paper texture for mockup panels.

**Grid background** (`.mk-grid-bg`): 68px grid in `ink-200` at 55% opacity with a radial mask that fades edges. Used behind blog hero and auth pages.

**Dots pattern** (`.mk-dots`): Pink-tinted dot screen (`berry-700` at 15% opacity, 12px spacing) over a warm white background (`#fffcfd`) with a soft glow from below. Used in the closing CTA section.

**Gap-px grid trick**: Parent gets `bg-ink-line`, children get `bg-white`, parent has `gap-px`. The 1px gap exposes the parent background as ruled lines between cells. Used for footer columns, capability grids.

### 3.4 Line Rendering

All lines are CSS — no SVG for rules.

| Type | Color | Implementation |
|---|---|---|
| Structural border | `ink-200` (#e8e8e8) | `border-ink-200` |
| Interior rule | `ink-line` (#f0f0f0) | `border-ink-line` or gap-px trick |
| Dashed rule | `ink-300` (#c4c4c4) | `.mk-dash-line`: `repeating-linear-gradient(to right, #c4c4c4 0 4px, transparent 4px 8px)` |
| Full-bleed dashed | `ink-300` | `.mk-screen-dashed-top/bottom`: pseudo-element, `width: 200vw; left: -100vw` |
| Vertical dashed | `ink-300` | `bg-[repeating-linear-gradient(to_bottom,#c4c4c4_0_4px,transparent_4px_8px)]` |

**Full-bleed mechanism** (`.mk-divider`): `position: relative; left: 50%; width: 100vw; transform: translateX(-50%)`.

---

## 4. Component Inventory

### 4.1 Dashboard Primitives (`components/ui/`)

All 26 components use `cn()` from `lib/utils.ts` for class merging. CVA (class-variance-authority) manages variants.

#### Button
- **Variants:** `default` (primary bg), `secondary`, `outline`, `ghost`, `destructive`, `link`
- **Sizes:** `default` (h-9 px-4), `sm` (h-8 px-3 text-xs), `lg` (h-11 px-6 text-base), `icon` (h-9 w-9)
- **Loading:** Replaces children with `<Loader2 className="animate-spin" />` + children
- **Base:** `rounded-md text-sm font-medium`, focus ring, `[&_svg]:size-4`

#### Input
- `h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm`
- Focus: `ring-2 ring-ring`
- Placeholder: `text-muted-foreground`

#### Card
- Surface: `rounded-xl border border-border bg-card`
- Header: `p-5`, Content: `p-5 pt-0`, Footer: `p-5 pt-0`
- Title: `text-card-title leading-none` (configurable as h2/h3/h4)

#### Badge
- **Variants:** `default`, `primary`, `success`, `warning`, `destructive`, `outline`, `muted`
- Pattern: 10% opacity tint backgrounds — `bg-primary/10 text-primary`
- Base: `rounded-full border px-2.5 py-0.5 text-xs font-medium`
- Warning special: `text-[hsl(32_80%_38%)]` (darker amber for readability)

#### Dialog
- Overlay: `bg-black/40 backdrop-blur-[1px]`
- Content: `max-w-lg rounded-xl border bg-card p-6 shadow-lg`
- Close: top-right X, `opacity-70 hover:opacity-100`

#### Sheet (large detail panel)
- Overlay: `bg-black/50 backdrop-blur-[1px]`
- Content: `max-w-4xl rounded-2xl border bg-card shadow-2xl`
- Header: `border-b px-6 py-4`, Body: `overflow-y-auto px-6 py-5`

#### Tabs
- List: `border-b border-border`
- Trigger: `border-b-2 border-transparent` → active: `border-primary text-foreground`
- Content: `mt-6`

#### Table
- Row: `border-b border-border hover:bg-muted/40`
- Head: `h-10 px-3 text-xs font-medium text-muted-foreground`
- Cell: `px-3 py-3`

#### Select / DropdownMenu / Popover
- All use `rounded-lg border bg-popover shadow-md`
- Item: `rounded-md text-sm`, focus: `bg-accent text-accent-foreground`

#### Empty State
- `rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center`
- Icon container: `rounded-full bg-background shadow-sm`

#### Metric Card
- Value: `font-mono text-2xl font-semibold tabular-nums`
- Label: `text-xs font-medium text-muted-foreground`

#### Skeleton
- `bg-muted` + shimmer gradient overlay, `animation: shimmer 1.4s infinite`

#### Kbd
- `h-[18px] min-w-[18px] rounded border bg-muted px-1 font-mono text-[10px]`

### 4.2 Marketing Primitives (`components/marketing/`)

#### MkButton (separate from dashboard Button)
- `rounded-[7px] text-[13px] font-normal leading-5`
- **Variants:** `cta` (berry-600 bg, berry-700 border), `secondary` (white bg, ink-200 border), `quiet` (transparent)
- **Sizes:** `sm` (h-9), `md` (h-[42px])
- Hover animation: chevron crossfades into arrow, 500ms transition, 3px translate

#### Kicker
- `rounded-[5px] bg-berry-50 px-2 py-[3px] text-mk-label text-berry-700`

#### EyebrowPill
- `rounded-[13px] border border-ink-200 bg-white px-3 py-[5px] text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(13,17,23,0.03)]`

#### AnnouncementPill
- Outer: `rounded-[20px] border border-ink-200 bg-white py-[5px] pl-1.5 pr-2.5 text-[13px] text-ink-600 hover:border-ink-400`
- Inner tag: `rounded-[14px] border border-berry-200 bg-berry-50 text-[11px] text-berry-700`

#### H2Split (two-tone heading)
- Lead line: `text-ink`
- Second line: `text-ink-muted` (#81838a)
- This gives headings a "statement → consequence" rhythm.

#### PanelHeader (mono label row)
- `font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400`
- `border-b border-ink-line pb-3`

#### Sup (counter superscript)
- `font-mono text-xs font-medium tracking-normal text-ink-400`, `top: -0.75em`
- Used as section counters: <Sup>01</Sup>, <Sup>02</Sup>, etc.

#### Pixel Icons
- Custom SVGs drawn as 1.5px squares on 16x16 grid
- `PixelChevronRight`, `PixelChevronDown`, `PixelArrowRight`, `CrossMark`

#### Logo
- `LogoMark`: 20x20 SVG, 2x2 grid of 9x9 squares (2px gap):
  - TL: berry-500, TR: berry-200, BL: berry-200, BR: berry-700
- `Logo`: LogoMark + wordmark at `text-[17px] font-semibold tracking-tight text-ink`

---

## 5. Layout Patterns

### 5.1 Dashboard Chrome

- **Shell:** `flex min-h-screen`
- **Sidebar:** `sticky top-0 h-screen w-60 border-r bg-background px-3 py-4`
  - Nav items: `rounded-md px-2.5 py-2 text-sm font-medium`
  - Active: `bg-secondary text-foreground`
  - Inactive: `text-muted-foreground hover:bg-accent`
  - Icon size: `size-4`
- **Content:** `min-w-0 flex-1 bg-muted/20`
- **Main:** `mx-auto max-w-6xl px-6 py-8`

### 5.2 Marketing Layout

- **Frame:** max-width 1248px, 24px inline padding
- **Section:** max-width 1200px (fits inside frame), `border-x border-b border-ink-200 bg-white`
- **SectionIntro:** `px-6 pb-14 pt-[72px] sm:px-8 lg:px-14`
- **Header:** `sticky top-0 z-50 border-b border-ink-200 bg-white`, h-16
- **Footer:** gap-px grid on `bg-ink-line`, `lg:grid-cols-[1.6fr_1fr_1fr_1fr]`

### 5.3 Auth Shell

- Background: `bg-ink-50`
- Header/footer: `border-b/t border-ink-200 bg-white`
- Grid background (`.mk-grid-bg`): 68px grid fading at edges
- Auth panel: 420px centered, `border border-ink-200 bg-white p-8 shadow-[0_1px_2px_rgba(13,17,23,0.03)]`
- Four `CrossMark` SVGs at panel corners
- Input: `h-10 rounded-[7px] border-ink-200 text-[14px]`
- Button: `h-[42px] rounded-[7px] border border-berry-700 bg-berry-600 text-[13px]`

---

## 6. Motion

### 6.1 Principles

- Default transition: `transition-colors` (for hover/focus state changes)
- Modal/popover: `duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]` (snappy spring)
- Marketing hover: `duration-500` (deliberate, not reactive)
- Always respect `prefers-reduced-motion` — use `motion-reduce:transition-none` or `@supports (animation-timeline: view())`

### 6.2 Animations

| Name | Keyframes | Duration | Usage |
|---|---|---|---|
| `fade-in` | opacity 0 → 1 | 0.15s ease-out | Mounting elements |
| `shimmer` | translateX(100%) | 1.4s infinite | Skeleton loading |
| `mk-reveal-up` | opacity 0 + translateY(12px) → opacity 1 + none | scroll-driven | Marketing section reveal on scroll |

**Scroll-driven reveal** (`.mk-reveal`): Uses native `animation-timeline: view()` API with `animation-range: entry entry 75%`. Progressive enhancement — no-ops on unsupported browsers.

**MkButton icon swap**: Chevron → arrow crossfade on hover, `transition-[opacity,transform] duration-500`, 3px translate.

**Header dropdown**: `origin-top`, closed: `opacity-0 scale-[0.985] -translate-y-1.5`, open: `opacity-100 scale-100 translate-y-0`.

---

## 7. Shadows

No formal shadow scale — shadows are intentionally minimal and used sparingly.

| Context | Value | Usage |
|---|---|---|
| Inputs, switches | `shadow-sm` | Subtle depth on interactive controls |
| Toasts, dropdowns, selects | `shadow-md` | Mid-level floating surfaces |
| Dialogs, popovers | `shadow-lg` | High-level overlays |
| Sheets (detail panels) | `shadow-2xl` | Maximum depth |
| Marketing auth panel | `0_1px_2px_rgba(13,17,23,0.03)` | Almost imperceptible lift |
| Marketing header dropdown | `0_12px_32px_-12px_rgba(13,17,23,0.16)` | Deep but tight spread |
| Marketing mockups | `0_1px_6px_rgba(13,17,23,0.04)` | Paper-like subtle shadow |

---

## 8. Focus States

**Dashboard:** `outline-none ring-2 ring-ring ring-offset-2 ring-offset-background` — pink ring with 2px offset from background.

**Marketing:** `.mk-focus:focus-visible` → `outline: 2px solid berry-700; outline-offset: 3px` — thicker offset for the looser marketing layout.

---

## 9. Border Radius

**Dashboard:** Token-based via `--radius: 0.6rem` (9.6px).
- `rounded-lg` = `var(--radius)` = 9.6px
- `rounded-md` = `calc(var(--radius) - 2px)` = 7.6px
- `rounded-sm` = `calc(var(--radius) - 4px)` = 5.6px

**Marketing:** Explicit values per component:
- Buttons: `rounded-[7px]`
- Pills: `rounded-[5px]` to `rounded-[20px]`
- Header dropdown: `rounded-[18px]`
- Sections: **no radius** — square corners are essential to the ruled-paper look

---

## 10. Retina Hairlines

Custom Tailwind variant `retina:` targets `@media (min-resolution: 2dppx)`.

Use as `retina:border-[0.5px]` for hairline borders that only render on 2x displays (prevents sub-pixel aliasing on 1x). Used in blog inline code, some marketing details.

---

## 11. Blog Prose Styling

The blog uses a custom ReactMarkdown component map (`components/marketing/blog/prose.tsx`):

| Element | Style |
|---|---|
| Body | `text-[18px] leading-[30px] text-ink-600` |
| h2 | `text-mk-h4 text-ink`, `mb-4 mt-11` |
| h3 | `text-[22px] font-medium tracking-[-0.5px] text-ink` |
| Links | `text-berry-700 underline underline-offset-2 hover:text-berry-900` |
| Blockquote | `border-l-2 border-berry-200 pl-6 text-[20px] text-ink` |
| Inline code | `rounded-[4px] border border-ink-200 bg-ink-100/60 px-1 font-mono text-[14px] retina:border-[0.5px]` |
| Code block | `border border-ink-200 bg-ink-50 p-4` |
| Table | `border border-ink-200`, thead `bg-ink-100`, td `border-b border-ink-line` |
| UL markers | `marker:text-berry-500` |
| OL markers | `marker:text-ink-400` |

---

## 12. Utilities

### cn() — Class Merge Helper

```ts
import { cn } from '@/lib/utils';
```

Wraps `clsx` + `tailwind-merge` with an extended config that knows about all custom font-size classes (both `text-card-title` and `text-mk-hero` families). This prevents `twMerge` from conflicting custom size classes with color classes.

**Always use `cn()` for conditional class composition.** Never concatenate class strings manually.

---

## 13. Enforcement Rules

These rules are non-negotiable. Every PR must pass them.

### General
1. **No new typefaces.** Geist Sans and Geist Mono only.
2. **No inline styles.** Everything goes through Tailwind utilities or CSS custom properties.
3. **No raw color values in TSX.** Dashboard uses `hsl(var(--token))`. Marketing uses `berry-*` / `ink-*` tokens.
4. **No `!important`.** If you need specificity, restructure the component.
5. **Use `cn()` for all conditional classes.** Never template-literal class strings.

### Dashboard
6. **Use semantic type classes** (`text-card-title`, not `text-base font-semibold`).
7. **Use the `<H1>`-`<H4>` heading components** from `components/ui/heading.tsx`.
8. **Badge variants for status.** Use `primary/success/warning/destructive` badge variants, never custom background colors.
9. **Minimum text size: 12px** (`text-caption`).
10. **Numbers are mono.** All numeric values use `font-mono tabular-nums`.

### Marketing
11. **Headings are weight 500.** Never bold on marketing pages.
12. **Sections have square corners.** Never `rounded-*` on ruled-paper sections.
13. **Two-weight line system.** `ink-200` for structure, `ink-line` for interior. Never swap.
14. **Crosshairs at intersections.** Where a horizontal rule meets a vertical rail, place a crosshair mark.
15. **Respect scroll motion.** Use `.mk-reveal` for entrance animations. Respect `prefers-reduced-motion`.
16. **Auth inputs use marketing tokens** (`rounded-[7px] border-ink-200`), not dashboard Input component.

### New Components
17. **Check `components/ui/` first.** Never build a button, input, card, dialog, badge, or table from scratch.
18. **Marketing components go in `components/marketing/`.** Never mix marketing primitives into the dashboard.
19. **Follow the provider pattern.** Variants via CVA, forwarded refs, `cn()` for class merging, `asChild` via Radix Slot where appropriate.

### Spacing
20. **Dashboard content area:** `max-w-6xl px-6 py-8`.
21. **Marketing section intro:** `px-6 pb-14 pt-[72px] sm:px-8 lg:px-14`.
22. **Card internals:** `p-5`, content/footer `pt-0` to share the header's padding.

---

## 14. Quick Reference: File Map

| Path | What |
|---|---|
| `frontend/tailwind.config.ts` | All design tokens — colors, typography, animations, plugins |
| `frontend/app/globals.css` | CSS custom properties, mk-* utility layer, base styles |
| `frontend/lib/utils.ts` | `cn()` with extended twMerge config |
| `frontend/components/ui/` | 26 dashboard primitives (Button, Card, Dialog, Table, etc.) |
| `frontend/components/marketing/` | Ruled-paper system (Frame, Section, Divider, MkButton, etc.) |
| `frontend/components/marketing/landing/` | Landing page sections |
| `frontend/components/marketing/blog/` | Blog components (Prose, PostCard, TocMinimap, etc.) |
| `frontend/components/marketing/auth-shell.tsx` | Auth page chrome |
| `frontend/components/layout/sidebar.tsx` | Dashboard sidebar |
| `frontend/components/layout/dashboard-shell.tsx` | Dashboard chrome |
