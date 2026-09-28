<script>
	import { Input } from '$lib/components/ui/input/index.js'
	import { Switch } from '$lib/components/ui/switch/index.js'

	let { stratum, onValueChange, onModeChange } = $props()

	let focused = $state(false)
	let text = $state(String(stratum.varianceInput?.value ?? ''))

	$effect(() => {
		if (!focused) text = String(stratum.varianceInput?.value ?? '')
	})

	function oninput(event) {
		text = event.currentTarget.value
		onValueChange(text === '' ? null : Number(text))
	}

	let mode = $state(stratum.varianceInput?.mode ?? 'sd')

	$effect(() => {
		onModeChange(mode)
	})

	$effect(() => {
		const external = stratum.varianceInput.mode
		if (external !== mode) mode = external
	})
</script>

<div class="flex items-center gap-1.5">
	<span class="engraved {mode === 'cv' ? '' : 'text-muted-foreground/60'}">CV%</span>
	<Switch
		size="sm"
		checked={mode === 'sd'}
		onCheckedChange={(checked) => (mode = checked ? 'sd' : 'cv')}
		aria-label="Toggle between CV% and SD input"
	/>
	<span class="engraved {mode === 'sd' ? '' : 'text-muted-foreground/60'}">SD</span>
	<Input
		type="text"
		inputmode="decimal"
		class="readout h-8 w-20 font-mono text-sm tabular-nums transition-colors focus:border-primary"
		bind:value={text}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		{oninput}
	/>
</div>
