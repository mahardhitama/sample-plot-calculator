# AGENTS.md — Sample Plot Calculator

Guidance for AI coding agents working in this repository.

## Project overview

A single-page web app that recreates the Winrock CDM A/R Sample Plot
Calculator (Excel, 2014). It implements the CDM A/R Methodological Tool
"Calculation of the number of sample plots for measurements within A/R CDM
project activities" v2.1.0 (EB 58, Annex 15): given a target precision and
confidence level plus each stratum's area, mean carbon stock, and variability
(SD or CV), it computes the total number of sample plots required and the
Neyman-optimal per-stratum allocation.

Users are carbon/forestry consultants who cross-check results against the
original Excel tool, so numerical behavior must match the methodology and the
spreadsheet exactly — see "Correctness constraints" below.

Live at https://sample-plot-calculator.vercel.app (static Vite app on Vercel).

## Tech stack

- Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`) — no TypeScript, plain JS everywhere
- Vite 8 (`vite.config.js`, also drives Vitest) with the `@sveltejs/vite-plugin-svelte` and `@tailwindcss/vite` plugins
- Tailwind CSS v4 via `src/app.css` (`@import "tailwindcss"`, `@theme` token block, CSS-first config — no `tailwind.config.js`)
- shadcn-svelte ("nova" style, configured in `components.json`); stock UI primitives live in `src/lib/components/ui/` and are generated code — edit them rarely and prefer wrapping over modifying
- TanStack Table v9 (`@tanstack/svelte-table`) for the sortable strata ledger
- `@lucide/svelte` for icons; `cn` for class merging (`$lib/utils.js`)
- Fonts: Space Grotesk (all text) and Space Mono (all numerals, `tabular-nums`) — a binding product commitment

## Build and test commands

```sh
npm install
npm run dev      # Vite dev server
npm run test     # vitest run — all tests (node environment, no DOM)
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

All dependencies are devDependencies; there is no runtime server or backend.
Deploy with `npx vercel --prod` from the project root (linked via
`npx vercel link`).

## Code organization

```
src/
  main.js                 entry: mounts App.svelte into #app
  App.svelte              root component: owns the single project $state object,
                          derives results/issues, autosaves (debounced 500 ms),
                          import/export/reset actions
  app.css                 Tailwind v4 entry + full design-token set (light + .dark)
  lib/
    calculator.js         pure calculation core (no I/O, no mutation) — the
                          heart of the app; see below
    t-table.js            standardized two-sided Student's t critical values
                          (df 1..30 plus infinity), lifted from the Excel tool
    validation.js         project-level input validation (precision, z, plot size)
    defaults.js           createDefaultProject(): Winrock defaults with the
                          guidebook example pre-filled
    persistence.js        localStorage autosave/load, debounce, JSON project
                          import/export, CSV results export (browser-guarded)
    utils.js              cn() re-export for shadcn-svelte
    geojson.js              land cover GeoJSON parsing/validation (STRATA property,
                            polygon grouping) — pure, node-testable
    utm-area.js             planar area in the dataset's UTM zone (proj4) — pure
    gee-config.js           EE constants: public OAuth client ID, CTrees asset, ×0.5
    gee.js                  browser-only per-user GEE auth (GIS token client, silent
                            refresh) + CTrees zonal stats — import only from
                            LandCoverTab.svelte, never from tests
    components/ui/        shadcn-svelte primitives (badge, button, card, input,
                          label, native-select, switch, table, toggle, toggle-group)
  components/
    ProjectControls.svelte    precision/confidence/plot-size/backup settings
    StratumDataTable.svelte   sortable strata ledger (TanStack Table v9)
    ResultsSummary.svelte     readout panel of intermediate values
    Readout.svelte            a single LCD readout value (settling animation)
    SortableHeader.svelte     sortable column header
    LandCoverTab.svelte       GeoJSON upload → area preview → GEE biomass stats
    cells/                    editable ledger cells (Number/Text/Variance/
                              Allocation/Remove)
docs/
  sources/              original Winrock xlsx, CDM methodology text, README
                        with provenance and dead-URL notes
  superpowers/specs/    the design spec that built this app
DESIGN.md               full design system ("The Survey Instrument")
PRODUCT.md              product spec: users, purpose, principles
```

State flow: `App.svelte` holds one `project` object in `$state`
(`{ name, precisionLevel, confidenceLevel, zValue, plotSize, backupPercentage, strata: [{ id, name, area, mean, varianceInput: { mode: 'sd'|'cv', value } }] }`).
Every edit re-runs `computeProject(project)` via `$derived` for live
recalculation; results are passed down to presentational components.

## Correctness constraints (calculator core)

`src/lib/calculator.js` must stay pure and match the CDM methodology and the
original Excel tool:

- Finite population correction (Equation 2), with automatic switch to the
  simplified equation (Equation 3) when the sampled fraction is below 5%
  (`SAMPLE_FRACTION_THRESHOLD`).
- Student's t iteration: first pass at infinite df; if n < 30, a second pass
  at df = n − 1, looking t up from `t-table.js`. This two-pass behavior comes
  from the Excel tool, not the CDM text — preserve it. A "custom" confidence
  level uses the fixed z value and never iterates.
- Neyman allocation per stratum, rounded to the nearest plot count (values
  below 0.5 round to 0 — this is round-to-nearest, not round-up).
- Invalid strata (non-positive area/mean, unusable variability) are excluded
  from calculation but kept in the list, flagged with human-readable issues.
- Confidence presets 80/90/95/98/99% are identified by string values
  ('0.95' etc.), not numbers.

When changing any of this, re-derive expected numbers from the methodology
text in `docs/sources/ar-am-tool-03-v2.1.0.md` or by comparing against
`docs/sources/Winrock_SamplePlot_Calculator_2014_0.xlsx`, and pin them in
`tests/calculator.test.js`.

## Testing strategy

- `npm run test` runs Vitest in **node environment** (set in
  `vite.config.js`) — tests must not require a DOM.
- `tests/calculator.test.js` — fixture-driven unit tests of the pure core:
  the guidebook worked example (3 strata, 5000 ha, p = 10%, z = 1.96), t-table
  lookups, t-iteration policy, backup plots, rounding, excluded strata, SD/CV
  equivalence. Add cases here for any calculator change.
- `tests/app.smoke.test.js` — server-renders `App.svelte` via
  `svelte/server` and asserts on the HTML string (title, default strata,
  headline total). Note the assertion style: exact rendered numbers like
  `'>13<'` and locale-formatted `5,000` — these break if the default project
  or the t-iteration/rounding logic changes.
- tests/geojson.test.js / tests/utm-area.test.js — fixture-driven tests of the
  land cover parsing and UTM area modules. tests/fixtures/three-strata.geojson
  is also the manual end-to-end fixture.
- gee.js is browser-only by construction (imports @google/earthengine and
  touches window/google/ee); it must never be imported from node tests or from
  SSR-reachable module scope.
- There is no component-interaction or browser test setup; keep tests
  node-safe.

## Code style guidelines

- Tabs for indentation; single quotes; no semicolon style enforcement beyond
  matching the surrounding file.
- Lib files open with a block-comment summary of the module's role — keep
  that style for new lib modules.
- Calculator helpers use defensive number handling (`Number(x)`,
  `Number.isFinite`, `> 0` guards) and return `null` for not-derivable values;
  the UI renders null as an em-dash.
- Calculator functions and `resultsToCsv` are pure; browser-only code in
  `persistence.js` is guarded with `typeof localStorage === 'undefined'`
  checks so it stays importable from node tests.
- Strata are identified by `id` (`crypto.randomUUID()`); `App.svelte`
  normalizes imported projects to add missing ids.
- Import from the `$lib` alias (configured in `vite.config.js`) rather than
  relative paths into `src/lib`.

## Design conventions

`DESIGN.md` is the authoritative design system ("The Survey Instrument": a
calibration-bench aesthetic). Hard rules that code reviews should enforce:

- No drop shadows anywhere; depth is inset wells (`.readout`) and 1px
  hairline rules (`border` token).
- Only two accents: spruce `--primary: #235338` and flag amber
  `--destructive: #b45309`. Amber signals "check this", never decoration.
- Every numeral in Space Mono with `tabular-nums`; labels are engraved
  (uppercase, 10px, 0.14em tracking, `--muted-foreground`).
- Plates use the bench-ground fill (`--card` equals `--background`); they
  separate by hairline, not elevation.
- State is never hue alone — pair color with a line form (dashed rule,
  double sum-rule) or a named phase tag in words ("EXCLUDED").

A `.dark` token set exists in `src/app.css` but is unexercised; do not design
against it.

## Security and data considerations

- The app is a fully static client-side app — no server, no API keys, no
  secrets. `.env.local` exists only for the Vercel CLI.
- All user data stays in the browser: `localStorage` key
  `sample-plot-calculator:project` and user-downloaded JSON/CSV files. There
  is no telemetry.
- JSON import parses arbitrary user files — `importProjectJson` already
  guards against invalid JSON; keep import handling defensive (unknown fields,
  missing `backupPercentage`, missing stratum ids) rather than trusting the
  file shape.
- Earth Engine access is per-user OAuth (GIS token client): each user signs in
  with their own Google account; the OAuth client ID in gee-config.js is public
  by design and no secret exists anywhere. Tokens live in memory only and are
  silently refreshed before their 1 h expiry.
