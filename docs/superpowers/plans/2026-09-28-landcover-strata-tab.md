# Land Cover Strata Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the "From land cover" placeholder tab into a working strata source: upload GeoJSON with a mandatory `STRATA` property → derive per-stratum areas client-side (planar area in the local UTM zone) → run per-user Google-authenticated Earth Engine zonal statistics against the CTrees Global AGB dataset → derive mean (t C/ha) and SD that plug into the existing allocation. Also add a guard so the results CSV can't be re-imported as strata CSV.

**Architecture:** Pure parsing/area modules in `src/lib/` (node-testable), browser-only GEE glue in `src/lib/gee.js` (imported only from the new tab component so node tests never touch it), UI in `src/components/LandCoverTab.svelte` patterned on `CsvImportTab.svelte`. Auth is Google Identity Services token client + `@google/earthengine` browser client; no server, no stored secrets.

**Tech Stack:** Svelte 5 (runes), Vite 8 + Vitest (node environment), Tailwind v4, shadcn-svelte, `proj4`, `@google/earthengine` v1.7.45, Google Identity Services (`accounts.google.com/gsi/client`).

**Spec:** `docs/superpowers/specs/2026-09-28-landcover-strata-tab-design.md`

## Global Constraints

- Tabs for indentation; single quotes; match surrounding file style. Lib files open with a block-comment summary of the module's role.
- Import from the `$lib` alias, never relative paths into `src/lib`.
- All tests run in **node environment** (set in `vite.config.js`) — never require a DOM; browser-only code must be structurally unimportable from tests or guarded.
- The calculator core (`calculator.js`, `t-table.js`, `validation.js`) is NOT modified in this plan.
- Strata shape: `{ id, name, area, mean, varianceInput: { mode: 'sd'|'cv', value } }`; land-cover rows add an optional `provenance` field the calculator ignores.
- Design system: no shadows; spruce `--primary` and amber `--destructive` only; every numeral Space Mono `tabular-nums`; engraved labels (uppercase, 10px, 0.14em tracking, `--muted-foreground`); amber always paired with words ("Check").
- `npm run test` and `npm run build` must pass at every task boundary.
- CTrees constants: asset `projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M`, bands `agb`/`uncertainty`, scale factor 0.1, carbon conversion ×0.5, 100 m scale, latest-year selection via `sort('system:time_start', false).first()`, `< 30` valid pixels → stratum imported with null mean/SD.
- Commit after each task with the message given in its final step.

---

### Task 1: Guard against re-importing the results CSV

**Files:**
- Modify: `src/lib/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `parseStrataCsv` returns a dedicated single error when the header matches the results-export signature. Later tasks don't depend on this, but the message text is asserted in tests here.

- [ ] **Step 1: Write the failing test**

Append to `tests/csv.test.js` (match existing import style at the top — the file already imports `parseStrataCsv` and `resultsToCsv` if not, add `resultsToCsv` to the import from `../src/lib/persistence.js`):

```js
describe('results-export guard', () => {
	it('rejects the results CSV with a dedicated error', () => {
		const resultsCsv = resultsToCsv({
			strata: [],
			totalArea: 0,
			weightedMean: null,
			weightedVariance: null,
			nRaw: null,
			totalPlots: 0,
			totalBackups: 0,
			totalAllocation: 0
		})
		const result = parseStrataCsv(resultsCsv)
		expect(result.ok).toBe(false)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]).toContain('results export')
	})

	it('still accepts a valid strata CSV', () => {
		const result = parseStrataCsv(
			'strata,area,mean_c_stock,variability,variability_value\nForest,1000,120,SD,45\n'
		)
		expect(result.ok).toBe(true)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/csv.test.js`
Expected: FAIL — `result.errors` has 5 entries ("Missing required column ..."), not the dedicated message.

- [ ] **Step 3: Implement the guard**

In `src/lib/csv.js`, inside `parseStrataCsv`, immediately after the `header` line is computed and before the `REQUIRED_COLUMNS` loop, insert:

```js
	if (header.includes('stratum') || header.includes('total allocation')) {
		return {
			ok: false,
			errors: [
				'This is a results export, not a strata file. Use Open (JSON) to reload a project, or the five-column strata CSV format.'
			]
		}
	}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/csv.test.js`
Expected: PASS (all tests in the file, including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.js tests/csv.test.js
git commit -m "Guard strata CSV import against results-export files"
```

---

### Task 2: GeoJSON parsing and validation (`src/lib/geojson.js`)

**Files:**
- Create: `src/lib/geojson.js`
- Test: `tests/geojson.test.js`
- Create: `tests/fixtures/three-strata.geojson` (also reused for manual testing in Task 4)

**Interfaces:**
- Consumes: nothing.
- Produces:
```js
parseLandCoverGeoJson(text)
// → { ok: true,  warnings: string[], strata: [{ name, featureCount, features: GeoJSONFeature[] }] }
// → { ok: false, errors: string[], warnings: string[] }
```
  - `features` preserves the original WGS84 GeoJSON features (Task 3 computes areas from them, Task 4 sends them to EE).
  - Errors are feature-tagged human-readable strings; warnings collect skipped non-polygon geometries.
  - `STRATA` property: exact `STRATA` first, case-insensitive fallback over `properties` keys.

- [ ] **Step 1: Write the failing tests**

Create `tests/fixtures/three-strata.geojson`:

```json
{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"properties": { "STRATA": "Dense forest" },
			"geometry": {
				"type": "Polygon",
				"coordinates": [[
					[106.8, -6.9], [106.9, -6.9], [106.9, -6.8], [106.8, -6.8], [106.8, -6.9]
				]]
			}
		},
		{
			"type": "Feature",
			"properties": { "STRATA": "Dense forest" },
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[106.9, -6.9], [107.0, -6.9], [107.0, -6.85], [106.9, -6.85], [106.9, -6.9]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": { "strata": "Agroforestry" },
			"geometry": {
				"type": "Polygon",
				"coordinates": [[
					[107.0, -6.85], [107.05, -6.85], [107.05, -6.8], [107.0, -6.8], [107.0, -6.85]
				]]
			}
		},
		{
			"type": "Feature",
			"properties": { "STRATA": "River" },
			"geometry": {
				"type": "LineString",
				"coordinates": [[106.8, -6.95], [107.0, -6.95]]
			}
		}
	]
}
```

Create `tests/geojson.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseLandCoverGeoJson } from '../src/lib/geojson.js'

const fixture = readFileSync(new URL('./fixtures/three-strata.geojson', import.meta.url), 'utf8')

describe('parseLandCoverGeoJson', () => {
	it('groups polygon features by STRATA value', () => {
		const result = parseLandCoverGeoJson(fixture)
		expect(result.ok).toBe(true)
		expect(result.warnings).toEqual([])
		const names = result.strata.map((s) => s.name).sort()
		expect(names).toEqual(['Agroforestry', 'Dense forest'])
		const dense = result.strata.find((s) => s.name === 'Dense forest')
		expect(dense.featureCount).toBe(2)
		expect(dense.features).toHaveLength(2)
	})

	it('accepts case-insensitive strata property names', () => {
		const result = parseLandCoverGeoJson(fixture)
		expect(result.strata.some((s) => s.name === 'Agroforestry')).toBe(true)
	})

	it('warns about and skips non-polygon geometries', () => {
		const result = parseLandCoverGeoJson(fixture)
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain('LineString')
	})

	it('rejects invalid JSON', () => {
		const result = parseLandCoverGeoJson('{not json')
		expect(result.ok).toBe(false)
		expect(result.errors[0]).toContain('not valid JSON')
	})

	it('rejects a missing STRATA property', () => {
		const text = JSON.stringify({
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
			]
		})
		const result = parseLandCoverGeoJson(text)
		expect(result.ok).toBe(false)
		expect(result.errors[0]).toContain('STRATA')
	})

	it('rejects a blank STRATA value', () => {
		const text = JSON.stringify({
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', properties: { STRATA: '  ' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
			]
		})
		const result = parseLandCoverGeoJson(text)
		expect(result.ok).toBe(false)
		expect(result.errors[0]).toContain('blank')
	})

	it('rejects an empty feature collection', () => {
		const result = parseLandCoverGeoJson('{"type":"FeatureCollection","features":[]}')
		expect(result.ok).toBe(false)
		expect(result.errors[0]).toContain('no features')
	})

	it('rejects input that is not a feature collection or feature', () => {
		const result = parseLandCoverGeoJson('{"type":"Point","coordinates":[0,0]}')
		expect(result.ok).toBe(false)
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/geojson.test.js`
Expected: FAIL with "parseLandCoverGeoJson is not a function" / module not found.

- [ ] **Step 3: Implement `src/lib/geojson.js`**

```js
/**
 * Land cover GeoJSON parsing. Pure validation and grouping: accepts a
 * FeatureCollection or single Feature whose polygon features carry a
 * mandatory STRATA property, groups them by strata value, and reports
 * unsupported geometries as warnings. Areas are computed later by
 * utm-area.js; features are preserved verbatim for the GEE upload.
 */

const SUPPORTED_TYPES = new Set(['Polygon', 'MultiPolygon'])

function strataProperty(properties, index, errors) {
	if (properties == null || typeof properties !== 'object') {
		errors.push(`Feature ${index}: missing "STRATA" property.`)
		return null
	}
	if (Object.prototype.hasOwnProperty.call(properties, 'STRATA')) return properties.STRATA
	const key = Object.keys(properties).find((k) => k.toLowerCase() === 'strata')
	if (key !== undefined) return properties[key]
	errors.push(`Feature ${index}: missing "STRATA" property.`)
	return null
}

/**
 * Parse GeoJSON text into strata groups.
 * @returns {{ok: true, warnings: string[], strata: Array<{name, featureCount, features}>}
 *          | {ok: false, errors: string[], warnings: string[]}}
 */
export function parseLandCoverGeoJson(text) {
	let root
	try {
		root = JSON.parse(text)
	} catch {
		return { ok: false, errors: ['The file is not valid JSON.'], warnings: [] }
	}

	const features = []
	if (root?.type === 'FeatureCollection') {
		features.push(...(root.features ?? []))
	} else if (root?.type === 'Feature') {
		features.push(root)
	} else {
		return {
			ok: false,
			errors: ['Expected a GeoJSON FeatureCollection or Feature.'],
			warnings: []
		}
	}
	if (features.length === 0) {
		return { ok: false, errors: ['The file has no features.'], warnings: [] }
	}

	const errors = []
	const warnings = []
	const groups = new Map()
	features.forEach((feature, i) => {
		const index = i + 1
		if (!SUPPORTED_TYPES.has(feature?.geometry?.type)) {
			warnings.push(
				`Feature ${index}: ${feature?.geometry?.type ?? 'unknown'} geometry skipped — only Polygon and MultiPolygon are supported.`
			)
			return
		}
		const rawName = strataProperty(feature.properties, index, errors)
		const name = String(rawName ?? '').trim()
		if (name === '') {
			if (rawName !== null && rawName !== undefined) errors.push(`Feature ${index}: "STRATA" value is blank.`)
			return
		}
		if (!groups.has(name)) groups.set(name, [])
		groups.get(name).push(feature)
	})

	if (errors.length > 0) return { ok: false, errors, warnings }
	if (groups.size === 0) {
		return { ok: false, errors: ['No polygon features with a "STRATA" property were found.'], warnings }
	}
	return {
		ok: true,
		warnings,
		strata: [...groups.entries()].map(([name, groupFeatures]) => ({
			name,
			featureCount: groupFeatures.length,
			features: groupFeatures
		}))
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geojson.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geojson.js tests/geojson.test.js tests/fixtures/three-strata.geojson
git commit -m "Add pure GeoJSON strata parser with STRATA grouping"
```

---

### Task 3: UTM-zone planar areas (`src/lib/utm-area.js`)

**Files:**
- Create: `src/lib/utm-area.js`
- Test: `tests/utm-area.test.js`

**Interfaces:**
- Consumes: `parseLandCoverGeoJson` output (Task 2): `{ ok: true, strata: [{ name, featureCount, features }] }`.
- Produces:
```js
utmZone(lon, lat)        // → { zone: number, epsg: number, south: boolean }
computeStrataAreas(parsed) // parsed = ok-result of parseLandCoverGeoJson
// → { strata: [{ name, featureCount, areaHa, polygons: number[][][][] }],
//     warnings: string[] }
```
  - `polygons` is WGS84 MultiPolygon coordinate arrays (one `Polygon` = array of rings, one `MultiPolygon` = array of polygons) — Task 4 uploads these to EE.
  - `areaHa` is planar area in the UTM zone of the dataset centroid (EPSG 326xx/327xx), holes subtracted, m² → ha. Zero-area strata produce a warning, not an error.

- [ ] **Step 1: Install proj4**

Run: `npm install proj4`
Expected: adds `proj4` to `devDependencies` in `package.json`, lockfile updates.

- [ ] **Step 2: Write the failing tests**

Create `tests/utm-area.test.js`:

```js
import { describe, it, expect } from 'vitest'
import proj4 from 'proj4'
import { utmZone, computeStrataAreas } from '../src/lib/utm-area.js'

// Build a WGS84 polygon from known UTM coordinates so expected areas are exact.
function utmSquare(zone, x0, y0, sizeM) {
	const utm = `+proj=utm +zone=${zone} +datum=WGS84 +units=m`
	const ring = [
		[x0, y0],
		[x0 + sizeM, y0],
		[x0 + sizeM, y0 + sizeM],
		[x0, y0 + sizeM],
		[x0, y0]
	]
	return ring.map(([x, y]) => proj4(utm, 'EPSG:4326', [x, y]))
}

function parsedOf(features) {
	return { ok: true, warnings: [], strata: [{ name: 'S1', featureCount: features.length, features }] }
}

function featureOf(coords) {
	return { type: 'Feature', properties: { STRATA: 'S1' }, geometry: { type: 'Polygon', coordinates: coords } }
}

describe('utmZone', () => {
	it('maps longitude to the right zone and hemisphere', () => {
		expect(utmZone(106.85, -6.85)).toEqual({ zone: 48, epsg: 32748, south: true })
		expect(utmZone(10.5, 59.9)).toEqual({ zone: 32, epsg: 32632, south: false })
	})
	it('clamps edge longitudes', () => {
		expect(utmZone(180, 0).zone).toBe(60)
		expect(utmZone(-180, 0).zone).toBe(1)
	})
})

describe('computeStrataAreas', () => {
	it('computes the exact area of a 1 km square (100 ha)', () => {
		const ring = utmSquare(48, 499980, 4100040, 1000)
		const { strata } = computeStrataAreas(parsedOf([featureOf([ring])]))
		expect(strata[0].areaHa).toBeCloseTo(100, 6)
	})

	it('subtracts holes', () => {
		const outer = utmSquare(48, 499980, 4100040, 2000)
		const hole = utmSquare(48, 500480, 4100540, 1000)
		const { strata } = computeStrataAreas(parsedOf([featureOf([outer, hole])]))
		expect(strata[0].areaHa).toBeCloseTo(300, 6)
	})

	it('sums MultiPolygon parts', () => {
		const a = featureOf([utmSquare(48, 499980, 4100040, 1000)])
		const b = {
			type: 'Feature',
			properties: { STRATA: 'S1' },
			geometry: { type: 'MultiPolygon', coordinates: [[utmSquare(48, 500980, 4100040, 500)]] }
		}
		const { strata } = computeStrataAreas(parsedOf([a, b]))
		expect(strata[0].areaHa).toBeCloseTo(125, 4)
		expect(strata[0].polygons).toHaveLength(2)
	})

	it('warns on zero-area polygons', () => {
		const degenerate = featureOf([[[0, 0], [0, 0], [0, 0], [0, 0]]])
		const { warnings } = computeStrataAreas(parsedOf([degenerate]))
		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('zero-area')
	})
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/utm-area.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/utm-area.js`**

```js
/**
 * Planar area computation for land cover strata. Reprojects WGS84
 * polygons into the UTM zone of the dataset centroid (EPSG 326xx north /
 * 327xx south) and sums shoelace ring areas — exterior rings positive,
 * holes subtracted. Chosen over geodesic area deliberately: more accurate
 * at strata scale and matches standard GIS practice.
 */

import proj4 from 'proj4'

/** UTM zone for a WGS84 coordinate. */
export function utmZone(lon, lat) {
	const zone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1))
	const south = lat < 0
	return { zone, epsg: (south ? 32700 : 32600) + zone, south }
}

function ringCentroid(ring) {
	let x = 0
	let y = 0
	for (const [lon, lat] of ring) {
		x += lon
		y += lat
	}
	return [x / ring.length, y / ring.length]
}

function featureCentroid(feature) {
	const polys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
	let x = 0
	let y = 0
	let n = 0
	for (const rings of polys) {
		for (const poly of rings) {
			const [cx, cy] = ringCentroid(poly)
			x += cx
			y += cy
			n++
		}
	}
	return n === 0 ? [0, 0] : [x / n, y / n]
}

function ringAreaM2(ring) {
	let sum = 0
	for (let i = 0; i < ring.length - 1; i++) {
		sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
	}
	return sum / 2
}

/**
 * Compute per-stratum areas (ha) from parsed GeoJSON.
 * @param {{ok: true, strata: Array<{name, featureCount, features}>}} parsed
 * @returns {{strata: Array<{name, featureCount, areaHa, polygons}>, warnings: string[]}}
 */
export function computeStrataAreas(parsed) {
	const centroids = parsed.strata.flatMap((s) => s.features.map(featureCentroid))
	const [clon, clat] = [
		centroids.reduce((sum, c) => sum + c[0], 0) / centroids.length,
		centroids.reduce((sum, c) => sum + c[1], 0) / centroids.length
	]
	const { zone, south } = utmZone(clon, clat)
	const project = proj4('EPSG:4326', `+proj=utm +zone=${zone}${south ? ' +south' : ''} +datum=WGS84 +units=m`)

	const warnings = []
	const strata = parsed.strata.map((s) => {
		const polygons = s.features.flatMap((feature) =>
			feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
		)
		const areaM2 = polygons.reduce((sum, rings) => sum + polygonFeatureAreaM2(rings, project), 0)
		const areaHa = areaM2 / 10000
		if (!(areaHa > 0)) warnings.push(`Stratum "${s.name}": zero-area geometry.`)
		return { name: s.name, featureCount: s.featureCount, areaHa, polygons }
	})
	return { strata, warnings }
}

function polygonFeatureAreaM2(rings, project) {
	return rings.reduce((sum, ring, i) => {
		const projected = ring.map(([lon, lat]) => project([lon, lat]))
		const value = Math.abs(ringAreaM2(projected))
		return sum + (i === 0 ? value : -value)
	}, 0)
}
```

Note: `polygonFeatureAreaM2` must be defined (it is, below) and there is no other area helper in this file — keep exactly one.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/utm-area.test.js`
Expected: PASS (the 1 km² square must match 100 ha to 6 decimal places).

- [ ] **Step 6: Full test sweep and commit**

Run: `npm run test`
Expected: all green.
Then:

```bash
git add src/lib/utm-area.js tests/utm-area.test.js package.json package-lock.json bun.lock
git commit -m "Add UTM-zone planar area computation for land cover strata"
```

---

### Task 4: GEE config and client (`src/lib/gee-config.js`, `src/lib/gee.js`)

**Files:**
- Create: `src/lib/gee-config.js`
- Create: `src/lib/gee.js`
- Modify: `index.html` (add GIS script)
- Modify: `package.json` (via `npm install @google/earthengine`)

**Interfaces:**
- Consumes: `computeStrataAreas` output rows `{ name, areaHa, polygons }` (Task 3).
- Produces:
```js
// gee-config.js
export const GEE_OAUTH_CLIENT_ID   // string, 'xxx.apps.googleusercontent.com'
export const CTREES_ASSET          // 'projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M'
export const CARBON_CONVERSION     // 0.5
export const MIN_BIOMASS_PIXELS    // 30

// gee.js
signIn(onAuthLost)                 // → Promise<string> resolves to access token
isSignedIn()                       // → boolean
eeInitialized()                    // → boolean
computeZonalStats(rows, year)      // rows = [{name, polygons}]; year = number
// → Promise<{ year, stats: Map<string, { mean, sd, pixelCount }> }>
//   mean/sd already × CARBON_CONVERSION (t C/ha); missing stats absent from the map.
```
- **Never import `gee.js` from tests or from `App.svelte`'s render path — only from `LandCoverTab.svelte` event handlers.** Module scope must not touch `window`/`google`/`ee` (the smoke test server-renders `App.svelte`).

- [ ] **Step 1: Manual prerequisite — create the OAuth client ID (one-time, human-only)**

Do this in a browser (cannot be automated):

1. Google Cloud Console → create/select a project → **APIs & Services → Library** → enable **Earth Engine API**.
2. **APIs & Services → OAuth consent screen**: External, app name "Sample Plot Calculator", add scope `https://www.googleapis.com/auth/earthengine`. Status can stay **Testing** — add your own Google account (and any test users) under **Audience → Test users**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:5173` and `https://sample-plot-calculator.vercel.app`
4. Copy the client ID (`…​.apps.googleusercontent.com`).

- [ ] **Step 2: Install the EE client**

Run: `npm install @google/earthengine`
Expected: `devDependencies` gains `@google/earthengine` (v1.7.x).

- [ ] **Step 3: Create `src/lib/gee-config.js`**

```js
/**
 * Google Earth Engine integration constants. The OAuth client ID is
 * public by design (token-client web flow); there are no secrets in this
 * app. See docs/superpowers/specs/2026-09-28-landcover-strata-tab-design.md
 * for the Cloud Console setup steps.
 */

export const GEE_OAUTH_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'

export const GEE_SCOPE = 'https://www.googleapis.com/auth/earthengine'

export const CTREES_ASSET = 'projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M'

export const CTREES_SCALE_M = 100

/** AGB → carbon, per the CTrees data brief. */
export const CARBON_CONVERSION = 0.5

/** Strata with fewer valid biomass pixels import as excluded (null stats). */
export const MIN_BIOMASS_PIXELS = 30
```

Replace `YOUR_CLIENT_ID…` with the value from Step 1.

- [ ] **Step 4: Add the GIS script to `index.html`**

In `index.html`, inside `<head>` after the favicon link:

```html
    <script src="https://accounts.google.com/gsi/client" async></script>
```

- [ ] **Step 5: Create `src/lib/gee.js`**

```js
/**
 * Browser-only Google Earth Engine client: Google Identity Services
 * sign-in (per-user OAuth, token held in memory, silent refresh before
 * expiry), EE JS client initialization, and CTrees zonal statistics.
 * Import only from LandCoverTab.svelte — never from tests or SSR paths.
 *
 * Note: ee.Reducer / ee.Image.reduceRegions exist only AFTER
 * ee.initialize() fetches the algorithm registry — all EE calls here run
 * post-initialization.
 */

import ee from '@google/earthengine'
import {
	CARBON_CONVERSION,
	CTREES_ASSET,
	CTREES_SCALE_M,
	GEE_OAUTH_CLIENT_ID,
	GEE_SCOPE
} from './gee-config.js'

let tokenClient = null
let accessToken = null
let tokenExpiresAt = 0
let authLostHandler = null

const REFRESH_MARGIN_S = 300

function ensureGis() {
	if (typeof google === 'undefined' || !google.accounts?.oauth2) {
		throw new Error('Google sign-in is unavailable — the accounts.google.com script was blocked or has not loaded yet.')
	}
}

function ensureTokenClient() {
	ensureGis()
	tokenClient ??= google.accounts.oauth2.initTokenClient({
		client_id: GEE_OAUTH_CLIENT_ID,
		scope: GEE_SCOPE,
		callback: () => {},
		error_callback: () => {}
	})
	return tokenClient
}

function requestToken(prompt) {
	return new Promise((resolve, reject) => {
		const client = ensureTokenClient()
		client.callback = (response) => {
			if (response.error) {
				reject(new Error(response.error_description ?? response.error))
				return
			}
			accessToken = response.access_token
			tokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
			scheduleSilentRefresh()
			resolve(accessToken)
		}
		client.error_callback = (event) => {
			if (event?.type === 'popup_closed') reject(new Error('Sign-in popup was closed.'))
			else reject(new Error('Sign-in popup failed to open — allow popups for this site.'))
		}
		client.requestAccessToken(prompt === undefined ? undefined : { prompt })
	})
}

function scheduleSilentRefresh() {
	const delay = tokenExpiresAt - Date.now() - REFRESH_MARGIN_S
	if (delay <= 0) return
	setTimeout(async () => {
		try {
			await requestToken('')
			// Force the EE client to re-initialize with the fresh token.
			initPromise = null
		} catch {
			accessToken = null
			authLostHandler?.()
		}
	}, delay)
}

/** Interactive sign-in. Rejects with a human-readable message on denial/close. */
export function signIn(onAuthLost) {
	authLostHandler = onAuthLost
	return requestToken(undefined)
}

export function isSignedIn() {
	return accessToken !== null && Date.now() < tokenExpiresAt
}

let initPromise = null

/** Initialize the EE client with the current token. Safe to call repeatedly. */
export function initEarthEngine() {
	if (initPromise) return initPromise
	initPromise = new Promise((resolve, reject) => {
		ee.data.setAuthToken(
			GEE_OAUTH_CLIENT_ID,
			'Bearer',
			accessToken,
			Math.max(1, Math.round((tokenExpiresAt - Date.now()) / 1000)),
			null,
			() => ee.initialize(null, null, resolve, reject),
			false,
			false
		)
	})
	return initPromise
}

export function eeInitialized() {
	return initPromise !== null
}

/**
 * Zonal mean / SD / pixel count of CTrees AGB per stratum.
 * @param {Array<{name: string, polygons: number[][][][]}>} rows
 * @param {number} year  calendar year to read from the collection's `year` property
 * @returns {Promise<{year: number, stats: Map<string, {mean, sd, pixelCount}>}>}
 */
export async function computeZonalStats(rows, year) {
	await initEarthEngine()

	const collection = ee.ImageCollection(CTREES_ASSET)
	const image = year
		? collection.filter(ee.Filter.eq('year', year)).first()
		: collection.sort('system:time_start', false).first()
	if (!image) throw new Error(`No CTrees image found for year ${year ?? 'latest'}.`)

	const yearUsed = Number(await new Promise((resolve, reject) => image.get('year').getInfo((v, e) => (e ? reject(new Error(e)) : resolve(v)))))
	const scaled = ee.Image(image).multiply(ee.Image(image).getNumber('agb_scale_factor'))
	const agb = scaled.updateMask(scaled.gt(0))

	const fc = ee.FeatureCollection(
		rows.map((row) => ({
			type: 'Feature',
			properties: { STRATA: row.name },
			geometry: { type: 'MultiPolygon', coordinates: row.polygons }
		}))
	)
	const reducer = ee.Reducer.mean()
		.combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })
		.combine({ reducer2: ee.Reducer.count(), sharedInputs: true })
	const stats = agb.reduceRegions({ collection: fc, reducer, scale: CTREES_SCALE_M })

	const result = await new Promise((resolve, reject) => {
		stats.evaluate((value, error) => (error ? reject(new Error(error)) : resolve(value)))
	})

	const byName = new Map()
	for (const feature of result?.features ?? []) {
		const name = feature.properties?.STRATA
		const meanMg = feature.properties?.agb_mean
		const sdMg = feature.properties?.agb_stdDev
		const pixelCount = feature.properties?.agb_count ?? 0
		if (typeof name !== 'string') continue
		if (typeof meanMg !== 'number' || typeof sdMg !== 'number' || pixelCount === 0) continue
		byName.set(name, {
			mean: meanMg * CARBON_CONVERSION,
			sd: sdMg * CARBON_CONVERSION,
			pixelCount
		})
	}
	return { year: yearUsed, stats: byName }
}
```

- [ ] **Step 6: Verify node tests still pass and the build works**

Run: `npm run test && npm run build`
Expected: PASS — proving `gee.js` never executes in node (nothing imports it yet).

- [ ] **Step 7: Commit**

```bash
git add src/lib/gee-config.js src/lib/gee.js index.html package.json package-lock.json bun.lock
git commit -m "Add per-user GEE client: GIS sign-in, silent refresh, CTrees zonal stats"
```

**Manual verification (record result in the task, not automatable):** `npm run dev`, open the tab (still the placeholder — EE not wired yet); confirm no console errors from the GIS script, and confirm the build preview serves. Full end-to-end sign-in happens in Task 5.

---

### Task 5: `LandCoverTab.svelte` and wiring

**Files:**
- Create: `src/components/LandCoverTab.svelte`
- Modify: `src/components/StrataPanel.svelte:4-28`
- Test: `tests/app.smoke.test.js`

**Interfaces:**
- Consumes: `parseLandCoverGeoJson` (Task 2), `computeStrataAreas` (Task 3), `signIn`, `isSignedIn`, `computeZonalStats` (Task 4), `GEE_OAUTH_CLIENT_ID` placeholder check, `MIN_BIOMASS_PIXELS`.
- Produces: `project.strata` rows shaped `{ id, name, area, areaHa→area, mean, varianceInput, provenance }` where provenance is `{ source: 'ctrees-agb-100m', year, scale: 100, accessed: 'YYYY-MM-DD' }`; strata below `MIN_BIOMASS_PIXELS` (or absent from the stats map) get `mean: null, varianceInput: { mode: 'sd', value: null }` — the existing calculator flags them "EXCLUDED" with issues automatically (verified: `Number(null) → 0` fails the `> 0` guards in `calculator.js:45-49`).

- [ ] **Step 1: Update the smoke test**

In `tests/app.smoke.test.js`, replace the placeholder-oriented tab test's expectations by adding to the second test (keep the existing three `toContain` assertions — they still hold):

```js
	it('renders the strata source tabs', () => {
		const { body } = render(App)
		expect(body).toContain('Manual inputs')
		expect(body).toContain('From CSV')
		expect(body).toContain('From land cover')
		expect(body).toContain('Sign in with Google')
	})
```

Run: `npx vitest run tests/app.smoke.test.js`
Expected: FAIL — the land cover tab still renders the "Coming soon" card.

- [ ] **Step 2: Create `src/components/LandCoverTab.svelte`**

Pattern after `CsvImportTab.svelte` (same drop-zone button, same amber error dialog, same `$lib` imports). All GEE calls happen inside event handlers only.

```svelte
<script>
	import UploadIcon from '@lucide/svelte/icons/upload'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { parseLandCoverGeoJson } from '$lib/geojson.js'
	import { computeStrataAreas } from '$lib/utm-area.js'
	import { MIN_BIOMASS_PIXELS } from '$lib/gee-config.js'
	import { computeZonalStats, isSignedIn, signIn } from '$lib/gee.js'

	let { project = $bindable() } = $props()

	let fileInput
	let errors = $state(null)
	let parsed = $state(null) // { strata: [{name, featureCount, areaHa, polygons}], warnings }
	let authState = $state('signed-out') // 'signed-out' | 'signed-in'
	let phase = $state('idle') // 'idle' | 'computing' | 'done'

	async function onFile(file) {
		if (!file) return
		errors = null
		parsed = null
		phase = 'idle'
		let text
		try {
			text = await file.text()
		} catch {
			errors = ['Could not read the selected file.']
			return
		}
		const geojson = parseLandCoverGeoJson(text)
		if (!geojson.ok) {
			errors = geojson.errors
			return
		}
		const areas = computeStrataAreas(geojson)
		if (areas.strata.every((s) => !(s.areaHa > 0))) {
			errors = ['No stratum has a measurable area — check the geometry.']
			return
		}
		parsed = areas
	}

	function onChange(event) {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		onFile(file)
	}

	function onDrop(event) {
		event.preventDefault()
		onFile(event.dataTransfer?.files?.[0])
	}

	async function onSignIn() {
		errors = null
		try {
			await signIn(() => (authState = 'signed-out'))
			authState = 'signed-in'
		} catch (error) {
			errors = [error.message]
		}
	}

	function mapGeeError(error) {
		const message = String(error?.message ?? error)
		if (/403|PERMISSION_DENIED|disabled|has not been used/i.test(message)) {
			return 'Earth Engine is not available for this Google account. Register at https://code.earthengine.google.com/register, then sign in again.'
		}
		return `Zonal statistics failed: ${message}`
	}

	async function onCompute() {
		if (!parsed) return
		phase = 'computing'
		errors = null
		try {
			const { year, stats } = await computeZonalStats(parsed.strata)
			const accessed = new Date().toISOString().slice(0, 10)
			project.strata = parsed.strata.map((s) => {
				const stat = stats.get(s.name)
				const usable = stat && stat.pixelCount >= MIN_BIOMASS_PIXELS
				return {
					id: crypto.randomUUID(),
					name: s.name,
					area: s.areaHa,
					mean: usable ? stat.mean : null,
					varianceInput: { mode: 'sd', value: usable ? stat.sd : null },
					provenance: { source: 'ctrees-agb-100m', year, scale: 100, accessed }
				}
			})
			phase = 'done'
		} catch (error) {
			phase = 'idle'
			errors = [mapGeeError(error)]
		}
	}
</script>

<Card.Root class="plate gap-4 py-4">
	<Card.Header class="px-4">
		<Card.Title class="engraved">Derive strata from land cover</Card.Title>
		<Card.Description>
			Upload a GeoJSON whose features carry a STRATA property. Areas are computed in the local UTM
			zone; biomass statistics use CTrees Global AGB 100 m (latest year) via Earth Engine with your
			Google account. Replaces all strata.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3 px-4">
		<button
			type="button"
			class="flex h-24 w-full flex-col items-center justify-center gap-2 border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={() => fileInput.click()}
			ondragover={(event) => event.preventDefault()}
			{onDrop}
		>
			<UploadIcon class="size-4" />
			<span class="engraved">Drop a .geojson here or click to browse</span>
		</button>

		{#if parsed}
			<table class="w-full font-mono text-sm tabular-nums">
				<thead>
					<tr class="engraved border-b text-left">
						<th class="py-1 pr-4 font-normal">Stratum</th>
						<th class="py-1 pr-4 text-right font-normal">Area, ha</th>
						<th class="py-1 text-right font-normal">Features</th>
					</tr>
				</thead>
				<tbody>
					{#each parsed.strata as stratum (stratum.name)}
						<tr class="border-b border-border/50">
							<td class="py-1 pr-4">{stratum.name}</td>
							<td class="py-1 pr-4 text-right">{stratum.areaHa.toFixed(2)}</td>
							<td class="py-1 text-right">{stratum.featureCount}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#each parsed.warnings as warning (warning)}
				<p class="engraved text-destructive">{warning}</p>
			{/each}

			<div class="flex items-center gap-3">
				{#if authState === 'signed-in'}
					<Button size="sm" disabled={phase === 'computing'} onclick={onCompute}>
						{phase === 'computing' ? 'Computing zonal statistics…' : 'Compute biomass statistics'}
					</Button>
				{:else}
					<Button variant="outline" size="sm" onclick={onSignIn}>Sign in with Google</Button>
					<span class="engraved">Required to run Earth Engine zonal statistics</span>
				{/if}
			</div>
		{/if}

		{#if phase === 'done'}
			<p class="engraved text-primary">
				{project.strata.length} strata imported from CTrees AGB — switch to Manual inputs to review
				(excluded strata have too few biomass pixels)
			</p>
			<p class="engraved">
				Source: CTrees Global Aboveground Biomass 100 m, CC-BY 4.0, non-peer-reviewed preprint.
				Values are t C/ha (AGB × 0.5); SD is a remote-sensing proxy, not field-measured.
			</p>
		{/if}
	</Card.Content>
</Card.Root>

<input
	bind:this={fileInput}
	type="file"
	accept=".geojson,.json,application/geo+json,application/json"
	class="hidden"
	onchange={onChange}
/>

{#if errors}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button
			type="button"
			aria-label="Dismiss import error dialog"
			class="absolute inset-0 bg-background/70"
			onclick={() => (errors = null)}
		></button>
		<div role="dialog" aria-modal="true" aria-label="Land cover import errors" class="plate relative mx-4 max-h-[70vh] w-full max-w-lg gap-3 bg-card p-4">
			<span class="engraved text-destructive">Check — not imported</span>
			<ul class="max-h-[45vh] overflow-y-auto py-1 font-mono text-sm tabular-nums">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
			<div class="flex justify-end">
				<Button variant="outline" size="sm" onclick={() => (errors = null)}>Close</Button>
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={(event) => event.key === 'Escape' && (errors = null)} />
```

- [ ] **Step 3: Wire the tab into `StrataPanel.svelte`**

Replace the placeholder `{:else}` branch (lines 23–27) and add the import at the top:

```js
	import LandCoverTab from './LandCoverTab.svelte'
```

```svelte
	{:else}
		<LandCoverTab bind:project />
	{/if}
```

(Delete the now-unused `Card` import in `StrataPanel.svelte` if nothing else in the file references it.)

- [ ] **Step 4: Run tests and build**

Run: `npm run test && npm run build`
Expected: PASS — including the updated smoke test rendering `Sign in with Google` in SSR without executing any GEE code.

- [ ] **Step 5: Commit**

```bash
git add src/components/LandCoverTab.svelte src/components/StrataPanel.svelte tests/app.smoke.test.js
git commit -m "Replace land cover placeholder with GeoJSON upload + GEE zonal stats tab"
```

**Manual end-to-end verification (human-only, needs the OAuth client ID from Task 4 Step 1 and a Google account with Earth Engine registered):**

1. `npm run dev` → From land cover tab → upload `tests/fixtures/three-strata.geojson` → preview shows 2 strata with areas (~90 ha / ~25 ha).
2. Click **Sign in with Google** → consent popup → returns to signed-in state.
3. Click **Compute biomass statistics** → strata import; the Jakarta-area dense forest should show a mean well above agroforestry.
4. Wait 60+ min (or force by shortening the token in dev) → confirm silent refresh keeps the session; sign out of Google entirely → confirm the UI returns to "Sign in with Google".
5. Sign in with a Google account **without** EE registered → confirm the friendly registration error appears.
6. Export JSON (Save) → reload the page → confirm strata and provenance survive; Open the JSON on a fresh origin → same.

---

### Task 6: Documentation (AGENTS.md, README)

**Files:**
- Modify: `AGENTS.md` (code organization + testing strategy + security sections)
- Modify: `README.md` (feature list)

**Interfaces:**
- Consumes: all prior tasks complete.
- Produces: docs matching final reality.

- [ ] **Step 1: Update `AGENTS.md`**

In the code-organization block add under `lib/`:

```
    geojson.js              land cover GeoJSON parsing/validation (STRATA property,
                            polygon grouping) — pure, node-testable
    utm-area.js             planar area in the dataset's UTM zone (proj4) — pure
    gee-config.js           EE constants: public OAuth client ID, CTrees asset, ×0.5
    gee.js                  browser-only per-user GEE auth (GIS token client, silent
                            refresh) + CTrees zonal stats — import only from
                            LandCoverTab.svelte, never from tests
```

And under `components/`:

```
    LandCoverTab.svelte       GeoJSON upload → area preview → GEE biomass stats
```

Extend "Testing strategy" with:

```
- tests/geojson.test.js / tests/utm-area.test.js — fixture-driven tests of the
  land cover parsing and UTM area modules. tests/fixtures/three-strata.geojson
  is also the manual end-to-end fixture.
- gee.js is browser-only by construction (imports @google/earthengine and
  touches window/google/ee); it must never be imported from node tests or from
  SSR-reachable module scope.
```

Extend "Security and data considerations" with:

```
- Earth Engine access is per-user OAuth (GIS token client): each user signs in
  with their own Google account; the OAuth client ID in gee-config.js is public
  by design and no secret exists anywhere. Tokens live in memory only and are
  silently refreshed before their 1 h expiry.
```

- [ ] **Step 2: Update `README.md`**

Add a bullet under the feature list (match existing style):

```
- "From land cover" tab: derive strata from a GeoJSON with a STRATA property —
  UTM-zone area calculation, then per-user Google-authenticated Earth Engine
  zonal statistics against CTrees Global AGB 100 m (latest year) for mean and
  SD (t C/ha)
```

- [ ] **Step 3: Final verification**

Run: `npm run test && npm run build`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "Document land cover tab modules, GEE auth model, and tests"
```

---

## Self-Review Notes (already applied)

- **Spec coverage:** upload+validation (T2), UTM areas (T3), per-user OAuth + silent re-auth + no-server-key (T4), zonal stats + ×0.5 + latest year + <30-pixel guard + RS-proxy/preprint labeling (T4/T5), provenance through JSON (T5), results-CSV guard (T1), error handling dialogs (T2/T5), testing (all), docs (T6). Non-goals (shp/GPKG, year selection, map preview) are excluded everywhere.
- **Type consistency:** `parseLandCoverGeoJson` → `computeStrataAreas` → `computeZonalStats` signatures verified across tasks; `agb_mean`/`agb_stdDev`/`agb_count` property names match the combined-reducer convention; `STRATA` property name matches between upload and EE feature properties.
- **Known runtime uncertainty:** the exact server error string for "Google account has no EE registration" is server-side; `mapGeeError` matches on 403/PERMISSION_DENIED/disabled patterns and the manual test in Task 5 Step 5 pins the real message (adjust the regex there if needed).
