<script>
	import UploadIcon from '@lucide/svelte/icons/upload'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { parseStrataCsv } from '$lib/csv.js'

	let { project = $bindable() } = $props()

	let fileInput
	let errors = $state(null)
	let importedCount = $state(null)

	async function onFile(file) {
		if (!file) return
		importedCount = null
		let text
		try {
			text = await file.text()
		} catch {
			errors = ['Could not read the selected file.']
			return
		}
		const result = parseStrataCsv(text)
		if (!result.ok) {
			errors = result.errors
			return
		}
		project.strata = result.strata.map((s) => ({ ...s, id: crypto.randomUUID() }))
		errors = null
		importedCount = result.strata.length
	}

	function onChange(event) {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		onFile(file)
	}

	function onDrop(event) {
		event.preventDefault()
		onFile(event.dataTransfer?.files?.[0])
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Import strata from CSV</Card.Title>
		<Card.Description>
			Replaces all strata — expected columns: strata, area, mean_c_stock, variability (CV or SD),
			variability_value
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<button
			type="button"
			class="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={() => fileInput.click()}
			ondragover={(event) => event.preventDefault()}
			{onDrop}
		>
			<UploadIcon class="size-4" />
			Drop a .csv here or click to browse
		</button>
		{#if importedCount !== null}
			<p class="mt-3 text-sm font-medium text-primary">
				{importedCount} strata imported — switch to Manual inputs to review
			</p>
		{/if}
	</Card.Content>
</Card.Root>

<input bind:this={fileInput} type="file" accept=".csv,text/csv" class="hidden" onchange={onChange} />

{#if errors}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button
			type="button"
			aria-label="Dismiss import error dialog"
			class="absolute inset-0 bg-black/50"
			onclick={() => (errors = null)}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="CSV import errors"
			class="relative mx-4 grid max-h-[70vh] w-full max-w-lg gap-4 overflow-y-auto rounded-xl border bg-background p-6 shadow-lg"
		>
			<h2 class="text-base font-semibold text-destructive">Check — CSV not imported</h2>
			<ul class="text-sm">
				{#each errors as error (error)}
					<li>{error}</li>
				{/each}
			</ul>
			<div class="flex justify-end">
				<Button variant="outline" onclick={() => (errors = null)}>Close</Button>
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={(event) => event.key === 'Escape' && (errors = null)} />
