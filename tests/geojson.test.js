import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseLandCoverGeoJson } from '../src/lib/geojson.js'

const fixture = readFileSync(new URL('./fixtures/three-strata.geojson', import.meta.url), 'utf8')

describe('parseLandCoverGeoJson', () => {
	it('groups polygon features by STRATA value', () => {
		const result = parseLandCoverGeoJson(fixture)
		expect(result.ok).toBe(true)
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

	it('rejects a non-array features member', () => {
		const result = parseLandCoverGeoJson('{"type":"FeatureCollection","features":{}}')
		expect(result.ok).toBe(false)
	})
})
