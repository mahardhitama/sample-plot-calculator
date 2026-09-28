---
name: Sample Plot Calculator
description: Stock shadcn-svelte "sera" UI — an editorial, typographic calculator for CDM A/R sample-plot design.
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
    fontFamily: "'Playfair Display Variable', serif"
    usage: "Card titles, dialog titles — sera's editorial heading voice (uppercase, tracking-wide, semibold)."
  body:
    fontFamily: "'Noto Sans Variable', sans-serif"
    usage: "All UI text and numerals; numerals keep tabular-nums for alignment."
---

# Design: Sample Plot Calculator

## Overview

The UI is **stock shadcn-svelte with the "sera" style** — no custom design system.
Sera is the editorial, typographic preset from the shadcn-svelte registry
(base color **taupe**, OKLCH tokens): warm near-white surfaces, restrained
taupe-brown neutrals, Playfair Display headings, Noto Sans body, and controls
that speak in uppercase tracked type — buttons, labels, table heads, and badges
render `text-xs font-semibold uppercase tracking-wide` by default. Inputs are
underline-style (`border-b` on transparent fill), not boxes.

The app layer adds nothing visual on top except Tailwind utility classes in
components. All theme values, fonts, and primitives come from the registry
through the CLI (see "Generator workflow"). If a screen doesn't look like
sera, that's a bug.

**History:** an earlier custom system ("The Survey Instrument" — Space
Grotesk/Space Mono, engraved labels, inset readout wells, hairline plates) was
removed in September 2026 in favor of stock sera. Git history preserves it.

## Where the design lives

- `src/app.css` — the entire theme: five `@import` lines (tailwindcss,
  tw-animate-css, `shadcn-svelte/tailwind.css`, and the two fontsource-variable
  font packages), one `@theme` block, `:root`/`.dark` OKLCH variable sets, and a
  two-rule `@layer base`. **Do not hand-edit the theme values** — regenerate
  through the CLI (below) so the file stays byte-comparable with the registry.
- `components.json` — `style: "sera"`, `tailwind.baseColor: "taupe"`,
  `iconLibrary: "lucide"`. The CLI reads this.
- `src/lib/components/ui/` — generated shadcn-svelte primitives (badge, button,
  card, input, label, native-select, switch, table, toggle, toggle-group).
  Generated code: prefer wrapping over modifying; re-add rather than patch.

## Generator workflow

The theme and primitives come from `shadcn-svelte` (devDependency, v1.7.x):

```sh
# re-apply the sera preset (theme + config + fonts); sera's preset code:
npx shadcn-svelte apply b4pl3te13o --yes

# regenerate one or more primitives from the sera registry:
npx shadcn-svelte add button card --yes --overwrite
```

`apply` accepts the preset's short code (shown in the shadcn-svelte preset
picker); named presets are chosen interactively. Registry source of truth:
`https://shadcn-svelte.com/init?preset=b4pl3te13o` (theme vars) and
`/registry/styles/sera/<item>.json` (components).

## App-layer conventions

These are the only rules the application components add on top of stock sera:

- **Primitives un-styled.** Components pass layout utilities only (`w-24`,
  `text-right`, `flex` wrappers). Never override a primitive's color, radius,
  or typography tokens — that is what "stock" means here.
- **Numerals** render in Noto Sans with `tabular-nums` (stat readouts, numeric
  inputs, allocation counts, aligned table cells). No monospace font anywhere.
- **State is stock shadcn vocabulary**: excluded strata are a muted row
  (`bg-muted/40 text-muted-foreground`) plus a `Badge variant="destructive"`;
  the alert banner is `border-destructive/50` with an uppercase destructive
  label; inline feedback is `text-primary` / `text-destructive` on
  `text-muted-foreground` captions.
- **Composite patterns** follow shadcn defaults: results headline is
  `text-4xl font-bold tabular-nums` over `text-sm text-muted-foreground`
  captions; dialogs use the standard overlay (`bg-black/50`) + centered
  `rounded-xl border bg-background p-6 shadow-lg` card; dashed drop-zones and
  the add-row affordance are `rounded-md border border-dashed` with
  `hover:border-primary hover:text-primary`.
- **Motion** is the settling readout: numeric values tween once into place
  (260 ms, ease-out-expo) on recompute (`Readout.svelte`); the Neyman bar
  width transitions (`transition-all`). No other animation.

## Dark mode

Sera ships a complete `.dark` token set in `src/app.css`, but the app has no
theme switcher and no surface is designed against it. Do not design for dark
until a toggle is scoped.
