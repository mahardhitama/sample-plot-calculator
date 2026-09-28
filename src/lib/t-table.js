/**
 * Two-sided Student's t critical values, lifted from the original Winrock
 * Excel tool ("student t value" sheet). These are the universally
 * standardized values (identical to R's qt(..., lower.tail=FALSE)*-1,
 * Excel's T.INV.2T, and standard textbook tables).
 *
 * T_TABLE[confidence] is indexed by degrees of freedom 1..30;
 * T_INFINITY[confidence] is the limit value (t at infinite df, i.e. z).
 */

export const T_INFINITY = {
	'0.80': 1.28,
	'0.90': 1.645,
	'0.95': 1.96,
	'0.98': 2.33,
	'0.99': 2.576
}

export const T_TABLE = {
	'0.80': [
		3.08, 1.89, 1.64, 1.53, 1.48, 1.44, 1.42, 1.4, 1.38, 1.37,
		1.36, 1.36, 1.35, 1.35, 1.34, 1.34, 1.33, 1.33, 1.33, 1.33,
		1.32, 1.32, 1.32, 1.32, 1.32, 1.32, 1.31, 1.31, 1.31, 1.31
	],
	'0.90': [
		6.314, 2.92, 2.353, 2.132, 2.015, 1.943, 1.895, 1.86, 1.833, 1.812,
		1.796, 1.782, 1.771, 1.761, 1.753, 1.746, 1.74, 1.734, 1.729, 1.725,
		1.721, 1.717, 1.714, 1.711, 1.708, 1.706, 1.703, 1.701, 1.699, 1.697
	],
	'0.95': [
		12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
		2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086,
		2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042
	],
	'0.98': [
		31.82, 6.97, 4.54, 3.75, 3.37, 3.14, 3.0, 2.9, 2.82, 2.76,
		2.72, 2.68, 2.65, 2.63, 2.6, 2.58, 2.57, 2.55, 2.54, 2.53,
		2.52, 2.51, 2.5, 2.49, 2.49, 2.48, 2.47, 2.47, 2.46, 2.46
	],
	'0.99': [
		63.657, 9.925, 5.841, 4.604, 4.032, 3.707, 3.499, 3.355, 3.25, 3.169,
		3.106, 3.055, 3.012, 2.977, 2.947, 2.921, 2.898, 2.878, 2.861, 2.845,
		2.831, 2.819, 2.807, 2.797, 2.787, 2.779, 2.771, 2.763, 2.756, 2.75
	]
}

/**
 * Two-sided t critical value for a confidence preset and degrees of freedom.
 * df >= 30 (or Infinity) returns the infinite-df limit value.
 * Returns null for unknown confidence levels (use a custom fixed value instead).
 */
export function tValue(confidenceLevel, degreesOfFreedom) {
	const row = T_TABLE[confidenceLevel]
	if (!row) return null
	if (degreesOfFreedom === Infinity || degreesOfFreedom >= 30) {
		return T_INFINITY[confidenceLevel]
	}
	return row[Math.max(1, Math.floor(degreesOfFreedom)) - 1]
}
