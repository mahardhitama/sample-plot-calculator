# Strata source tabs — design

Date: 2026-09-28
Status: approved (brainstorming), pending implementation plan

## Goal

Add a tab switcher to the strata ledger panel with three sources: **Manual
inputs** (the ledger as it exists today), **From CSV** (bulk strata entry via
uploaded CSV), and **From land cover** (empty placeholder). Users are carbon
consultants who cross-check against the original Winrock Excel tool, so the
CSV behavior must be predictable and strictly validated.

## Decisions (locked during brainstorming)

- CSV import **replaces** the entire strata list (no append mode).
- CSV import failures **reject the whole file** and show a **dialog** listing
  every invalid row with a reason. Nothing is replaced until the file parses
  clean.
- Variability cannot be derived from other columns — it is a required
  methodology input (ar-am-tool-03 v2.1.0, para 10). The CSV must carry it
  explicitly.
- The active tab is view state only; it is **not persisted** in the project
  object or localStorage.

## Architecture

A new thin wrapper component owns the tab strip; the existing ledger moves
under it untouched.

- `src/components/StrataPanel.svelte` (new) — owns the active-tab `$state`
  and the tab strip. `App.svelte` renders `<StrataPanel bind:project
  {results} />` in place of today's `<StratumDataTable />`.
  - Tab "Manual inputs" renders the existing `StratumDataTable.svelte`
    unmodified.
  - Tab "From CSV" renders a new `CsvImportTab.svelte`: drop/browse plate,
    spec reminder, parse-error dialog, success confirmation line.
  - Tab "From land cover" renders a placeholder pane: engraved "Land cover
    import — coming soon" plus one line of context ("derive strata from a
    land cover / GIS classification"). No inputs, no state.
- `src/lib/csv.js` (new) — pure, node-testable parser mirroring
  `calculator.js` conventions (block-comment module header, defensive number
  handling, no I/O, no mutation):

  ```js
  parseStrataCsv(text) → { ok: true, strata: [{ name, area, mean, varianceInput: { mode, value } }] }
                       → { ok: false, errors: string[] }
  ```

  `strata` is returned **without ids**; the caller (`StrataPanel` /
  `App.svelte`) assigns `crypto.randomUUID()` per row, matching the
  normalization `App.svelte` already does for JSON import. On success the
  caller replaces `project.strata` wholesale.

## CSV schema

Header row required; columns matched by name, case-insensitive; extra
columns ignored.

| column            | type   | rule                                            |
|-------------------|--------|-------------------------------------------------|
| `strata`          | string | required, non-empty after trim                  |
| `area`            | float  | must parse to a finite number                   |
| `mean_c_stock`    | float  | must parse to a finite number                   |
| `variability`     | string | `CV` or `SD`, case-insensitive, trimmed         |
| `variability_value` | float | must parse to a finite number                  |

Example (guidebook example):

```csv
strata,area,mean_c_stock,variability,variability_value
Stratum 1,3400,126.8,CV,20.7
Stratum 2,900,85,CV,18.42
Stratum 3,700,102.2,CV,8.02
```

### Parser semantics

- RFC-4180-ish hand-rolled parsing in `csv.js` (quoted fields, embedded
  commas/newlines, CRLF). **No new dependency.**
- **Syntactic rejection** (whole file rejected, errors listed in the
  dialog): missing or unrecognized required header columns, empty file /
  no data rows, blank `strata` cell, non-numeric `area` / `mean_c_stock` /
  `variability_value`, `variability` not CV/SD. Error messages name the
  row and the problem, e.g. `Row 4: area "abc" is not a number`. Row
  numbers are data-row numbers: the first row after the header is row 1.
- **Semantic tolerance**: structurally valid but numerically meaningless
  values (negative area, zero variability) import normally and are flagged
  EXCLUDED by the calculator, exactly like manual entries. The parser stays
  purely syntactic.

## UI design (DESIGN.md conventions)

- Tab strip uses the existing **ToggleGroup** primitive
  (`src/lib/components/ui/toggle-group`): three segments "Manual inputs" ·
  "From CSV" · "From land cover", engraved labels, hairline separation,
  spruce active state, no shadows. Switching tabs never mutates
  `project.strata`.
- CSV tab body: dashed-line drop plate (same language as the "Add stratum"
  row) — click to browse or drop a `.csv`; below it an engraved spec line
  naming the five columns.
- Error dialog: minimal hand-rolled modal (no shadcn dialog primitive
  exists in the repo and none is added): centered plate, hairline border,
  dimmed backdrop, amber "Check" header, scrollable list of error strings,
  single Close button; Escape and backdrop click dismiss.
- After a successful import the CSV tab shows a confirmation line ("N
  strata imported — switch to Manual inputs to review").

## State flow

`App.svelte` keeps owning the single `project` `$state` and the derived
`results`; `StrataPanel` receives `bind:project` and `{results}`. The
import path is: file → `parseStrataCsv(text)` → on `ok`, assign
`project.strata = strata.map((s) => ({ ...s, id: crypto.randomUUID() }))`;
on `!ok`, show the dialog with `errors`. The existing autosave effect in
`App.svelte` persists the imported strata with no changes.

## Testing

- `tests/csv.test.js` (new): fixture-driven unit tests of `parseStrataCsv`
  in the node environment — guidebook example as CSV, quoted fields with
  commas, CRLF endings, case-insensitive headers, and each rejection path
  (missing column, bad variability label, non-numeric value, blank name,
  empty file) asserting exact error messages.
- `tests/app.smoke.test.js`: extend to assert the three tab labels render
  and the default guidebook strata still render under "Manual inputs".

## Out of scope

Append-mode import, Excel/xlsx upload, land cover functionality, persisting
the active tab, any change to calculation logic.
