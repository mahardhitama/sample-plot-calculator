<script>
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down'
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
	import { cn } from '$lib/utils.js'

	let { header, label, class: className } = $props()

	const sorted = $derived(header.column.getIsSorted())
</script>

<button
	type="button"
	class={cn(
		'inline-flex items-center gap-1 transition-colors hover:text-foreground',
		sorted && 'text-foreground',
		className
	)}
	onclick={header.column.getToggleSortingHandler()}
>
	{label}
	{#if sorted === 'asc'}
		<ArrowUpIcon class="size-3.5" />
	{:else if sorted === 'desc'}
		<ArrowDownIcon class="size-3.5" />
	{:else}
		<ArrowUpDownIcon class="size-3.5 opacity-40" />
	{/if}
</button>
