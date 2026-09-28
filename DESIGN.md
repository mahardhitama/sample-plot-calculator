---
name: Sample Plot Calculator
description: The Survey Instrument — a calibration-bench web tool for CDM A/R sample-plot design.
colors:
  background: "#f7f6f2"
  foreground: "#20261f"
  card: "#f7f6f2"
  popover: "#fcfbf8"
  primary: "#235338"
  primary-foreground: "#f5f4ee"
  secondary: "#ebe9df"
  secondary-foreground: "#20261f"
  muted: "#edece5"
  muted-foreground: "#5f6659"
  accent: "#e3e9e3"
  accent-foreground: "#1b422c"
  destructive: "#b45309"
  border: "#d9d7cb"
  input: "#cfcbbd"
  ring: "#235338"
  bench: "#efede4"
  readout: "#f1efe7"
typography:
  display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "9px"
  lg: "12px"
  xl: "15px"
spacing:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
components:
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-icon-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    size: "28px"
  readout:
    backgroundColor: "{colors.readout}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  plate:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  alloc-bar:
    backgroundColor: "{colors.primary}"
    rounded: "1px"
    height: "8px"
    width: "proportional to nᵢ / max nᵢ"
  numeric-input:
    backgroundColor: "{colors.readout}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "36px"
---

# Design System: Sample Plot Calculator

## Overview

**Creative North Star: "The Survey Instrument"**

This calculator refuses the category default of neutral SaaS cards around a spreadsheet. It presents the entire calculation as one calibrated bench instrument: engraved tracked-uppercase labels, inset LCD readout windows, numerals locked to a registration grid. The interface itself argues the number is precise and auditable — every intermediate (weighted mean, E, weighted SD/variance, N, t) sits on display with its formula symbol, so a user with the Winrock xlsx open can reconcile both tools cell by cell.

The world is light, warm, and restrained. Depth is never simulated with drop shadows — plates sit on the bench separated by hairline rules, and the only shadows in the system are *inward*: the recessed readout wells and the allocation track. State is carried in line form — weight, dash, double rule, strike — never in hue alone. Color is rationed: spruce appears on primary actions, the headline total, and sorted-column headers; flag amber appears only where something is excluded or needs checking.

The one signature motion is the settling readout: on every recompute, numeric values ease once into place (260 ms, gravity-rain) and each Neyman allocation bar draws to its exact proportion. Values land; they never flicker.

**Key Characteristics:**

- Calibration-bench light theme: warm paper ground, ink-green foreground, one spruce accent, one flag amber.
- Space Grotesk for every word; Space Mono for every numeral, always `tabular-nums`.
- Engraved labels: 10px, weight 500, uppercase, 0.14em tracking, muted ink tint.
- Inset LCD readout windows (`--readout` fill + hairline bezel + inner shadow), never elevated cards.
- Zero drop shadows; depth = inset wells + hairline rules.
- Line-form state: dashed rules, double sum-rules, weight shifts — not hue alone.
- Allocation bars whose length is the exact quantity; rounded count engraved at the bar's end.
- Named phases in words ("EXCLUDED", "finite population correction"), never color-only status.

## Colors

A warm, desaturated instrument palette: paper-warm neutrals with a single deep spruce accent and a single amber flag. All neutrals carry a faint green-yellow cast (hue ~95–145) so nothing reads as cold gray.

### Primary
- **Spruce** (#235338): The one accent. Primary buttons and interactive affordances, the headline total-n numeral, sorted column headers, the allocation bar fill, focus rings (`--ring`), caret color, and hover text on ghost controls. It is rationed — if a screen is more than ~10% spruce, something is wrong.

### Secondary
- **Instrument Wash** (#ebe9df, `secondary`): Flat fill for inset chips and toggle surfaces that need to sit slightly below the bench tone without a shadow.

### Tertiary
- **Spruce Wash** (#e3e9e3, `accent`): Selection background and subtle spruce-tinted washes; pairs with **Deep Spruce** (#1b422c, `accent-foreground`) for text on the wash.

### Neutral
- **Bench Ground** (#f7f6f2, `background`/`card`): The bench itself. Cards and plates are the same value as the ground — they separate by hairline rule, not by tone step. The header bezel sits directly on this.
- **Ink** (#20261f, `foreground`): All reading text and primary numerals.
- **Recessed Well** (#efede4, `bench`): The tone *below* the bench — allocation tracks and any surface that must read as physically inset.
- **LCD Window** (#f1efe7, `readout`): Readout wells and readout-style inputs. Slightly cooler than the bench so inset windows register as glass.
- **Engraving Tint** (#5f6659, `muted-foreground`): Labels, captions, and secondary text — an ink tint, never gray.
- **Hairline Rule** (#d9d7cb, `border`): Every plate border, table rule, and bezel.
- **Hairline Deep** (#cfcbbd, `input`): Dashed rules, placeholder-grade strokes, scrollbars, and the darker edge of hairlines.
- **Bench Wash** (#edece5, `muted`): Flat hover/rest washes.
- **Plate Surface** (#fcfbf8, `popover`): Popovers only — the one surface lighter than the bench.
- **Paper on Spruce** (#f5f4ee, `primary-foreground`): Text on spruce fills.

### Flag
- **Flag Amber** (#b45309, `destructive`): Warnings and excluded state — the alert plate border, the EXCLUDED tag, remove-hover, error text. It signals "check this", never decoration.

### Token-only dark phase
`src/app.css` also ships a complete `.dark` token set (ground #171a16, ink #e8e9e2, spruce #7fb08e, amber #d99a4e, bench well #10130f, LCD #141710). It exists in code but is not the shipping default and no surface is designed against it; treat it as unexercised until a dark phase is scoped.

### Named Rules
**The One Accent Rule.** Spruce (#235338) and only spruce carries interactive meaning. Amber is a flag, not an accent — it never fills a primary action.

**The Ink Tint Rule.** Muted text is a tint of ink (#5f6659), never a neutral gray — the bench stays warm even in captions.

**The Rationed Accent Rule.** Spruce appears on ≤10% of any screen. Its rarity is what makes the headline total feel like the instrument's single lit display.

## Typography

**Display Font:** Space Grotesk (ui-sans-serif, system-ui fallback)
**Body Font:** Space Grotesk (same stack)
**Label/Mono Font:** Space Mono (ui-monospace, SFMono-Regular fallback) — all numerals

**Character:** Space Grotesk supplies a technical-but-human voice with slightly tightened tracking for titles (−0.02em); Space Mono locks every numeral to the registration grid. The pairing reads as instrument plate and LCD readout.

### Hierarchy
- **Display** (700, 16px/1rem, −0.02em): The product name on the bezel ID plate. Small and bold, like a stamped model number — not a marketing hero.
- **Headline** (Space Mono 700, 36px/2.25rem, tabular-nums): The headline total-n and post-round-up totals inside the readout panel. The largest, loudest glyphs on the bench.
- **Body** (400, 14px/0.875rem, 1.5): Descriptions, alerts, and column descriptions.
- **Readout values** (Space Mono 500/700, 14px/0.875rem, tabular-nums): Every computed value and table numeral.
- **Label — "engraved"** (Space Grotesk 500, 10px, 0.14em tracking, uppercase, #5f6659): Every field label, section title, column header base state, phase tag, and formula label.

### Named Rules
**The Numbers Are Mono Rule.** Every numeral on screen — inputs included — is Space Mono with `tabular-nums`. Nothing numeric is ever set in the sans.

**The Engraving Rule.** Labels are engraved: uppercase, 10px, weight 500, 0.14em tracking, ink tint. A label that looks like body text is a bug.

## Layout

One bench, no hero. A full-width instrument bezel (`header`, hairline bottom rule) holds the ID plate at left and file actions at right. Below, a single centered column (`max-w-6xl`, 24px side padding, 24px vertical rhythm) stacks: optional alert plate, the settings + readout row, the strata ledger, and the excluded-strata note.

The settings plate and the readout panel sit side by side in `lg:grid-cols-[1fr_340px]` — the readout rail is a fixed 340px instrument module; at narrower widths it stacks above the ledger. The strata ledger spans the full column width and scrolls horizontally (`overflow-x-auto`) rather than squeezing its grid.

Density is airy but disciplined: plates use 16px horizontal padding and 16px vertical, internal grids use 24px column gaps and 16px row gaps, readout wells sit on an 8px grid.

## Elevation & Depth

There are no drop shadows in this system. Plates sit on the bench separated by 1px hairline rules (#d9d7cb) — the separation is a line, not a shadow. The only depth cue is *inward*: surfaces that must read as physically recessed get a lighter fill plus an inset inner shadow.

### Shadow Vocabulary
- **Readout bezel** (`box-shadow: inset 0 1px 2px oklch(0.2 0.02 150 / 8%), inset 0 0 0 1px oklch(1 0 0 / 55%)`): The inner lip of every LCD window and readout-style input.
- **Alloc track well** (`box-shadow: inset 0 1px 2px oklch(0.2 0.02 150 / 10%)`): The recessed channel the allocation bar draws through.

### Named Rules
**The One Bench Rule.** Surfaces never float. If two regions need separation, use a hairline rule or an inset well — never a drop shadow.

## Shapes

Corners are gently radiused but the system's real form language is *ruled lines*. The base radius is 12px (`--radius: 0.75rem`; sm 6px, md 9px, lg 12px, xl 15px) applied to plates, buttons, and readout wells. Inside the ledger, geometry collapses to near-zero: allocation bars and their tracks are 1px-radius strips, and state is drawn as lines — a dashed bottom rule for excluded rows, a 3px double top rule for the ledger Total row, a dashed full-width border for the add-row affordance.

## Components

For each component: shape, color assignment, states, and distinctive behavior as built.

### Buttons (bezel panel actions)
- **Shape:** 9px radius (md), 32px tall, 12px horizontal padding, 14px Grotesk label with 14px Lucide icon.
- **Outline (Save / Open / Export CSV):** transparent/`--card` fill on the bench, hairline border, ink text; hover lifts text to spruce.
- **Ghost (Reset):** no border, muted-foreground text; hover lifts to spruce.
- **Icon ghost (row remove):** 28px square, trash icon in muted-foreground; hover turns flag amber — deletion is the one control that warms.
- **Focus:** 2px spruce outline offset 2px, globally via `:focus-visible`.

### Inputs / Fields
- **Settings readout inputs (NumericField):** full readout treatment — LCD fill, hairline bezel, inner lip, 36px tall, Space Mono tabular numerals, spruce caret. The label above is engraved. Disabled state drops to 50% opacity.
- **Ledger cells (Number/Text/Variance cells):** borderless and transparent at rest so the table reads as a ruled ledger; hairline border + bench fill appear only on hover/focus. Numeral cells are Space Mono 14px; the variance cell pairs its input with a CV%/SD mono toggle.

### Readout windows
- **LCD well (`.readout`):** `--readout` fill, hairline border, inset inner lip, 6px radius. Used for the headline total-n window (padding 12px 16px) and the 2-column stat windows (8px 12px), each carrying an engraved formula label ("Mean, t C/ha", "Error E, t C/ha", "Student's t").
- **Settling values (Readout):** numeric values tween once into place over 260 ms with an ease-out-expo curve on every recompute; non-numeric values render instantly. Null renders as an em-dash.

### Chips / Toggles
- **CV%/SD toggle:** small spruce-wash/ink segmented control, mono 12px labels — the only segmented element on the bench.
- **Phase tags:** engraved uppercase text in words ("EXCLUDED", "Awaiting valid settings and stratum data", "finite population correction"), amber only when flagged.

### Cards / Plates
- **Plate (`.plate`):** bench-value fill, 12px radius, 1px hairline border, 16px padding. Used for the settings card, readout panel, strata ledger, and alert plate (which adds a 40%-alpha amber border).
- **Alert plate:** engraved "CHECK" header in amber, 14px body list of issues.

### The Strata Ledger (signature component)
- **Header row:** engraved sortable labels; the sorted column turns spruce and grows an up/down arrow (unsorted shows a 40%-opacity both-ways arrow).
- **Rows:** mono tabular numerals on a strict column grid; computed columns (SD, CV, Weight) render an em-dash when excluded.
- **Excluded state (`.excluded-rule`):** the row carries a dashed hairline bottom rule and 85% opacity, and its allocation cell is replaced by an engraved amber EXCLUDED tag — state in line form and words, not hue alone.
- **Total row:** hand-ruled `sum-rule` — a 3px double top border, like a ledger sum line; mono bold total n.
- **Add row:** a full-width 36px dashed hairline button ("+ Add stratum") styled as the next blank ledger line; hover turns rule and label spruce.

### Neyman Allocation Cell (signature component)
- **Track:** 8px-high recessed well (`--bench` fill, inset inner lip, 1px radius).
- **Bar (`.alloc-bar`):** spruce fill, width = exact proportion of the row's nᵢ to the maximum nᵢ; draws over 260 ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Length is the quantity — the bar is never decorative.
- **Count:** the rounded per-stratum plot count in bold mono, engraved at the bar's end.

### Navigation
There is no navigation beyond the bezel's file actions (Save / Open / Export CSV / Reset) and the sortable ledger headers.

### Browser surfaces
The design ships with its browser chrome themed: spruce selection (spruce wash bg, deep spruce text), spruce caret, 2px-offset spruce focus-visible outline, and thin scrollbars colored with the hairline-deep tone on a transparent track.

## Do's and Don'ts

### Do:
- **Do** set every numeral in Space Mono with `tabular-nums`, at any size.
- **Do** engrave labels: uppercase, 10px, weight 500, 0.14em tracking, #5f6659.
- **Do** put computed values in inset `.readout` wells with their engraved formula label.
- **Do** carry state in line form — dashed rules, double rules, weight — and name the phase in words.
- **Do** draw allocation bars to exact proportion and animate width at 260 ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Do** theme browser surfaces (selection, caret, focus ring, scrollbars) with the spruce/hairline tokens.
- **Do** keep plates on the bench-value fill and separate them with 1px #d9d7cb hairlines.

### Don't:
- **Don't** use drop shadows. Depth is inset wells and hairlines only.
- **Don't** introduce any accent besides spruce and flag amber.
- **Don't** signal state with hue alone — pair color with a line form or a named phase tag.
- **Don't** set numerals in Space Grotesk, or use a proportional numeral anywhere in the ledger or readouts.
- **Don't** give plates an elevated "card" tone — card fill equals bench ground (#f7f6f2).
- **Don't** round corners below 1px on bars/rules or above the radius scale on plates; the form language is ruled lines with gentle corner radii.
