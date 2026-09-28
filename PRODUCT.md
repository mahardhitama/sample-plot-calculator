# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are carbon/forestry consultants and project developers designing CDM A/R (or similar VCS) project baselines and monitoring plans, plus researchers, students, and government staff doing sampling design for forest carbon inventories. They are numerate, methodology-literate users who already understand stratified sampling and need a trustworthy calculator, not an explanation of statistics.

## Product Purpose

Calculate the number of sample plots required to estimate terrestrial carbon stocks in stratified afforestation/reforestation projects to a target precision and confidence, implementing the CDM A/R Methodological Tool "Calculation of the number of sample plots for measurements within A/R CDM project activities" v2.1.0. Success means: a user can enter strata (area, mean carbon, variability), pick precision/confidence, and get a defensible plot count per stratum and in total — a number they would put in a PDD or monitoring plan.

## Positioning

A faithful, transparent web recreation of the Winrock Sample Plot Calculator (Walker, Pearson, Brown 2007/2014). Unlike a black-box calculator, it shows every intermediate value (weighted mean, E, weighted SD/variance, per-stratum allocation) exactly as the Excel tool and the CDM methodology do, so results can be audited against the spreadsheet and the methodological tool.

## Operating Context

Desktop browser, used beside Excel and the original Winrock spreadsheet — users will cross-check outputs against the xlsx. Autosaves to localStorage; exports JSON (project) and CSV (results). Inputs come from preliminary field data or literature (per-stratum mean and CV/SD).

## Capabilities and Constraints

- Core calculation only: total plots (with t-table iteration and finite-population correction), Neyman allocation per stratum, round-up with minimum 1 plot per stratum. No cost/time module.
- Confidence presets 80/90/95/98/99% matching the Excel; "custom" uses a fixed t without iteration.
- Per-stratum variability entered as CV% or SD; both shown as computed columns.
- Strata CRUD with validation; invalid strata are excluded from calculation and flagged.
- Stack: Svelte 5 + Vite SPA, Tailwind v4, shadcn-svelte stock components, TanStack Table v9. Fonts: Space Grotesk (text) and Space Mono (numbers) are binding user commitments.
- Terminology follows the CDM tool: strata, A/A_i, AP, N/N_i, E, n/n_i, Neyman allocation.

## Brand Commitments

Fonts are the only binding visual constraints: Space Grotesk for text, Space Mono for numbers. No logo or other brand material exists.

## Evidence on Hand

- Original Winrock Excel tool and CDM methodology text in `docs/sources/`.
- Design spec at `docs/superpowers/specs/2026-09-27-sample-plot-calculator-design.md`.
- No testimonials, customer data, or marketing assets exist; future work must not fabricate any.

## Product Principles

1. Numbers are the product — every computed value must be visible, correctly rounded, and traceable to a formula.
2. Faithful to the methodology: where the Excel tool and CDM tool behave a certain way (t-table iteration, per-stratum round-up, ≥1 plot per stratum), match it, and say so.
3. Auditable beside Excel: a user with both tools open must be able to reconcile outputs.
4. Restraint over decoration: this is an instrument for professionals, not a marketing surface.
