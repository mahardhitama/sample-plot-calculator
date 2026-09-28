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
	<span class="text-xs uppercase tracking-wide {mode === 'cv' ? 'font-medium text-foreground' : 'text-muted-foreground'}"
		>CV%</span
	>
	<Switch
		size="sm"
		checked={mode === 'sd'}
		onCheckedChange={(checked) => (mode = checked ? 'sd' : 'cv')}
		aria-label="Toggle between CV% and SD input"
	/>
	<span class="text-xs uppercase tracking-wide {mode === 'sd' ? 'font-medium text-foreground' : 'text-muted-foreground'}"
		>SD</span
	>
	<Input
		type="text"
		inputmode="decimal"
		class="h-8 w-20 px-1 text-sm tabular-nums"
		bind:value={text}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		{oninput}
	/>
</div>
