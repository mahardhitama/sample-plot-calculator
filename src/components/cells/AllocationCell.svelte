<script>
	/**
	 * Neyman allocation cell: the bar's length is the exact plot quantity
	 * (raise: labanotation); the rounded count is engraved at the bar's end.
	 */
	let { row, maxNi } = $props()

	const pct = $derived(row && maxNi > 0 ? (row.ni / maxNi) * 100 : 0)
</script>

{#if row && !row.excluded}
	<div class="flex w-44 items-center gap-2">
		<div class="alloc-track h-2 flex-1">
			<div class="alloc-bar h-2" style:width="{pct}%"></div>
		</div>
		<span class="w-6 shrink-0 font-mono text-sm font-bold tabular-nums">{row.niRounded}</span>
	</div>
{:else}
	<span class="engraved text-destructive">Excluded</span>
{/if}
