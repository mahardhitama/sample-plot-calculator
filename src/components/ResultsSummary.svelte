<script>
	import * as Card from '$lib/components/ui/card/index.js'
	import Readout from './Readout.svelte'

	let { results } = $props()

	function fmt(value, digits = 2) {
		return value === null || value === undefined || Number.isNaN(value)
			? '—'
			: value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
	}

	const stats = $derived([
		{ label: 'Area A, ha', value: results.totalArea, format: (v) => fmt(v, 0) },
		{ label: 'Possible plots N', value: results.totalPossiblePlots, format: (v) => fmt(v, 0) },
		{ label: 'Mean, t C/ha', value: results.weightedMean, format: (v) => fmt(v) },
		{ label: 'Error E, t C/ha', value: results.allowableError, format: (v) => fmt(v) },
		{ label: 'Weighted SD Σwᵢsᵢ', value: results.weightedSd, format: (v) => fmt(v) },
		{ label: 'Weighted variance', value: results.weightedVariance, format: (v) => fmt(v) },
		{
			label: "Student's t",
			value: results.tUsed,
			format: (v) =>
				results.degreesOfFreedom === null ? fmt(v, 3) : `${fmt(v, 3)} · df ${results.degreesOfFreedom}`
		},
		{ label: 'n (unrounded)', value: results.nRaw, format: (v) => fmt(v) },
		{ label: 'Backup plots', value: results.method ? results.totalBackups : null, format: (v) => fmt(v, 0) },
		{
			label: 'Sampled fraction',
			value: results.sampledFraction,
			format: (v) => `${fmt(v * 100)}%`
		}
	])

	const phase = $derived(
		results.method === 'simplified'
			? 'Sampled fraction below 5% — simplified equation'
			: results.method === 'fpc'
				? 'Sampled fraction above 5% — finite population correction'
				: 'Awaiting valid settings and stratum data'
	)
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Results</Card.Title>
		<Card.Description>{phase}</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-8">
			<div>
				<div class="mb-1 text-sm text-muted-foreground">Sample plots required — n</div>
				<Readout
					value={results.nRounded}
					format={(v) => fmt(v, 0)}
					class="text-4xl font-bold tabular-nums font-mono text-primary"
				/>
			</div>
			<div>
				<div class="mb-1 text-sm text-muted-foreground">After per-stratum round-up</div>
				<Readout
					value={results.method ? results.totalPlots : null}
					format={(v) => fmt(v, 0)}
					class="text-4xl font-bold tabular-nums font-mono"
				/>
			</div>
			<div>
				<div class="mb-1 text-sm text-muted-foreground">Total allocation incl. backups</div>
				<Readout
					value={results.method ? results.totalAllocation : null}
					format={(v) => fmt(v, 0)}
					class="text-4xl font-bold tabular-nums font-mono"
				/>
			</div>
		</div>

		<dl class="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
			{#each stats as stat (stat.label)}
				<div>
					<dt class="text-xs text-muted-foreground">{stat.label}</dt>
					<dd class="text-sm font-medium tabular-nums font-mono">
						<Readout value={stat.value} format={stat.format} />
					</dd>
				</div>
			{/each}
		</dl>

		{#if results.method}
			<div class="text-xs text-muted-foreground">
				Equation — {results.method === 'simplified' ? 'simplified, no FPC' : 'finite population correction'} · Neyman
				allocation
			</div>
		{/if}
	</Card.Content>
</Card.Root>
