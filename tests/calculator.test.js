import { describe, it, expect } from 'vitest'
import { computeProject, sdFromInput } from '../src/lib/calculator.js'
import { tValue } from '../src/lib/t-table.js'

// Guidebook worked example: 3 strata, A = 5000 ha, p = 10%, z = 1.96
const exampleProject = {
	name: 'Guidebook example',
	precisionLevel: 0.1,
	confidenceLevel: '0.95',
	zValue: 1.96,
	plotSize: 0.25,
	strata: [
		{ name: 'Stratum 1', area: 3400, mean: 126.8, varianceInput: { mode: 'cv', value: 20.7 } },
		{ name: 'Stratum 2', area: 900, mean: 85, varianceInput: { mode: 'cv', value: 18.42 } },
		{ name: 'Stratum 3', area: 700, mean: 102.2, varianceInput: { mode: 'cv', value: 8.02 } }
	]
}

describe('computeProject — guidebook example', () => {
	const result = computeProject(exampleProject)

	it('computes total area and possible plots', () => {
		expect(result.totalArea).toBe(5000)
		expect(result.totalPossiblePlots).toBe(20000)
	})

	it('computes area-weighted mean carbon stock', () => {
		expect(result.weightedMean).toBeCloseTo(115.83, 1)
	})

	it('derives SD from CV (SD = CV × mean / 100)', () => {
		expect(result.strata[0].sd).toBeCloseTo(26.25, 2)
		expect(result.strata[2].sd).toBeCloseTo(8.2, 2)
	})

	it('uses the simplified equation when sampled fraction is below 5%', () => {
		expect(result.method).toBe('simplified')
		expect(result.sampledFraction).toBeLessThan(0.05)
	})

	it('iterates Student\'s t: first pass at infinite df, second at df = n−1', () => {
		// first pass n ≈ 13.6 (< 30) → second pass with t(12, 95%) = 2.179
		expect(result.degreesOfFreedom).toBe(12)
		expect(result.tUsed).toBe(2.179)
	})

	it('computes total sample size n ≈ 16.8 after t-iteration', () => {
		expect(result.nRaw).toBeCloseTo(16.84, 1)
	})

	it('allocates plots by Neyman allocation', () => {
		expect(result.strata[0].ni).toBeCloseTo(13.78, 1)
		expect(result.strata[1].ni).toBeCloseTo(2.18, 1)
		expect(result.strata[2].ni).toBeCloseTo(0.89, 1)
	})

	it('rounds each stratum to the nearest plot count (14/2/1 = 17)', () => {
		expect(result.strata[0].niRounded).toBe(14)
		expect(result.strata[1].niRounded).toBe(2)
		expect(result.strata[2].niRounded).toBe(1)
		expect(result.totalPlots).toBe(17)
	})
})

describe('computeProject — backup plots', () => {
	it('adds no backups when the percentage is missing or zero', () => {
		const zero = computeProject({ ...exampleProject, backupPercentage: 0 })
		expect(zero.totalBackups).toBe(0)
		expect(zero.totalAllocation).toBe(17)
		const missing = computeProject(exampleProject)
		expect(missing.totalAllocation).toBe(17)
	})

	it('rounds backups up per stratum: 10% of 14/2/1 → 2/1/1', () => {
		const result = computeProject({ ...exampleProject, backupPercentage: 0.1 })
		expect(result.strata[0].backupPlots).toBe(2)
		expect(result.strata[1].backupPlots).toBe(1)
		expect(result.strata[2].backupPlots).toBe(1)
		expect(result.totalBackups).toBe(4)
		expect(result.totalAllocation).toBe(21)
		expect(result.strata.map((s) => s.totalAllocation)).toEqual([16, 3, 2])
	})

	it('clamps negative percentages to zero', () => {
		const result = computeProject({ ...exampleProject, backupPercentage: -0.5 })
		expect(result.totalBackups).toBe(0)
	})
})

describe('computeProject — edge cases', () => {
	it('reduces to the standard formula for a single stratum', () => {
		const result = computeProject({
			precisionLevel: 0.1,
			zValue: 1.96,
			plotSize: 0.25,
			strata: [{ name: 'S1', area: 100, mean: 50, varianceInput: { mode: 'sd', value: 10 } }]
		})
		// n = (1.96 / (0.1 × 50))² × 10² = 15.37
		expect(result.nRaw).toBeCloseTo(15.37, 2)
		expect(result.strata[0].niRounded).toBe(15)
	})

	it('rounds to the nearest plot count: a negligible allocation rounds down to 0', () => {
		const result = computeProject({
			precisionLevel: 0.1,
			zValue: 1.96,
			plotSize: 0.25,
			strata: [
				{ name: 'Big', area: 10000, mean: 100, varianceInput: { mode: 'sd', value: 30 } },
				{ name: 'Tiny', area: 1, mean: 100, varianceInput: { mode: 'sd', value: 1 } }
			]
		})
		expect(result.strata[1].ni).toBeLessThan(0.5)
		expect(result.strata[1].niRounded).toBe(0)
	})

	it('excludes strata with zero or empty area but keeps them in the list', () => {
		const result = computeProject({
			precisionLevel: 0.1,
			zValue: 1.96,
			plotSize: 0.25,
			strata: [
				{ name: 'Valid', area: 100, mean: 50, varianceInput: { mode: 'sd', value: 10 } },
				{ name: 'Empty', area: 0, mean: 50, varianceInput: { mode: 'sd', value: 10 } }
			]
		})
		expect(result.strata).toHaveLength(2)
		expect(result.strata[1].excluded).toBe(true)
		expect(result.totalArea).toBe(100)
	})

	it('produces identical results for equivalent SD and CV input', () => {
		const result = computeProject({
			precisionLevel: 0.1,
			zValue: 1.96,
			plotSize: 0.25,
			strata: [{ name: 'S1', area: 100, mean: 126.8, varianceInput: { mode: 'sd', value: 26.25 } }]
		})
		// CV equivalent of SD 26.25 at mean 126.8
		const equivalentCv = (26.25 / 126.8) * 100
		const byCv = computeProject({
			precisionLevel: 0.1,
			zValue: 1.96,
			plotSize: 0.25,
			strata: [{ name: 'S1', area: 100, mean: 126.8, varianceInput: { mode: 'cv', value: equivalentCv } }]
		})
		expect(result.nRaw).toBeCloseTo(byCv.nRaw, 10)
	})
})

describe('sdFromInput', () => {
	it('passes through SD values', () => {
		expect(sdFromInput({ mode: 'sd', value: 12.5 }, 100)).toBe(12.5)
	})
	it('converts CV percentages using the mean', () => {
		expect(sdFromInput({ mode: 'cv', value: 20 }, 80)).toBe(16)
	})
	it('returns null for unusable input', () => {
		expect(sdFromInput({ mode: 'cv', value: 20 }, 0)).toBeNull()
		expect(sdFromInput({ mode: 'sd', value: -3 }, 100)).toBeNull()
	})
})

describe('t-table', () => {
	it('returns standardized two-sided t values', () => {
		expect(tValue('0.95', 1)).toBe(12.706)
		expect(tValue('0.95', 12)).toBe(2.179)
		expect(tValue('0.90', 8)).toBe(1.86)
		expect(tValue('0.99', 30)).toBe(2.576)
	})
	it('returns the infinite-df limit for df >= 30', () => {
		expect(tValue('0.95', Infinity)).toBe(1.96)
		expect(tValue('0.95', 500)).toBe(1.96)
	})
	it('clamps df to at least 1', () => {
		expect(tValue('0.95', 0)).toBe(tValue('0.95', 1))
	})
	it('returns null for unknown confidence levels', () => {
		expect(tValue('custom', 8)).toBeNull()
	})
})

describe('t-iteration policy', () => {
	const base = {
		precisionLevel: 0.1,
		plotSize: 0.25,
		strata: [
			{ name: 'S1', area: 3400, mean: 126.8, varianceInput: { mode: 'cv', value: 20.7 } },
			{ name: 'S2', area: 900, mean: 85, varianceInput: { mode: 'cv', value: 18.42 } },
			{ name: 'S3', area: 700, mean: 102.2, varianceInput: { mode: 'cv', value: 8.02 } }
		]
	}

	it('custom confidence keeps the fixed value without iterating', () => {
		const result = computeProject({ ...base, confidenceLevel: 'custom', zValue: 1.96 })
		expect(result.nRaw).toBeCloseTo(13.63, 1)
		expect(result.tUsed).toBe(1.96)
		expect(result.degreesOfFreedom).toBeNull()
	})

	it('skips the second iteration when the first pass gives n >= 30', () => {
		const result = computeProject({
			precisionLevel: 0.1,
			confidenceLevel: '0.95',
			plotSize: 0.25,
			strata: [{ name: 'S1', area: 100, mean: 50, varianceInput: { mode: 'sd', value: 20 } }]
			// n = (1.96/5)² × 400 ≈ 61.5
		})
		expect(result.nRaw).toBeGreaterThanOrEqual(30)
		expect(result.tUsed).toBe(1.96)
		expect(result.degreesOfFreedom).toBeNull()
	})

	it('90% preset reproduces the guidebook\'s t = 1.86 (df = 8)', () => {
		const result = computeProject({ ...base, confidenceLevel: '0.90' })
		expect(result.degreesOfFreedom).toBe(8)
		expect(result.tUsed).toBe(1.86)
		expect(result.nRaw).toBeCloseTo(12.27, 1)
	})
})
