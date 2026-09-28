<script>
	import { Input } from '$lib/components/ui/input/index.js'

	let { stratum = $bindable(), field } = $props()

	let focused = $state(false)
	let text = $state('')

	$effect(() => {
		if (!focused) text = String(stratum[field] ?? '')
	})

	function oninput(event) {
		text = event.currentTarget.value
		stratum[field] = text === '' ? null : Number(text)
	}
</script>

<Input
	type="text"
	inputmode="decimal"
	class="readout h-8 w-24 font-mono text-sm tabular-nums transition-colors focus:border-primary"
	bind:value={text}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
	{oninput}
/>
