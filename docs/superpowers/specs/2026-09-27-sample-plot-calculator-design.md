# Sample Plot Calculator — Design Spec (2026-09-27)

Web recreation of the Winrock CDM A/R Sample Plot Calculator (Excel, 2014),
implementing the CDM A/R Methodological Tool "Calculation of the number of
sample plots for measurements within A/R CDM project activities" v2.1.0
(EB 58, Annex 15).

## Purpose

Given a target precision (e.g. 10%) and confidence level (90%/95%), plus each
stratum's area, mean carbon stock, and variability (SD or CV), compute the
total number of sample plots required and the Neyman-optimal allocation of
plots across strata.

## Stack and UI decisions

- **Svelte 5 + Vite SPA** (no SvelteKit — single screen, no backend), JavaScript.
- **shadcn-svelte v1.7** (nova style, neutral base color, default theme):
  stock components only — Input, Button, ToggleGroup, Card, Label, Badge,
  Table, and **native-select** for the confidence dropdown. No custom palette.
- **TanStack Table v9** (`@tanstack/svelte-table`, `createTable` +
  `rowSortingFeature` + `sortedRowModel`) powers the stratum data-table;
  every column is sortable via clickable headers. Sorting reorders the view
  only; editing stays live.
- **Typography:** Space Grotesk (text, `--font-sans`), Space Mono (all numbers,
  `--font-mono`) via `@fontsource`.
- **Persistence:** debounced autosave to `localStorage`; JSON export/import of
  the full project; CSV export of the results table.

## Formulas (verified against the original Excel, see docs/sources)

- `N = A / AP`; weights `w_i = A_i / A`; weighted mean `Q̄ = Σ w_i·Q_i`;
  allowable error `E = Q̄ · p`.
- **Equation 2** (finite population correction):
  `n = N·t²·(Σ w_i·s_i)² / (N·E² + t²·Σ w_i·s_i²)`
- **Equation 3** (simplified, when sampled fraction < 5%):
  `n = (t/E)² · (Σ w_i·s_i)²`
- **Student's t iteration** (per the methodology): first pass with t at
  infinite df; if n < 30, a second (final) pass with t at df = n−1. The t
  values come from the standardized two-sided table in `src/lib/t-table.js`,
  lifted from the original Excel's "student t value" sheet (identical to any
  textbook / R's `qt` / Excel's `T.INV.2T`). Confidence presets 80/90/95/98/99%
  match the Excel's dropdown; "custom" keeps a fixed user-entered value.
- Method switch: compute Equation 2; if `n/N < 0.05` use Equation 3 and label
  it "simplified", else "finite population correction".
- **Neyman allocation:** `n_i = n · (A_i·s_i) / Σ (A_i·s_i)`.
- **Rounding (Winrock convention):** each `n_i` rounded **up**, minimum 1 per
  stratum; the final total is the sum of rounded values and may exceed `ceil(n)`.
- **SD/CV:** per-stratum toggle; `SD = CV × mean / 100`, `CV = SD/mean × 100`.

### Conventions inherited from the Excel tool

- The guidebook example's "Z(1−α) = 1.86" is the Excel's second-iteration
  t-value: with the example strata at **90%** confidence the first pass gives
  n ≈ 9.6 (< 30), so the second pass uses t(df = 8, 90%) = 1.86 → n ≈ 12.27.
  At 95% the same example iterates to t(df = 12) = 2.179 → n ≈ 16.84,
  allocated 13.78 / 2.18 / 0.89 → 14 / 3 / 1 = 18.
- Cost weighting and the buffer-plots field from the Excel are out of scope
  (core calculator only).

## Architecture

```
src/
├── lib/
│   ├── calculator.js    pure compute functions (framework-agnostic, unit-tested)
│   ├── validation.js    project-level input guards
│   ├── persistence.js   localStorage, JSON/CSV import-export
│   ├── defaults.js      default project (Winrock defaults + guidebook example)
│   └── components/ui/   shadcn-svelte CLI stock components (unmodified)
├── components/
│   ├── ProjectControls.svelte   sampling design card
│   ├── StratumDataTable.svelte  sortable TanStack data-table (inputs + computed)
│   ├── ResultsSummary.svelte    weighted stats, method label, plot totals
│   ├── SortableHeader.svelte    sortable column header
│   ├── controls/NumericField.svelte   decimal-safe numeric input
│   └── cells/                   TextCell, NumberCell, VarianceCell, RemoveCell
└── App.svelte           state wiring ($state/$derived), autosave, import/export
tests/
├── calculator.test.js   14 tests against the worked example + edge cases
└── app.smoke.test.js    SSR render of the full app with default project
```

Data flow: `project` ($state) → `$derived(computeProject(project))` → results
propagated to table (computed columns read via id-keyed map so edits always
land on the source stratum objects) and summary. Edits mutate strata through
buffered cell inputs; results recompute on every keystroke.

## Behavior details

- Invalid rows (zero area/mean, missing variability) are excluded from the
  computation, kept in the table, and their exclusion reason is shown.
- Numeric inputs use a focus-buffered local string so intermediate typing
  states ("12.", "0.") are not clobbered; external changes (reset/import)
  refresh the field when it is not focused.
- First load: precision 10%, confidence 90%, plot size 0.25 ha, three strata
  matching the guidebook example. "Reset example" restores this.
- localStorage key: `sample-plot-calculator:project` (debounced ~500 ms).

## Testing & verification

- `npm run test` — 24 tests: worked-example fixture with t-iteration (n ≈ 16.84
  at 95%, t = 1.86/df = 8 at 90%), single-stratum reduction, min-1-plot rule,
  zero-area exclusion, SD/CV equivalence, t-table lookups and iteration policy
  (custom fixed value, n ≥ 30 skip), plus a full-app SSR smoke test asserting
  the rendered totals for the default project (5,000 ha → N = 20,000 → 14 plots).
- `npm run build` — production build passes.
- Formulas cross-checked cell-by-cell against the downloaded Excel
  (`docs/sources/Winrock_SamplePlot_Calculator_2014_0.xlsx`).
