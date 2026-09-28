# Design: "From land cover" strata tab (GeoJSON → UTM areas → GEE/CTrees zonal stats)

Date: 2026-09-28
Status: approved (pending user review of this document)
Builds on: `2026-09-28-strata-source-tabs-design.md` (adds the third tab, which shipped as a placeholder)

## Goal

Turn the "From land cover" placeholder tab into a working strata source: upload a
GeoJSON whose features carry a mandatory `STRATA` property, derive stratum areas
client-side (planar area in the local UTM zone), then run zonal statistics in
Google Earth Engine against the CTrees Global AGB dataset to derive per-stratum
mean (t C/ha) and SD. The derived strata plug into the existing Neyman
allocation exactly like manual and CSV entries.

## Locked decisions (from brainstorming)

- **Upload format: GeoJSON only.** No zipped-shapefile or GPKG parsing in the
  browser. Features must carry a `STRATA` property (exact match, with
  case-insensitive fallback). Polygon and MultiPolygon geometries only; anything
  else is reported as a warning and skipped.
- **Area: planar area in the UTM zone of the dataset centroid** (EPSG 326xx
  north / 327xx south via proj4), holes subtracted, converted m² → ha. Chosen
  over geodesic (spherical-excess) area deliberately — more accurate at strata
  scale and matches standard GIS practice.
- **GEE auth: per-user Google OAuth, fully client-side.** No key anywhere in
  our infrastructure. The app carries one public OAuth **client ID** (created
  once in Google Cloud Console; a client ID is public by design, not a secret).
  Each user authorizes with their own Google account and must have an Earth
  Engine account registered (free signup) — the "not registered" case gets a
  clear error with the signup link.
- **Token lifetime: silent re-auth.** Google access tokens are hard-capped at
  1 h. The token is held in memory only; at expiry a silent GIS refresh
  (`prompt: ''`) obtains a new token while the user's Google session is alive.
  If that fails, the UI returns to the "Sign in with Google" state. No refresh
  tokens are stored, ever.
- **Dataset & year: CTrees Global AGB 100 m**, community asset
  `projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M`. Always the **latest
  year** in the collection (currently 2025); the year actually used is shown
  next to the results as an engraved tag.
- **Import semantics: replace all strata**, consistent with the CSV tab.

## Approach: official EE JS client + Google Identity Services

Chosen over calling the EE REST API by hand (`fetch` + `image:computeRegions`),
which would mean hand-building EE value payloads and managing polygon
simplification/chunking against REST region-size limits. The EE JS client is
idiomatic, small, and matches the catalog's own docs; we write a thin promise
wrapper over its callback API. GIS (`google.accounts.oauth2.initTokenClient`)
handles the OAuth token flow without a PKCE library or refresh tokens.

Rejected: a Vercel serverless proxy holding a service-account key (contradicts
the no-key-on-server preference; all quota billed to the owner's project), and
client-side COG sampling without GEE (the CTrees asset is not published as an
accessible COG; weaker provenance).

## Modules

Pure logic in `src/lib/` (node-testable), browser-only glue in components —
same split as the rest of the app.

- **`src/lib/geojson.js`** — parse/validate GeoJSON (`FeatureCollection`,
  `Feature`, or bare geometry). Extract Polygon/MultiPolygon features, require
  the `STRATA` property, group by strata value → `[{ name, areaHa, featureCount }]`
  (areas filled in by `utm-area.js`). Returns `{ ok, strata }` or
  `{ ok: false, errors, warnings }` — mirrors `csv.js`.
- **`src/lib/utm-area.js`** — dataset centroid → UTM zone (EPSG 326xx/327xx),
  reproject via proj4, signed planar ring areas (holes subtracted), m² → ha.
  Pure, node-testable.
- **`src/lib/gee.js`** — browser-guarded (`typeof window === 'undefined'` /
  never imported from node tests): GIS token client lifecycle (sign-in, silent
  refresh, expiry tracking), EE client initialization with the user's token,
  and `computeZonalStats(featureCollection, year)` → per-stratum
  `{ mean, sd, pixelCount }`. Only imported from `LandCoverTab.svelte`.
- **`src/components/LandCoverTab.svelte`** — replaces the "Coming soon" card.

New dependencies: `@google/earthengine`, `proj4`. Google Identity Services is
loaded from Google's CDN in `index.html` (async). The calculator core
(`calculator.js`, `t-table.js`, `validation.js`) is **not** touched.

## Data flow

1. **Upload** (drop zone patterned on `CsvImportTab.svelte`) → `geojson.js` +
   `utm-area.js` run fully client-side; no auth needed. A preview table shows
   stratum name, area (ha), feature count, and any warnings.
2. **Sign in with Google** → GIS token client, scope
   `https://www.googleapis.com/auth/earthengine`, our client ID. Token in
   memory only.
3. **Compute biomass stats** → EE client initialized with the token; CTrees
   collection filtered to the latest year; `agb` band rescaled by its scale
   factor and masked to `agb > 0`; `reduceRegions` with
   `ee.Reducer.mean().combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })`
   at 100 m scale.
4. Results map back by strata name → `project.strata` is replaced with
   `{ id, name, area, mean: agbMean × 0.5, varianceInput: { mode: 'sd', value: agbSd × 0.5 } }`
   (t C/ha; the catalog's own carbon conversion factor). Existing autosave,
   recalculation, results panel, and CSV/JSON export flow unchanged. User
   switches to Manual inputs to review, as with CSV import.

### Provenance

Each land-cover-derived stratum carries an optional `provenance` field:
`{ source: 'ctrees-agb-100m', year: <year used>, scale: 100, accessed: <date> }`.
The calculator ignores it; it is preserved through autosave and JSON
Save/Open so the remote-sensing trail survives a round-trip. The CSV import
schema is unchanged (five columns; no provenance).

## Honest labeling (product principle)

Pixel-level SD from a 100 m biomass raster is a **remote-sensing proxy**, not
field-plot SD — the Winrock methodology assumes field-measured variability.
The tab must therefore:

- label the variance cell for derived strata as an RS proxy (e.g. engraved tag
  "SD — RS proxy" / provenance line),
- show the source, year, and scale next to the derived stats, plus a citation
  line (CTrees, CC-BY 4.0) and a note that the dataset is a **non-peer-reviewed
  preprint** (EarthArXiv, May 2026).

## Export / re-import contract

- **JSON (Save/Open)** — always round-trips; GEE-derived strata are ordinary
  strata plus `provenance`. No token or GEE state needed on load.
- **Five-column strata CSV** (`strata, area, mean_c_stock, variability,
  variability_value`) can carry GEE-derived rows directly (`variability=SD`).
- **Results CSV (bezel "Export CSV") must not be re-importable.** Today it is
  rejected only incidentally (schema mismatch produces generic "missing
  column" errors). Add an explicit guard in `parseStrataCsv` (`src/lib/csv.js`):
  if the header matches the results-export signature (contains `stratum` or
  `total allocation` / `backup plots`), return a dedicated error — "This is a
  results export, not a strata file. Use Open (JSON) to reload a project, or
  the five-column strata CSV format." This guard is independent of the
  land-cover work and ships with it.

## Error handling

- **File errors** (invalid JSON, missing/blank `STRATA`, zero-area strata,
  unsupported geometry) → reuse the CSV tab's amber "Check — not imported"
  dialog, listing row/feature-tagged errors and warnings.
- **Auth errors** → EE account not registered: clear message + EE signup link.
  Popup blocked / consent denied: return to sign-in state, no crash.
- **Compute guards** → strata with **< 30 valid biomass pixels** import with
  empty mean/SD, so existing validation flags them "EXCLUDED" for manual edit
  — no calculator special-casing. EE compute timeout/failure shows a retryable
  error state.

## Testing (node-safe)

- `tests/geojson.test.js` — fixtures: valid FeatureCollection, Feature and
  bare-geometry inputs, missing `STRATA`, blank strata values, mixed
  geometry types (warnings), MultiPolygon grouping.
- `tests/utm-area.test.js` — known polygon area verified against a geodesic
  reference within tolerance; northern/southern hemisphere zone selection;
  polygon with hole; dataset near a zone boundary.
- `gee.js` — no node tests (browser-only); its pure helpers (UTM zone calc,
  reducer params) live in `utm-area.js`/`geojson.js` and are covered above.
- `tests/csv.test.js` — add results-export-signature guard cases.
- `tests/app.smoke.test.js` — update the "From land cover" assertion from the
  placeholder text to the real tab.

## Non-goals

- Shapefile/GPKG upload, multi-year or per-user year selection, biomass
  sources other than CTrees, belowground biomass (CTrees is aboveground only),
  in-app map preview, server-side anything.
