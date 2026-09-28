import { describe, it, expect } from 'vitest'
import { parseStrataCsv } from '../src/lib/csv.js'
import { resultsToCsv } from '../src/lib/persistence.js'

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

	it('unescapes doubled quotes inside quoted fields', () => {
		const result = parseStrataCsv(`strata,area,mean_c_stock,variability,variability_value
"Say ""Hi""",100,60,CV,15`)
		expect(result.ok).toBe(true)
		expect(result.strata[0].name).toBe('Say "Hi"')
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
