/**
 * Google Earth Engine integration constants. The OAuth client ID is
 * public by design (token-client web flow); there are no secrets in this
 * app. See docs/superpowers/specs/2026-09-28-landcover-strata-tab-design.md
 * for the Cloud Console setup steps.
 */

export const GEE_OAUTH_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'

export const GEE_SCOPE = 'https://www.googleapis.com/auth/earthengine'

export const CTREES_ASSET = 'projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M'

export const CTREES_SCALE_M = 100

/** AGB → carbon, per the CTrees data brief. */
export const CARBON_CONVERSION = 0.5

/** Strata with fewer valid biomass pixels import as excluded (null stats). */
export const MIN_BIOMASS_PIXELS = 30
