---
name: Sample Plot Calculator
description: shadcn-svelte "sera" components with Space Grotesk / Space Mono type — a typographic calculator for CDM A/R sample-plot design.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.147 0.004 49.3)"
  card: "oklch(1 0 0)"
  popover: "oklch(1 0 0)"
  primary: "oklch(0.214 0.009 43.1)"
  primary-foreground: "oklch(0.986 0.002 67.8)"
  secondary: "oklch(0.96 0.002 17.2)"
  secondary-foreground: "oklch(0.214 0.009 43.1)"
  muted: "oklch(0.96 0.002 17.2)"
  muted-foreground: "oklch(0.547 0.021 43.1)"
  accent: "oklch(0.96 0.002 17.2)"
  accent-foreground: "oklch(0.214 0.009 43.1)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0.005 34.3)"
  input: "oklch(0.922 0.005 34.3)"
  ring: "oklch(0.714 0.014 41.2)"
typography:
  display:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    usage: "All UI text, labels, and headings (sera's uppercase tracked control styling rides on Space Grotesk)."
  mono:
    fontFamily: "'Space Mono', ui-monospace, SFMono-Regular, monospace"
    usage: "Every numeral — inputs, readouts, computed cells — with tabular-nums."
---

# Design: Sample Plot Calculator

## Overview

The UI is **shadcn-svelte with the "sera" style** — stock components and
taupe OKLCH tokens — carrying a deliberate **Space Grotesk / Space Mono
type pairing** on top. Sera supplies the visual system: warm near-white
surfaces, restrained taupe-brown neutrals, and controls that speak in
uppercase tracked type (buttons, labels, table heads, badges all render
`text-xs font-semibold uppercase tracking-wide` by default); inputs are
underline-style (`border-b` on transparent fill). The fonts are the one
local override: **Space Grotesk for every word, Space Mono for every
numeral**, so the tool reads like a survey instrument while staying
byte-close to the registry everywhere else.

The app layer adds nothing visual beyond Tailwind utility classes. All
theme values, components, and fonts are declared in `src/app.css` /
`package.json` and flow from the shadcn-svelte setup (see "Generator
workflow").

**History:** an earlier custom system ("The Survey Instrument") was removed
in September 2026 in favor of stock sera; sera's Noto Sans / Playfair
Display fonts were then replaced with the original Space Grotesk / Space
Mono pairing. Git history preserves both states.

## Where the design lives

- `src/app.css` — the entire theme: `@import` lines (tailwindcss,
  tw-animate-css, `shadcn-svelte/tailwind.css`, and the @fontsource Space
  Grotesk / Space Mono packages), one `@theme` block (`--font-sans` and
  `--font-heading` = Space Grotesk, `--font-mono` = Space Mono),
  `:root`/`.dark` OKLCH variable sets from the sera registry, and a
  two-rule `@layer base`. **Do not hand-edit the color/radius values** —
  regenerate through the CLI (below) so those stay registry-faithful. The
  five font lines (imports + three `--font-*` entries) are the documented
  local exception; re-applying the preset reverts them.
- `components.json` — `style: "sera"`, `tailwind.baseColor: "taupe"`,
  `iconLibrary: "lucide"`. The CLI reads this.
- `src/lib/components/ui/` — generated shadcn-svelte primitives (badge,
  button, card, input, label, native-select, switch, table, toggle,
  toggle-group). Generated code: prefer wrapping over modifying; re-add
  rather than patch.

## Generator workflow

The theme and primitives come from `shadcn-svelte` (devDependency, v1.7.x):

```sh
# re-apply the sera preset (colors/config); sera's preset code:
npx shadcn-svelte apply b4pl3te13o --yes
# then restore the font lines in src/app.css and the @fontsource imports
# (the preset would otherwise set Noto Sans / Playfair Display)

# regenerate one or more primitives from the sera registry:
npx shadcn-svelte add button card --yes --overwrite
```

Registry source of truth: `https://shadcn-svelte.com/init?preset=b4pl3te13o`
(theme vars) and `/registry/styles/sera/<item>.json` (components).

## App-layer conventions

The only rules the application components add on top of sera:

- **Primitives un-styled.** Components pass layout utilities only (`w-24`,
  `text-right`, `flex` wrappers). Never override a primitive's color, radius,
  or typography tokens.
- **Numerals** — every number on screen (inputs, stat readouts, computed
  cells, allocation counts, footer totals) renders `font-mono tabular-nums`
  in Space Mono. Nothing numeric is set in the sans.
- **State is stock shadcn vocabulary**: excluded strata are a muted row
  (`bg-muted/40 text-muted-foreground`) plus a `Badge variant="destructive"`;
  the alert banner is `border-destructive/50` with an uppercase destructive
  label; inline feedback is `text-primary` / `text-destructive` on
  `text-muted-foreground` captions.
- **Composite patterns** follow shadcn defaults: results headline is
  `text-4xl font-bold` over `text-sm text-muted-foreground` captions; dialogs
  use the standard overlay (`bg-black/50`) + centered
  `rounded-xl border bg-background p-6 shadow-lg` card; dashed drop-zones
  and the add-row affordance are `rounded-md border border-dashed` with
  `hover:border-primary hover:text-primary`.
- **Motion** is the settling readout: numeric values tween once into place
  (260 ms, ease-out-expo) on recompute (`Readout.svelte`); the Neyman bar
  width transitions (`transition-all`). No other animation.

## Dark mode

Sera ships a complete `.dark` token set in `src/app.css`, but the app has no
theme switcher and no surface is designed against it. Do not design for dark
until a toggle is scoped.
