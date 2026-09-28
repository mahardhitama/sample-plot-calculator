<script>
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { CONFIDENCE_PRESETS } from '$lib/calculator.js'
	import NumericField from './controls/NumericField.svelte'

	let { project = $bindable() } = $props()

	const zPresets = Object.fromEntries(CONFIDENCE_PRESETS.map((p) => [p.value, p.z]))

	function onConfidenceChange(event) {
		project.confidenceLevel = event.currentTarget.value
		if (zPresets[project.confidenceLevel]) {
			project.zValue = zPresets[project.confidenceLevel]
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Sampling design</Card.Title>
		<Card.Description>Required precision and confidence for the estimate</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
			<div class="flex flex-col gap-1.5">
				<Label for="project-name">Project name</Label>
				<Input id="project-name" bind:value={project.name} />
			</div>
			<NumericField id="precision" label="Precision (%)" bind:value={project.precisionLevel} scale={100} />
			<div class="flex flex-col gap-1.5">
				<Label for="confidence">Confidence level</Label>
				<NativeSelect
					id="confidence"
					value={project.confidenceLevel}
					onchange={onConfidenceChange}
					class="w-full"
				>
					{#each CONFIDENCE_PRESETS as preset (preset.value)}
						<NativeSelectOption value={preset.value}>{preset.label}</NativeSelectOption>
					{/each}
					<NativeSelectOption value="custom">Custom</NativeSelectOption>
				</NativeSelect>
			</div>
			<NumericField
				id="z-value"
				label="t-value (custom)"
				bind:value={project.zValue}
				disabled={project.confidenceLevel !== 'custom'}
			/>
			<NumericField id="plot-size" label="Plot size AP (ha)" bind:value={project.plotSize} />
			<NumericField id="backup-pct" label="Backup plots (%)" bind:value={project.backupPercentage} scale={100} />
		</div>
	</Card.Content>
</Card.Root>
