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
	const project = proj4('EPSG:4326', `+proj=utm +zone=${zone}${south ? ' +south' : ''} +datum=WGS84 +units=m`).forward

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
