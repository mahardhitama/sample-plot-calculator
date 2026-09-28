# Surface Brief — Sample Plot Calculator (src/App.svelte)

## Scope and mode

Single-surface desktop web tool, mode: Operate. The visitor completes a task: enter strata, pick precision/confidence, read the required plot count per stratum. All product truth lives in PRODUCT.md; fonts (Space Grotesk text, Space Mono numbers) are binding.

## Audience and job

Carbon/forestry consultants, researchers, and inventory designers at a desktop beside Excel. They cross-check this tool against the Winrock xlsx and the CDM methodology; every intermediate value must be visible and reconcilable. Success: the total plot count and per-stratum allocation are readable within seconds of landing, and the numbers look like they came from an instrument, not a web form.

## Chosen direction

The Survey Instrument (seed 12d6b7c2, position 3 on the grounded list, THE ROLL, kept by the user). Durable visual world: a precision field instrument / calibration bench.

## Direction contract

THESIS: This calculator refuses the category default of neutral SaaS cards around a spreadsheet; it presents the calculation as one calibrated bench instrument — engraved labels, inset readout windows, numerals locked to a registration grid — so the interface itself argues the number is precise and auditable.

OWN-WORLD: Warm light instrument bench — ground #F7F6F2, ink #20261F, spruce accent #235338, warning amber #B45309. Space Grotesk for all text; Space Mono for every numeral. Labels are small tracked uppercase like engraving; values sit in inset readout windows (subtle inner shadow, hairline bezel) like LCD fields; state is carried in line form — weight, dash, strike — never hue alone (raise: emission-line rail). Allocation bars are drawn to exact proportion; length is the quantity (raise: labanotation). Every numeral locks to a shared column grid; nothing floats (raise: TDR).

STORY: The visitor understands immediately that this is a sampling-design instrument implementing the CDM A/R tool; believes the output because every intermediate (weighted mean, E, weighted SD/variance, N, t) is on display with units; and does their job — edit strata, watch the readouts settle, export the result.

FIRST VIEWPORT: One bench, no hero. Top instrument bezel (full-width, hairline-ruled) carries the product name as an engraved ID plate at left and file actions (Save / Open / Export CSV / Reset) as small panel buttons at right. Below, a single settings plate holds project name, precision (%), confidence (native select), and plot size — engraved labels, readout-style inputs. The strata ledger dominates: a ruled table, mono numerals on a strict grid, per-row state shown as line form, with Add-row as a dashed-rule "next blank line" affordance. Right rail (or ledger footer at narrow widths) holds the readout panel: headline total-n LCD window, weighted-mean / E / weighted-SD / N windows, each labeled with its formula symbol.

FORM: Neyman allocation is the signature interaction: on every recompute the readout values settle once into place (raise: gravity-rain) and each stratum's allocation bar draws to its exact proportion of the row, its rounded count engraved at the bar's end. Invalid/excluded strata strike to a half-height dashed rule and carry a named phase tag — EXCLUDED — in words, not color alone (raise: cyclorama).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

None blocking. Default color theme is light; a dark phase is not in scope.
