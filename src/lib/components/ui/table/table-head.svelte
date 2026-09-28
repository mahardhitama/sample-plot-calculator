<script>
	import { cn } from "$lib/utils.js";
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<th bind:this={ref} data-slot="table-head" class={cn("text-muted-foreground h-12 px-3 text-left align-middle text-xs font-medium uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...restProps}>
	{@render children?.()}
</th>