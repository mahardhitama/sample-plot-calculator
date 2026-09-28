<script>
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'

	let { id, label, value = $bindable(), scale = 1, disabled = false } = $props()

	let focused = $state(false)
	let text = $state(display(value))

	function display(v) {
		if (v === null || v === undefined || Number.isNaN(v)) return ''
		const scaled = scale !== 1 ? v * scale : v
		return String(Number(scaled.toFixed(6)))
	}

	$effect(() => {
		if (!focused) text = display(value)
	})

	function oninput(event) {
		text = event.currentTarget.value
		if (text === '') {
			value = null
			return
		}
		const parsed = Number(text)
		value = Number.isNaN(parsed) ? null : parsed / scale
	}
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<Input
		{id}
		type="text"
		inputmode="decimal"
		class="tabular-nums"
		bind:value={text}
		{disabled}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		{oninput}
	/>
</div>
