# Strata Source Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-tab source switcher (Manual inputs / From CSV / From land cover) to the strata ledger panel, where the CSV tab replaces `project.strata` from an uploaded five-column CSV with whole-file rejection and a per-row error dialog.

**Architecture:** A thin `StrataPanel.svelte` wrapper owns the tab state and renders the existing `StratumDataTable` under "Manual inputs", a new `CsvImportTab.svelte` under "From CSV", and a placeholder pane under "From land cover". All parsing lives in a pure, node-testable `src/lib/csv.js` mirroring `calculator.js` conventions.

**Tech Stack:** Svelte 5 runes, bits-ui ToggleGroup primitive (already generated in `src/lib/components/ui/toggle-group/`), Vitest (node environment), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-28-strata-source-tabs-design.md` (approved 2026-09-28).

## Global Constraints

- No new npm dependencies. The CSV parser is hand-rolled in `src/lib/csv.js`.
- Tabs for indentation; single quotes; match the surrounding file's semicolon style (lib files use no semicolons after the opening block comment).
- Import from the `$lib` alias, never relative paths into `src/lib`.
- Tests run in the **node** environment — no DOM, no `localStorage`, no browser APIs. `parseStrataCsv` must stay pure (string in, object out).
- Error message strings are part of the contract and are pinned verbatim in `tests/csv.test.js`:
  - `The file is empty.`
  - `The file has a header but no data rows.`
  - `Missing required column "<name>".`
  - `Row <n>: strata name is blank.`
  - `Row <n>: <column> "<raw>" is not a number.`
  - `Row <n>: variability "<raw>" must be "CV" or "SD".`
  - Row numbers are **data-row** numbers: the first row after the header is row 1.
- DESIGN.md hard rules: no drop shadows; amber (`--destructive`) only for warnings; labels engraved (`.engraved` class); plates separate by hairline; numerals in font-mono with tabular-nums.
- Successful import shape: `project.strata = result.strata.map((s) => ({ ...s, id: crypto.randomUUID() }))` — rows from `parseStrataCsv` never carry ids.
- The active tab is local `$state` in `StrataPanel.svelte`; it is **not** persisted.

---

### Task 1: Pure CSV parser (`src/lib/csv.js`)

**Files:**
- Create: `src/lib/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `parseStrataCsv(text)` → `{ ok: true, strata }` where each stratum is `{ name: string, area: number|null, mean: number|null, varianceInput: { mode: 'cv'|'sd', value: number|null } }`, or `{ ok: false, errors: string[] }`. The parser is **syntactic only**: unparseable input rejects; negative/zero numbers import as-is (the calculator flags them EXCLUDED later). Task 2 calls this function.

- [ ] **Step 1: Write the failing tests**

Create `tests/csv.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { parseStrataCsv } from '../src/lib/csv.js'

const GUIDEBOOK = `strata,area,mean_c_stock,variability,variability_value
Stratum 1,3400,126.8,CV,20.7
Stratum 2,900,85,CV,18.42
Stratum 3,700,102.2,CV,8.02`

describe('parseStrataCsv', () => {
	it('parses the guidebook example', () => {
		const result = parseStrataCsv(GUIDEBOOK)
		expect(result.ok).toBe(true)
		expect(result.strata).toEqual([
			{ name: 'Stratum 1', area: 3400, mean: 126.8, varianceInput: { mode: 'cv', value: 20.7 } },
			{ name: 'Stratum 2', area: 900, mean: 85, varianceInput: { mode: 'cv', value: 18.42 } },
			{ name: 'Stratum 3', area: 700, mean: 102.2, varianceInput: { mode: 'cv', value: 8.02 } }
		])
	})

	it('matches headers case-insensitively and ignores extra columns', () => {
		const result = parseStrataCsv(`Strata,Area,Mean_C_Stock,Variability,Variability_Value,Notes
Forest,-10,50,sd,12.5,excluded later by calculator`)
		expect(result.ok).toBe(true)
		expect(result.strata[0]).toEqual({
			name: 'Forest',
			area: -10,
			mean: 50,
			varianceInput: { mode: 'sd', value: 12.5 }
		})
	})

	it('handles quoted fields, embedded commas, and CRLF endings', () => {
		const result = parseStrataCsv('"strata","area","mean_c_stock","variability","variability_value"\r\n"Riparian, mixed",100,"60",CV,"15"')
		expect(result.ok).toBe(true)
		expect(result.strata[0].name).toBe('Riparian, mixed')
		expect(result.strata[0].mean).toBe(60)
	})

	it('rejects an empty file', () => {
		const result = parseStrataCsv('')
		expect(result).toEqual({ ok: false, errors: ['The file is empty.'] })
	})

	it('rejects a header-only file', () => {
		const result = parseStrataCsv('strata,area,mean_c_stock,variability,variability_value\n')
		expect(result).toEqual({ ok: false, errors: ['The file has a header but no data rows.'] })
	})

	it('rejects missing required columns', () => {
		const result = parseStrataCsv('strata,area,mean_c_stock\nA,10,50')
		expect(result.ok).toBe(false)
		expect(result.errors).toEqual([
			'Missing required column "variability".',
			'Missing required column "variability_value".'
		])
	})

	it('reports per-row problems with data-row numbering', () => {
		const result = parseStrataCsv(`strata,area,mean_c_stock,variability,variability_value
Good,100,60,CV,15
,abc,60,foo,
Bad,100,xyz,sd,12.5`)
		expect(result.ok).toBe(false)
		expect(result.errors).toEqual([
			'Row 2: strata name is blank.',
			'Row 2: area "abc" is not a number.',
			'Row 2: variability "foo" must be "CV" or "SD".',
			'Row 2: variability_value "" is not a number.',
			'Row 3: mean_c_stock "xyz" is not a number.'
		])
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/lib/csv.js'`.

- [ ] **Step 3: Implement the parser**

Create `src/lib/csv.js`:

```js
/**
 * CSV strata import. Pure parsing of the five-column strata schema
 * (strata, area, mean_c_stock, variability, variability_value) —
 * no I/O, no mutation. Syntactic validation only: structurally valid
 * but semantically odd numbers (negative area, zero variability) import
 * as-is and are flagged by the calculator like manual entries.
 */

const REQUIRED_COLUMNS = ['strata', 'area', 'mean_c_stock', 'variability', 'variability_value']

/** Split CSV text into records, honoring quotes per RFC 4180. */
function parseCsvRecords(text) {
	const records = []
	let record = []
	let field = ''
	let inQuotes = false
	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"'
					i++
				} else {
					inQuotes = false
				}
			} else {
				field += char
			}
		} else if (char === '"') {
			inQuotes = true
		} else if (char === ',') {
			record.push(field)
			field = ''
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') i++
			record.push(field)
			field = ''
			records.push(record)
			record = []
		} else {
			field += char
		}
	}
	if (field !== '' || record.length > 0) {
		record.push(field)
		records.push(record)
	}
	return records
}

/** Parse one numeric cell; pushes a row-tagged error and returns null when invalid. */
function parseNumberCell(raw, label, row, errors) {
	const text = (raw ?? '').trim()
	const value = Number(text)
	if (text === '' || !Number.isFinite(value)) {
		errors.push(`Row ${row}: ${label} "${text}" is not a number.`)
		return null
	}
	return value
}

/** Normalize the variability mode; pushes a row-tagged error and defaults to 'cv'. */
function parseModeCell(raw, row, errors) {
	const text = (raw ?? '').trim().toLowerCase()
	if (text === 'cv' || text === 'sd') return text
	errors.push(`Row ${row}: variability "${(raw ?? '').trim()}" must be "CV" or "SD".`)
	return 'cv'
}

/**
 * Parse CSV text into strata rows (without ids — the caller assigns them)
 * or a list of human-readable errors.
 */
export function parseStrataCsv(text) {
	const records = parseCsvRecords(String(text ?? '')).filter((record) =>
		record.some((field) => field.trim() !== '')
	)
	if (records.length === 0) return { ok: false, errors: ['The file is empty.'] }

	const header = records[0].map((cell) => cell.trim().toLowerCase())
	const errors = []
	for (const column of REQUIRED_COLUMNS) {
		if (!header.includes(column)) errors.push(`Missing required column "${column}".`)
	}
	if (errors.length > 0) return { ok: false, errors }
	if (records.length === 1) return { ok: false, errors: ['The file has a header but no data rows.'] }

	const index = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, header.indexOf(column)]))
	const strata = []
	records.slice(1).forEach((record, i) => {
		const row = i + 1
		const name = (record[index.strata] ?? '').trim()
		if (name === '') errors.push(`Row ${row}: strata name is blank.`)
		strata.push({
			name,
			area: parseNumberCell(record[index.area], 'area', row, errors),
			mean: parseNumberCell(record[index.mean_c_stock], 'mean_c_stock', row, errors),
			varianceInput: {
				mode: parseModeCell(record[index.variability], row, errors),
				value: parseNumberCell(record[index.variability_value], 'variability_value', row, errors)
			}
		})
	})
	if (errors.length > 0) return { ok: false, errors }
	return { ok: true, strata }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS (all 7 new tests plus existing suite green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.js tests/csv.test.js
git commit -m "Add pure CSV strata parser with strict row-level errors"
```

---

### Task 2: CSV import tab with error dialog (`src/components/CsvImportTab.svelte`)

**Files:**
- Create: `src/components/CsvImportTab.svelte`

**Interfaces:**
- Consumes: `parseStrataCsv` from `$lib/csv.js` (Task 1); `Button` from `$lib/components/ui/button/index.js`; icons from `@lucide/svelte`.
- Produces: `<CsvImportTab bind:project />` — one bindable prop, the project object. On success replaces `project.strata` with id-bearing rows and shows a confirmation line. On failure shows a modal dialog listing `errors`. Task 3 renders this component.

- [ ] **Step 1: Create the component**

Create `src/components/CsvImportTab.svelte`:

```svelte
<script>
	import UploadIcon from '@lucide/svelte/icons/upload'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { parseStrataCsv } from '$lib/csv.js'

	let { project = $bindable() } = $props()

	let fileInput
	let errors = $state(null)
	let importedCount = $state(null)

	async function onFile(file) {
		if (!file) return
		importedCount = null
		const result = parseStrataCsv(await file.text())
		if (!result.ok) {
			errors = result.errors
			return
		}
		project.strata = result.strata.map((s) => ({ ...s, id: crypto.randomUUID() }))
		errors = null
		importedCount = result.strata.length
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
</script>

<Card.Root class="plate gap-4 py-4">
	<Card.Header class="px-4">
		<Card.Title class="engraved">Import strata from CSV</Card.Title>
		<Card.Description>
			Replaces all strata — expected columns: strata, area, mean_c_stock, variability (CV or SD),
			variability_value
		</Card.Description>
	</Card.Header>
	<Card.Content class="px-4">
		<button
			type="button"
			class="flex h-24 w-full flex-col items-center justify-center gap-2 border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={() => fileInput.click()}
			ondragover={(event) => event.preventDefault()}
			{onDrop}
		>
			<UploadIcon class="size-4" />
			<span class="engraved">Drop a .csv here or click to browse</span>
		</button>
		{#if importedCount !== null}
			<p class="engraved mt-3 text-primary">
				{importedCount} strata imported — switch to Manual inputs to review
			</p>
		{/if}
	</Card.Content>
</Card.Root>

<input bind:this={fileInput} type="file" accept=".csv,text/csv" class="hidden" onchange={onChange} />

{#if errors}
	<!-- error dialog -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/70"
		onclick={() => (errors = null)}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="CSV import errors"
			class="plate mx-4 max-h-[70vh] w-full max-w-lg gap-3 bg-card p-4"
			onclick={(event) => event.stopPropagation()}
		>
			<span class="engraved text-destructive">Check — CSV not imported</span>
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

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (component isn't rendered by App yet, but Vite/Svelte compiles all reachable imports — a syntax error would fail here; if tree-shaking skips it, also run `npx vite build` again after Task 3 wires it in and treat that as the authoritative check).

- [ ] **Step 3: Commit**

```bash
git add src/components/CsvImportTab.svelte
git commit -m "Add CSV import tab with row-level error dialog"
```

---

### Task 3: Tab wrapper and App wiring (`src/components/StrataPanel.svelte`)

**Files:**
- Create: `src/components/StrataPanel.svelte`
- Modify: `src/App.svelte` (swap `<StratumDataTable bind:project {results} />` for `<StrataPanel bind:project {results} />`; update the import)
- Test: `tests/app.smoke.test.js`

**Interfaces:**
- Consumes: `StratumDataTable` (existing, untouched), `CsvImportTab` (Task 2), ToggleGroup primitive at `$lib/components/ui/toggle-group/index.js` (`Root` / `Item` with `type="single"` and `bind:value`).
- Produces: `<StrataPanel bind:project {results} />` — the drop-in replacement for `<StratumDataTable />` in `App.svelte`.

- [ ] **Step 1: Write the failing smoke-test assertions**

In `tests/app.smoke.test.js`, add a new `it` block inside the existing `describe`:

```js
	it('renders the strata source tabs', () => {
		const { body } = render(App)
		expect(body).toContain('Manual inputs')
		expect(body).toContain('From CSV')
		expect(body).toContain('From land cover')
	})
```

Run: `npm run test`
Expected: FAIL — the strings don't appear yet.

- [ ] **Step 2: Create the wrapper component**

Create `src/components/StrataPanel.svelte`:

```svelte
<script>
	import * as Card from '$lib/components/ui/card/index.js'
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
	import CsvImportTab from './CsvImportTab.svelte'
	import StratumDataTable from './StratumDataTable.svelte'

	let { project = $bindable(), results } = $props()

	let source = $state('manual')
</script>

<div class="space-y-3">
	<ToggleGroup.Root type="single" bind:value={source} variant="outline" size="sm">
		<ToggleGroup.Item value="manual" class="engraved">Manual inputs</ToggleGroup.Item>
		<ToggleGroup.Item value="csv" class="engraved">From CSV</ToggleGroup.Item>
		<ToggleGroup.Item value="landcover" class="engraved">From land cover</ToggleGroup.Item>
	</ToggleGroup.Root>

	{#if source === 'manual'}
		<StratumDataTable bind:project {results} />
	{:else if source === 'csv'}
		<CsvImportTab bind:project />
	{:else}
		<Card.Root class="plate flex flex-col items-center gap-2 py-16">
			<span class="engraved">Land cover import</span>
			<Card.Description>Coming soon — derive strata from a land cover / GIS classification.</Card.Description>
		</Card.Root>
	{/if}
</div>
```

- [ ] **Step 3: Wire into App.svelte**

In `src/App.svelte`:

- Change the import line `import StratumDataTable from './components/StratumDataTable.svelte'` to `import StrataPanel from './components/StrataPanel.svelte'`.
- Change `<StratumDataTable bind:project {results} />` to `<StrataPanel bind:project {results} />`.

- [ ] **Step 4: Run tests and build**

Run: `npm run test && npm run build`
Expected: all tests pass, including the new tab-labels smoke test; production build succeeds.

- [ ] **Step 5: Manual verification (dev server)**

Run: `npm run dev`, then in the browser: (a) default guidebook strata appear under "Manual inputs"; (b) switch to "From CSV", upload a valid five-column CSV — confirmation line appears, switching back to "Manual inputs" shows the imported strata and the readout updates; (c) upload a CSV with a bad row — dialog lists the errors, existing strata are unchanged; (d) Escape and backdrop click close the dialog; (e) "From land cover" shows the placeholder.

- [ ] **Step 6: Commit**

```bash
git add src/components/StrataPanel.svelte src/App.svelte tests/app.smoke.test.js
git commit -m "Add strata source tabs: manual inputs, CSV import, land cover placeholder"
```

---

## Self-Review Notes

- **Spec coverage:** tab switcher (Task 3), manual-inputs passthrough (Task 3), CSV upload + replace-all + dialog (Tasks 1–2), land cover placeholder (Task 3), parser semantics incl. data-row numbering (Task 1), smoke tests (Tasks 1, 3). Spec's "out of scope" items have no tasks — correct.
- **Type consistency:** `parseStrataCsv` return shape, error strings, and the id-assignment expression in `CsvImportTab` are identical across tasks and pinned in tests.
- **Placeholder scan:** no TBDs; every code step contains complete code. Task 2 Step 2 notes the authoritative compile check lands in Task 3 Step 4 — deliberate, since `CsvImportTab` isn't reachable from `App` until then.
