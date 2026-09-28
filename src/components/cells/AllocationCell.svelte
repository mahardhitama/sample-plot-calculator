<script>
	import { Badge } from '$lib/components/ui/badge/index.js'

	/**
	 * Neyman allocation cell: bar length is proportional to the stratum's
	 * share of the largest allocation; the rounded plot count sits at the
	 * bar's end.
	 */
	let { row, maxNi } = $props()

	const pct = $derived(row && maxNi > 0 ? (row.ni / maxNi) * 100 : 0)
</script>

{#if row && !row.excluded}
	<div class="flex w-44 items-center gap-2">
		<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
			<div class="h-full rounded-full bg-primary transition-all" style:width="{pct}%"></div>
		</div>
		<span class="w-6 shrink-0 text-sm font-semibold tabular-nums font-mono">{row.niRounded}</span>
	</div>
{:else}
	<Badge variant="destructive">Excluded</Badge>
{/if}
