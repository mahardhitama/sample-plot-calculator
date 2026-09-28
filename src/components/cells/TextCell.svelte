<script>
	import { Input } from '$lib/components/ui/input/index.js'

	let { stratum, field, onCommit } = $props()

	let focused = $state(false)
	let text = $state('')

	$effect(() => {
		if (!focused) text = String(stratum[field] ?? '')
	})

	function oninput(event) {
		text = event.currentTarget.value
		onCommit(text)
	}
</script>

<Input
	class="readout h-8 w-36 text-sm transition-colors focus:border-primary"
	bind:value={text}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
	{oninput}
/>
