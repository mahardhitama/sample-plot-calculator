/**
 * Browser-only Google Earth Engine client: Google Identity Services
 * sign-in (per-user OAuth, token held in memory, silent refresh before
 * expiry), EE JS client initialization, and CTrees zonal statistics.
 * Import only from LandCoverTab.svelte — never from tests or SSR paths.
 *
 * Note: ee.Reducer / ee.Image.reduceRegions exist only AFTER
 * ee.initialize() fetches the algorithm registry — all EE calls here run
 * post-initialization.
 */

import ee from '@google/earthengine'
import {
	CARBON_CONVERSION,
	CTREES_ASSET,
	CTREES_SCALE_M,
	GEE_OAUTH_CLIENT_ID,
	GEE_SCOPE
} from './gee-config.js'

let tokenClient = null
let accessToken = null
let tokenExpiresAt = 0
let authLostHandler = null

const REFRESH_MARGIN_S = 300

function ensureGis() {
	if (typeof google === 'undefined' || !google.accounts?.oauth2) {
		throw new Error('Google sign-in is unavailable — the accounts.google.com script was blocked or has not loaded yet.')
	}
}

function ensureTokenClient() {
	ensureGis()
	tokenClient ??= google.accounts.oauth2.initTokenClient({
		client_id: GEE_OAUTH_CLIENT_ID,
		scope: GEE_SCOPE,
		callback: () => {},
		error_callback: () => {}
	})
	return tokenClient
}

function requestToken(prompt) {
	return new Promise((resolve, reject) => {
		const client = ensureTokenClient()
		client.callback = (response) => {
			if (response.error) {
				reject(new Error(response.error_description ?? response.error))
				return
			}
			accessToken = response.access_token
			tokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
			// A new token means the EE client must re-initialize before use.
			initPromise = null
			scheduleSilentRefresh()
			resolve(accessToken)
		}
		client.error_callback = (event) => {
			if (event?.type === 'popup_closed') reject(new Error('Sign-in popup was closed.'))
			else reject(new Error('Sign-in popup failed to open — allow popups for this site.'))
		}
		client.requestAccessToken(prompt === undefined ? undefined : { prompt })
	})
}

function scheduleSilentRefresh() {
	const delay = tokenExpiresAt - Date.now() - REFRESH_MARGIN_S
	if (delay <= 0) return
	setTimeout(async () => {
		try {
			await requestToken('')
		} catch {
			accessToken = null
			authLostHandler?.()
		}
	}, delay)
}

/** Interactive sign-in. Rejects with a human-readable message on denial/close. */
export function signIn(onAuthLost) {
	if (GEE_OAUTH_CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
		return Promise.reject(new Error('Earth Engine sign-in is not configured for this deployment (missing OAuth client ID).'))
	}
	authLostHandler = onAuthLost
	return requestToken(undefined)
}

export function isSignedIn() {
	return accessToken !== null && Date.now() < tokenExpiresAt
}

let initPromise = null

/** Initialize the EE client with the current token. Safe to call repeatedly. */
export function initEarthEngine() {
	if (initPromise) return initPromise
	initPromise = new Promise((resolve, reject) => {
		ee.data.setAuthToken(
			GEE_OAUTH_CLIENT_ID,
			'Bearer',
			accessToken,
			Math.max(1, Math.round((tokenExpiresAt - Date.now()) / 1000)),
			null,
			() => ee.initialize(null, null, resolve, reject),
			false,
			false
		)
	})
	return initPromise
}

export function eeInitialized() {
	return initPromise !== null
}

/**
 * Zonal mean / SD / pixel count of CTrees AGB per stratum.
 * @param {Array<{name: string, polygons: number[][][][]}>} rows
 * @param {number} year  calendar year to read from the collection's `year` property
 * @returns {Promise<{year: number, stats: Map<string, {mean, sd, pixelCount}>}>}
 */
export async function computeZonalStats(rows, year) {
	await initEarthEngine()

	const collection = ee.ImageCollection(CTREES_ASSET)
	const image = year
		? collection.filter(ee.Filter.eq('year', year)).first()
		: collection.sort('system:time_start', false).first()
	if (!image) throw new Error(`No CTrees image found for year ${year ?? 'latest'}.`)

	const yearUsed = Number(await new Promise((resolve, reject) => image.get('year').getInfo((v, e) => (e ? reject(new Error(e)) : resolve(v)))))
	const scaled = ee.Image(image).multiply(ee.Image(image).getNumber('agb_scale_factor'))
	const agb = scaled.updateMask(scaled.gt(0))

	const fc = ee.FeatureCollection(
		rows.map((row) => ({
			type: 'Feature',
			properties: { STRATA: row.name },
			geometry: { type: 'MultiPolygon', coordinates: row.polygons }
		}))
	)
	const reducer = ee.Reducer.mean()
		.combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })
		.combine({ reducer2: ee.Reducer.count(), sharedInputs: true })
	const stats = agb.reduceRegions({ collection: fc, reducer, scale: CTREES_SCALE_M })

	const result = await new Promise((resolve, reject) => {
		stats.evaluate((value, error) => (error ? reject(new Error(error)) : resolve(value)))
	})

	const byName = new Map()
	for (const feature of result?.features ?? []) {
		const name = feature.properties?.STRATA
		const meanMg = feature.properties?.agb_mean
		const sdMg = feature.properties?.agb_stdDev
		const pixelCount = feature.properties?.agb_count ?? 0
		if (typeof name !== 'string') continue
		if (typeof meanMg !== 'number' || typeof sdMg !== 'number' || pixelCount === 0) continue
		byName.set(name, {
			mean: meanMg * CARBON_CONVERSION,
			sd: sdMg * CARBON_CONVERSION,
			pixelCount
		})
	}
	return { year: yearUsed, stats: byName }
}
