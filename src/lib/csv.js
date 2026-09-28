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
	if (header.includes('stratum') || header.includes('total allocation')) {
		return {
			ok: false,
			errors: [
				'This is a results export, not a strata file. Use Open (JSON) to reload a project, or the five-column strata CSV format.'
			]
		}
	}
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
