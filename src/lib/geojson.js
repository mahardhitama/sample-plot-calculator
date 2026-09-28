/**
 * Land cover GeoJSON parsing. Pure validation and grouping: accepts a
 * FeatureCollection or single Feature whose polygon features carry a
 * mandatory STRATA property, groups them by strata value, and reports
 * unsupported geometries as warnings. Areas are computed later by
 * utm-area.js; features are preserved verbatim for the GEE upload.
 */

const SUPPORTED_TYPES = new Set(['Polygon', 'MultiPolygon'])

function strataProperty(properties, index, errors) {
	if (properties == null || typeof properties !== 'object') {
		errors.push(`Feature ${index}: missing "STRATA" property.`)
		return null
	}
	if (Object.prototype.hasOwnProperty.call(properties, 'STRATA')) return properties.STRATA
	const key = Object.keys(properties).find((k) => k.toLowerCase() === 'strata')
	if (key !== undefined) return properties[key]
	errors.push(`Feature ${index}: missing "STRATA" property.`)
	return null
}

/**
 * Parse GeoJSON text into strata groups.
 * @returns {{ok: true, warnings: string[], strata: Array<{name, featureCount, features}>}
 *          | {ok: false, errors: string[], warnings: string[]}}
 */
export function parseLandCoverGeoJson(text) {
	let root
	try {
		root = JSON.parse(text)
	} catch {
		return { ok: false, errors: ['The file is not valid JSON.'], warnings: [] }
	}

	const features = []
	if (root?.type === 'FeatureCollection') {
		features.push(...(root.features ?? []))
	} else if (root?.type === 'Feature') {
		features.push(root)
	} else {
		return {
			ok: false,
			errors: ['Expected a GeoJSON FeatureCollection or Feature.'],
			warnings: []
		}
	}
	if (features.length === 0) {
		return { ok: false, errors: ['The file has no features.'], warnings: [] }
	}

	const errors = []
	const warnings = []
	const groups = new Map()
	features.forEach((feature, i) => {
		const index = i + 1
		if (!SUPPORTED_TYPES.has(feature?.geometry?.type)) {
			warnings.push(
				`Feature ${index}: ${feature?.geometry?.type ?? 'unknown'} geometry skipped — only Polygon and MultiPolygon are supported.`
			)
			return
		}
		const rawName = strataProperty(feature.properties, index, errors)
		const name = String(rawName ?? '').trim()
		if (name === '') {
			if (rawName !== null && rawName !== undefined) errors.push(`Feature ${index}: "STRATA" value is blank.`)
			return
		}
		if (!groups.has(name)) groups.set(name, [])
		groups.get(name).push(feature)
	})

	if (errors.length > 0) return { ok: false, errors, warnings }
	if (groups.size === 0) {
		return { ok: false, errors: ['No polygon features with a "STRATA" property were found.'], warnings }
	}
	return {
		ok: true,
		warnings,
		strata: [...groups.entries()].map(([name, groupFeatures]) => ({
			name,
			featureCount: groupFeatures.length,
			features: groupFeatures
		}))
	}
}
