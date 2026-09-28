# Sample Plot Calculator

Web recreation of the Winrock CDM A/R Sample Plot Calculator (Excel, 2014),
implementing the CDM A/R Methodological Tool "Calculation of the number of
sample plots for measurements within A/R CDM project activities" v2.1.0.

Enter a target precision and confidence level plus each stratum's area, mean
carbon stock, and variability (SD or CV) — the app computes the total sample
plots required and the Neyman-optimal per-stratum allocation.

**Live:** https://sample-plot-calculator.vercel.app

## Run

```sh
npm install
npm run dev        # development server
npm run test       # vitest (calculator fixtures + app smoke test)
npm run build      # production build to dist/
```

## Deploy

Static Vite app, deployed to Vercel:

```sh
npx vercel --prod  # from the project root, linked via `npx vercel link`
```

## Features

- Live recalculation on every edit
- Sortable stratum data-table (inputs and computed columns side by side)
- SD / CV variability input switch per stratum
- Student's t iteration per the CDM methodology (t at infinite df, then t at
  df = n−1 when n < 30) using the standardized t-table from the original Excel
- Finite population correction with automatic switch to the simplified
  equation when the sampled fraction is below 5%
- Per-stratum round-to-nearest plot counts (allocations below 0.5 round down to 0)
- Optional backup plots: a percentage added on top of each stratum's
  allocation, with a combined "total allocation" per stratum
- Autosave to localStorage, JSON project export/import, CSV results export
- "From land cover" tab: derive strata from a GeoJSON with a STRATA property —
  UTM-zone area calculation, then per-user Google-authenticated Earth Engine
  zonal statistics against CTrees Global AGB 100 m (latest year) for mean and
  SD (t C/ha)
- Reference documents in `docs/sources/` (original Excel tool, methodology
  tool text) — see `docs/sources/README.md` for URLs and availability notes

## Stack

Svelte 5 + Vite, shadcn-svelte (sera style, native-select), TanStack Table v9,
Tailwind CSS v4, Noto Sans / Playfair Display via @fontsource-variable.

Design notes: `DESIGN.md`. Earlier design spec (pre-sera custom system, kept
for history): `docs/superpowers/specs/2026-09-27-sample-plot-calculator-design.md`
