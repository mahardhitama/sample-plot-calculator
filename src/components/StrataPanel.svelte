<script>
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
	import CsvImportTab from './CsvImportTab.svelte'
	import LandCoverTab from './LandCoverTab.svelte'
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

	<div class:hidden={source !== 'manual'}>
		<StratumDataTable bind:project {results} />
	</div>
	<div class:hidden={source !== 'csv'}>
		<CsvImportTab bind:project />
	</div>
	<div class:hidden={source !== 'landcover'}>
		<LandCoverTab bind:project />
	</div>
</div>
