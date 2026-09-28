/** Project-level input validation. Per-stratum row issues are produced by the calculator. */

export function projectIssues(project) {
	const issues = []
	const precision = Number(project.precisionLevel)
	const z = Number(project.zValue)
	const plotSize = Number(project.plotSize)

	if (!(precision > 0) || precision >= 1) {
		issues.push('Precision must be a decimal fraction between 0 and 1 (e.g. 0.10 for 10%).')
	}
	if (!(z > 0)) {
		issues.push('Z-value must be greater than 0.')
	}
	if (!(plotSize > 0)) {
		issues.push('Plot size must be greater than 0 ha.')
	}
	return issues
}
