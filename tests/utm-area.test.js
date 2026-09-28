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
