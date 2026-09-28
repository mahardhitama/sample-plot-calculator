/** Local persistence and import/export. All functions are guarded for non-browser use. */

export const STORAGE_KEY = 'sample-plot-calculator:project'

export function loadProject() {
	if (typeof localStorage === 'undefined') return null
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		return { backupPercentage: 0, ...parsed }
	} catch {
		return null
	}
}

export function saveProject(project) {
	if (typeof localStorage === 'undefined') return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
	} catch {
		// storage full or unavailable — editing continues without persistence
	}
}

export function debounce(fn, delay = 500) {
	let timer
	return (...args) => {
		clearTimeout(timer)
		timer = setTimeout(() => fn(...args), delay)
	}
}

function download(filename, content, type) {
	const blob = new Blob([content], { type })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = filename
	anchor.click()
	URL.revokeObjectURL(url)
}

export function exportProjectJson(project) {
	download(`${project.name || 'sample-plot-project'}.json`, JSON.stringify(project, null, 2), 'application/json')
}

export function importProjectJson(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			try {
				resolve(JSON.parse(reader.result))
			} catch {
				reject(new Error('The selected file is not valid JSON.'))
			}
		}
		reader.onerror = () => reject(new Error('Could not read the selected file.'))
		reader.readAsText(file)
	})
}

function csvCell(value) {
	const text = value === null || value === undefined ? '' : String(value)
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Build a CSV of the results table from a computeProject() result. */
export function resultsToCsv(results) {
	const header = [
		'Stratum',
		'Area (ha)',
		'Mean (t C/ha)',
		'SD (t C/ha)',
		'CV (%)',
		'Variance',
		'Weight',
		'Plots (unrounded)',
		'Plots',
		'Backup plots',
		'Total allocation'
	]
	const rows = results.strata.map((s) => [
		s.name,
		s.excluded ? '' : s.area,
		s.excluded ? '' : s.mean,
		s.excluded ? '' : s.sd?.toFixed(4),
		s.excluded ? '' : s.cv?.toFixed(4),
		s.excluded ? '' : s.variance?.toFixed(4),
		s.excluded ? '' : s.weight?.toFixed(6),
		s.excluded ? '' : s.ni?.toFixed(4),
		s.excluded ? '' : s.niRounded,
		s.excluded ? '' : s.backupPlots,
		s.excluded ? '' : s.totalAllocation
	])
	const totals = [
		'Total',
		results.totalArea,
		results.weightedMean?.toFixed(4) ?? '',
		'',
		'',
		results.weightedVariance?.toFixed(4) ?? '',
		'',
		results.nRaw?.toFixed(4) ?? '',
		results.totalPlots,
		results.totalBackups,
		results.totalAllocation
	]
	return [header, ...rows, totals].map((row) => row.map(csvCell).join(',')).join('\n')
}

export function exportResultsCsv(results) {
	download('sample-plot-results.csv', resultsToCsv(results), 'text/csv')
}
