/** Default project: Winrock-recommended defaults pre-filled with the guidebook example. */

export function createDefaultProject() {
	return {
		name: 'Sample project',
		precisionLevel: 0.1,
		confidenceLevel: '0.90',
		zValue: 1.645,
		plotSize: 0.25,
		backupPercentage: 0,
		strata: [
			{ id: crypto.randomUUID(), name: 'Stratum 1', area: 3400, mean: 126.8, varianceInput: { mode: 'cv', value: 20.7 } },
			{ id: crypto.randomUUID(), name: 'Stratum 2', area: 900, mean: 85, varianceInput: { mode: 'cv', value: 18.42 } },
			{ id: crypto.randomUUID(), name: 'Stratum 3', area: 700, mean: 102.2, varianceInput: { mode: 'cv', value: 8.02 } }
		]
	}
}
