<script>
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import { Button } from '$lib/components/ui/button/index.js'

	let { label, onclick } = $props()
</script>

<Button
	variant="ghost"
	size="icon"
	class="size-7 text-muted-foreground hover:text-destructive"
	aria-label={`Remove ${label}`}
	{onclick}
>
	<Trash2Icon class="size-4" />
</Button>
