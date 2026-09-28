<script>
	import DownloadIcon from '@lucide/svelte/icons/download'
	import FileUpIcon from '@lucide/svelte/icons/file-up'
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import { Button } from '$lib/components/ui/button/index.js'
	import { computeProject } from '$lib/calculator.js'
	import { createDefaultProject } from '$lib/defaults.js'
	import {
		debounce,
		exportProjectJson,
		exportResultsCsv,
		importProjectJson,
		loadProject,
		saveProject
	} from '$lib/persistence.js'
	import { projectIssues } from '$lib/validation.js'
	import ProjectControls from './components/ProjectControls.svelte'
	import ResultsSummary from './components/ResultsSummary.svelte'
	import StratumDataTable from './components/StratumDataTable.svelte'

	function normalizeIds(project) {
		for (const stratum of project.strata ?? []) {
			stratum.id ??= crypto.randomUUID()
		}
		return project
	}

	function initialProject() {
		return normalizeIds(loadProject() ?? createDefaultProject())
	}

	let project = $state(initialProject())
	let importError = $state(null)
	let fileInput

	const results = $derived(computeProject(project))
	const issues = $derived(projectIssues(project))
	const stratumIssues = $derived(results.strata.filter((s) => s.excluded))

	const persist = debounce((value) => saveProject(value), 500)
	$effect(() => {
		persist(project)
	})

	function resetExample() {
		project = createDefaultProject()
		importError = null
	}

	async function onImportFile(event) {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		if (!file) return
		try {
			project = normalizeIds(await importProjectJson(file))
			importError = null
		} catch (error) {
			importError = error.message
		}
	}
</script>

<div class="min-h-screen">
	<!-- instrument bezel -->
	<header class="border-b">
		<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="readout flex size-9 items-center justify-center">
					<div class="size-2.5 rounded-[1px] bg-primary"></div>
				</div>
				<div>
					<h1 class="text-base font-bold tracking-[-0.02em]">Sample Plot Calculator</h1>
					<p class="engraved">CDM A/R tool v2.1.0 · stratified carbon stock estimation</p>
				</div>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => exportProjectJson(project)}>
					<DownloadIcon class="size-3.5" />
					Save
				</Button>
				<Button variant="outline" size="sm" onclick={() => fileInput.click()}>
					<FileUpIcon class="size-3.5" />
					Open
				</Button>
				<Button variant="outline" size="sm" onclick={() => exportResultsCsv(results)}>
					<DownloadIcon class="size-3.5" />
					Export CSV
				</Button>
				<Button variant="outline" size="sm" onclick={resetExample}>
					<RotateCcwIcon class="size-3.5" />
					Reset
				</Button>
			</div>
		</div>
	</header>

	<input bind:this={fileInput} type="file" accept=".json,application/json" class="hidden" onchange={onImportFile} />

	<main class="mx-auto max-w-7xl space-y-6 px-6 py-6">
		{#if importError || issues.length > 0}
			<div class="plate flex flex-col gap-2 border-destructive/40 bg-card px-4 py-3" role="alert">
				<span class="engraved text-destructive">Check</span>
				{#if importError}
					<p class="text-sm">{importError}</p>
				{/if}
				{#if issues.length > 0}
					<ul class="text-sm">
						{#each issues as issue (issue)}
							<li>{issue}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<ProjectControls bind:project />

		<StratumDataTable bind:project {results} />

		<ResultsSummary {results} />

		{#if stratumIssues.length > 0}
			<div class="engraved">
				Excluded from calculation —
				{#each stratumIssues as stratum (stratum.id)}
					<span class="font-mono text-destructive normal-case tracking-normal">{stratum.name}</span>
					({stratum.issues.join('; ')}){#if stratum !== stratumIssues[stratumIssues.length - 1]},{/if}
				{/each}
			</div>
		{/if}
	</main>
</div>
