/**
 * Pure calculation core for the CDM A/R sample plot calculator.
 * Implements the CDM A/R Methodological Tool "Calculation of the number of
 * sample plots for measurements within A/R CDM project activities" v2.1.0
 * (EB 58, Annex 15), with the Winrock Excel tool's Student's t
 * iteration (t at infinite df first; if n < 30, t at df = n−1) and
 * round-to-nearest plot counts per stratum (values below 0.5 round to 0).
 */

import { tValue } from './t-table.js'

/** Confidence presets matching the original Excel tool (t at infinite df). */
export const CONFIDENCE_PRESETS = [
	{ value: '0.80', label: '80%', z: 1.28 },
	{ value: '0.90', label: '90%', z: 1.645 },
	{ value: '0.95', label: '95%', z: 1.96 },
	{ value: '0.98', label: '98%', z: 2.33 },
	{ value: '0.99', label: '99%', z: 2.576 }
]

export const SAMPLE_FRACTION_THRESHOLD = 0.05

/**
 * Standard deviation for a stratum from its variance input.
 * CV mode: SD = CV% × mean / 100. Returns null when not derivable.
 */
export function sdFromInput(varianceInput, mean) {
	const value = Number(varianceInput?.value)
	if (!Number.isFinite(value) || value < 0) return null
	if (varianceInput.mode === 'cv') {
		if (!(mean > 0)) return null
		return (value * mean) / 100
	}
	return value
}

/** Coefficient of variation (%) for a stratum. */
export function cvFromSd(sd, mean) {
	if (!(mean > 0) || !(sd >= 0)) return null
	return (sd / mean) * 100
}

function stratumIssues(stratum) {
	const issues = []
	if (!(Number(stratum.area) > 0)) issues.push('Area must be greater than 0')
	if (!(Number(stratum.mean) > 0)) issues.push('Mean must be greater than 0')
	if (sdFromInput(stratum.varianceInput, Number(stratum.mean)) === null) {
		issues.push(stratum.varianceInput?.mode === 'cv' ? 'CV requires a mean > 0' : 'Standard deviation is missing or invalid')
	}
	return issues
}

/**
 * Compute the full result set for a project. Pure: no I/O, no mutation.
 *
 * @param {object} project  { precisionLevel, zValue, plotSize, strata: [...] }
 * @returns results object with per-stratum rows (active and excluded),
 *          weighted statistics, n (raw and rounded), method label and totals.
 */
export function computeProject(project) {
	const precision = Number(project.precisionLevel)
	const z = Number(project.zValue)
	const plotSize = Number(project.plotSize)
	const backupPct = Math.max(0, Number(project.backupPercentage) || 0)

	const strata = (project.strata ?? []).map((stratum) => {
		const issues = stratumIssues(stratum)
		const area = Number(stratum.area)
		const mean = Number(stratum.mean)
		const sd = issues.length === 0 ? sdFromInput(stratum.varianceInput, mean) : null
		return {
			...stratum,
			area,
			mean,
			sd,
			cv: sd !== null ? cvFromSd(sd, mean) : null,
			variance: sd !== null ? sd * sd : null,
			excluded: issues.length > 0,
			issues
		}
	})

	const active = strata.filter((s) => !s.excluded)
	const totalArea = active.reduce((sum, s) => sum + s.area, 0)

	// Confidence presets look t up from the standardized table (t-table.js,
	// lifted from the original Excel tool); "custom" uses the fixed value.
	const preset = CONFIDENCE_PRESETS.find((p) => p.value === String(project.confidenceLevel))
	const tFor = (df) => (preset ? tValue(preset.value, df) : z)
	const tAvailable = preset !== undefined || z > 0

	if (
		active.length === 0 ||
		!(plotSize > 0) ||
		!(precision > 0) ||
		!tAvailable ||
		!(totalArea > 0)
	) {
		return {
			strata,
			activeCount: active.length,
			totalArea,
			totalPossiblePlots: plotSize > 0 && totalArea > 0 ? totalArea / plotSize : null,
			weightedMean: null,
			allowableError: null,
			weightedSd: null,
			weightedVariance: null,
			nRaw: null,
			nRounded: null,
			method: null,
			sampledFraction: null,
			tUsed: null,
			degreesOfFreedom: null,
			totalPlots: active.length,
			totalBackups: 0,
			totalAllocation: active.length
		}
	}

	const weights = active.map((s) => s.area / totalArea)
	const weightedMean = active.reduce((sum, s, i) => sum + weights[i] * s.mean, 0)
	const allowableError = weightedMean * precision
	const weightedSd = active.reduce((sum, s, i) => sum + weights[i] * s.sd, 0)
	const weightedVariance = active.reduce((sum, s, i) => sum + weights[i] * s.sd * s.sd, 0)

	const totalPossiblePlots = totalArea / plotSize
	const sumWs = weightedSd
	const sumWs2 = weightedVariance

	// Sample size for a given t value. Equation 2 (finite population
	// correction): n = N·t²·(Σ w_i·s_i)² / (N·E² + t²·Σ w_i·s_i²)
	// Equation 3 (simplified, when the sampled fraction is below 5%):
	// n = (t/E)² · (Σ w_i·s_i)²
	function computeN(t) {
		const t2 = t * t
		const nFpc =
			(totalPossiblePlots * t2 * sumWs * sumWs) /
			(totalPossiblePlots * allowableError * allowableError + t2 * sumWs2)
		if (nFpc / totalPossiblePlots < SAMPLE_FRACTION_THRESHOLD) {
			return { n: (t2 / (allowableError * allowableError)) * sumWs * sumWs, method: 'simplified' }
		}
		return { n: nFpc, method: 'fpc' }
	}

	// The methodology specifies Student's t: first iteration at infinite
	// degrees of freedom; if n < 30, a second (final) iteration at df = n−1.
	let tUsed = tFor(Infinity)
	let degreesOfFreedom = null
	let { n: nRaw, method } = computeN(tUsed)
	if (preset && nRaw < 30) {
		degreesOfFreedom = Math.max(1, Math.floor(nRaw) - 1)
		tUsed = tFor(degreesOfFreedom)
		;({ n: nRaw, method } = computeN(tUsed))
	}
	const nRounded = Math.ceil(nRaw)
	const sampledFraction = nRaw / totalPossiblePlots

	// Neyman allocation: n_i = n · (A_i·s_i) / Σ (A_i·s_i)
	const allocationBase = active.reduce((sum, s) => sum + s.area * s.sd, 0)
	for (const s of active) {
		s.weight = s.area / totalArea
		s.ni = allocationBase > 0 ? (nRaw * s.area * s.sd) / allocationBase : 0
		s.niRounded = Math.round(s.ni)
		s.backupPlots = Math.ceil(s.niRounded * backupPct)
		s.totalAllocation = s.niRounded + s.backupPlots
	}
	for (const s of strata) {
		if (s.excluded) {
			s.weight = null
			s.ni = null
			s.niRounded = null
			s.backupPlots = null
			s.totalAllocation = null
		}
	}

	return {
		strata,
		activeCount: active.length,
		totalArea,
		totalPossiblePlots,
		weightedMean,
		allowableError,
		weightedSd,
		weightedVariance,
		nRaw,
		nRounded,
		method,
		sampledFraction,
		tUsed,
		degreesOfFreedom,
		totalPlots: active.reduce((sum, s) => sum + s.niRounded, 0),
		totalBackups: active.reduce((sum, s) => sum + s.backupPlots, 0),
		totalAllocation: active.reduce((sum, s) => sum + s.totalAllocation, 0)
	}
}
