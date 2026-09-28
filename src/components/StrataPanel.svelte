<script>
	import * as Card from '$lib/components/ui/card/index.js'
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
	import CsvImportTab from './CsvImportTab.svelte'
	import StratumDataTable from './StratumDataTable.svelte'

	let { project = $bindable(), results } = $props()

	let source = $state('manual')
</script>

<div class="space-y-3">
	<ToggleGroup.Root type="single" bind:value={source} variant="outline" size="sm">
		<ToggleGroup.Item value="manual" class="engraved">Manual inputs</ToggleGroup.Item>
		<ToggleGroup.Item value="csv" class="engraved">From CSV</ToggleGroup.Item>
		<ToggleGroup.Item value="landcover" class="engraved">From land cover</ToggleGroup.Item>
	</ToggleGroup.Root>

	{#if source === 'manual'}
		<StratumDataTable bind:project {results} />
	{:else if source === 'csv'}
		<CsvImportTab bind:project />
	{:else}
		<Card.Root class="plate flex flex-col items-center gap-2 py-16">
			<span class="engraved">Land cover import</span>
			<Card.Description>Coming soon — derive strata from a land cover / GIS classification.</Card.Description>
		</Card.Root>
	{/if}
</div>
