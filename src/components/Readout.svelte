<script>
	/**
	 * Instrument readout: numeric values settle once into place on recompute
	 * (raise: gravity-rain — values land, they never flicker).
	 * Non-numeric values render instantly.
	 */
	let { value, format = (v) => String(v), class: className = '' } = $props()

	const DURATION = 260

	let displayed = $state(value)
	let raf = null

	function tween(from, to) {
		cancelAnimationFrame(raf)
		if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
			displayed = to
			return
		}
		const start = performance.now()
		const step = (now) => {
			const k = Math.min(1, (now - start) / DURATION)
			const eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k)
			displayed = from + (to - from) * eased
			if (k < 1) raf = requestAnimationFrame(step)
		}
		raf = requestAnimationFrame(step)
	}

	$effect(() => {
		const next = value
		const from = displayed
		if (next !== from) tween(from, next)
	})
</script>

<span class={className}>{displayed === null || displayed === undefined ? '—' : format(displayed)}</span>
