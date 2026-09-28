<script>
	import UploadIcon from '@lucide/svelte/icons/upload'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { parseLandCoverGeoJson } from '$lib/geojson.js'
	import { computeStrataAreas } from '$lib/utm-area.js'
	import { MIN_BIOMASS_PIXELS } from '$lib/gee-config.js'
	import { computeZonalStats, isSignedIn, signIn } from '$lib/gee.js'

	let { project = $bindable() } = $props()

	let fileInput
	let errors = $state(null)
	let parsed = $state(null) // { strata: [{name, featureCount, areaHa, polygons}], warnings }
	let authState = $state('signed-out') // 'signed-out' | 'signed-in'
	let phase = $state('idle') // 'idle' | 'computing' | 'done'

	async function onFile(file) {
		if (!file) return
		errors = null
		parsed = null
		phase = 'idle'
		let text
		try {
			text = await file.text()
		} catch {
			errors = ['Could not read the selected file.']
			return
		}
		const geojson = parseLandCoverGeoJson(text)
		if (!geojson.ok) {
			errors = geojson.errors
			return
		}
		const areas = computeStrataAreas(geojson)
		if (areas.strata.every((s) => !(s.areaHa > 0))) {
			errors = ['No stratum has a measurable area — check the geometry.']
			return
		}
		parsed = areas
	}

	function onChange(event) {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		onFile(file)
	}

	function onDrop(event) {
		event.preventDefault()
		onFile(event.dataTransfer?.files?.[0])
	}

	async function onSignIn() {
		errors = null
		try {
			await signIn(() => (authState = 'signed-out'))
			authState = 'signed-in'
		} catch (error) {
			errors = [error.message]
		}
	}

	function mapGeeError(error) {
		const message = String(error?.message ?? error)
		if (/403|PERMISSION_DENIED|disabled|has not been used/i.test(message)) {
			return 'Earth Engine is not available for this Google account. Register at https://code.earthengine.google.com/register, then sign in again.'
		}
		return `Zonal statistics failed: ${message}`
	}

	async function onCompute() {
		if (!parsed) return
		phase = 'computing'
		errors = null
		try {
			const { year, stats } = await computeZonalStats(parsed.strata)
			const accessed = new Date().toISOString().slice(0, 10)
			project.strata = parsed.strata.map((s) => {
				const stat = stats.get(s.name)
				const usable = stat && stat.pixelCount >= MIN_BIOMASS_PIXELS
				return {
					id: crypto.randomUUID(),
					name: s.name,
					area: s.areaHa,
					mean: usable ? stat.mean : null,
					varianceInput: { mode: 'sd', value: usable ? stat.sd : null },
					provenance: { source: 'ctrees-agb-100m', year, scale: 100, accessed }
				}
			})
			phase = 'done'
		} catch (error) {
			phase = 'idle'
			errors = [mapGeeError(error)]
		}
	}
</script>

<Card.Root class="plate gap-4 py-4">
	<Card.Header class="px-4">
		<Card.Title class="engraved">Derive strata from land cover</Card.Title>
		<Card.Description>
			Upload a GeoJSON whose features carry a STRATA property. Areas are computed in the local UTM
			zone; biomass statistics use CTrees Global AGB 100 m (latest year) via Earth Engine with your
			Google account. Replaces all strata.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3 px-4">
		<button
			type="button"
			class="flex h-24 w-full flex-col items-center justify-center gap-2 border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={() => fileInput.click()}
			ondragover={(event) => event.preventDefault()}
			{onDrop}
		>
			<UploadIcon class="size-4" />
			<span class="engraved">Drop a .geojson here or click to browse</span>
		</button>

		{#if parsed}
			<table class="w-full font-mono text-sm tabular-nums">
				<thead>
					<tr class="engraved border-b text-left">
						<th class="py-1 pr-4 font-normal">Stratum</th>
						<th class="py-1 pr-4 text-right font-normal">Area, ha</th>
						<th class="py-1 text-right font-normal">Features</th>
					</tr>
				</thead>
				<tbody>
					{#each parsed.strata as stratum (stratum.name)}
						<tr class="border-b border-border/50">
							<td class="py-1 pr-4">{stratum.name}</td>
							<td class="py-1 pr-4 text-right">{stratum.areaHa.toFixed(2)}</td>
							<td class="py-1 text-right">{stratum.featureCount}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#each parsed.warnings as warning (warning)}
				<p class="engraved text-destructive">{warning}</p>
			{/each}
		{/if}

		<div class="flex items-center gap-3">
			{#if authState === 'signed-in'}
				<Button size="sm" disabled={phase === 'computing' || !parsed} onclick={onCompute}>
					{phase === 'computing' ? 'Computing zonal statistics…' : 'Compute biomass statistics'}
				</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={onSignIn}>Sign in with Google</Button>
				<span class="engraved">Required to run Earth Engine zonal statistics</span>
			{/if}
		</div>

		{#if phase === 'done'}
			<p class="engraved text-primary">
				{project.strata.length} strata imported from CTrees AGB — switch to Manual inputs to review
				(excluded strata have too few biomass pixels)
			</p>
			<p class="engraved">
				Source: CTrees Global Aboveground Biomass 100 m, CC-BY 4.0, non-peer-reviewed preprint.
				Values are t C/ha (AGB × 0.5); SD is a remote-sensing proxy, not field-measured.
			</p>
		{/if}
	</Card.Content>
</Card.Root>

<input
	bind:this={fileInput}
	type="file"
	accept=".geojson,.json,application/geo+json,application/json"
	class="hidden"
	onchange={onChange}
/>

{#if errors}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button
			type="button"
			aria-label="Dismiss import error dialog"
			class="absolute inset-0 bg-background/70"
			onclick={() => (errors = null)}
		></button>
		<div role="dialog" aria-modal="true" aria-label="Land cover import errors" class="plate relative mx-4 max-h-[70vh] w-full max-w-lg gap-3 bg-card p-4">
			<span class="engraved text-destructive">Check — not imported</span>
			<ul class="max-h-[45vh] overflow-y-auto py-1 font-mono text-sm tabular-nums">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
			<div class="flex justify-end">
				<Button variant="outline" size="sm" onclick={() => (errors = null)}>Close</Button>
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={(event) => event.key === 'Escape' && (errors = null)} />
