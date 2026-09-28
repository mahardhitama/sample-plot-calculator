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
	class="h-8 w-36 px-1 text-sm"
	bind:value={text}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
	{oninput}
/>
