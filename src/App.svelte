<script>
	import DownloadIcon from '@lucide/svelte/icons/download'
	import FileUpIcon from '@lucide/svelte/icons/file-up'
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right'
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
	import StrataPanel from './components/StrataPanel.svelte'

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
	<header class="border-b">
		<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
					<svg viewBox="0 0 24 24" fill="none" class="size-5" aria-hidden>
						<rect x="1.75" y="1.75" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.5" />
						<rect x="13.75" y="1.75" width="8.5" height="8.5" fill="currentColor" />
						<rect x="1.75" y="13.75" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.5" />
						<rect x="13.75" y="13.75" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.5" />
					</svg>
				</div>
				<div>
					<h1 class="font-heading text-xl font-semibold">Sample Plot Calculator</h1>
					<a
						href="https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-03-v2.1.0.pdf"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
					>
						CDM A/R tool v2.1.0 · stratified carbon stock estimation
						<ArrowUpRightIcon class="size-3 shrink-0" aria-hidden />
					</a>
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
			<div class="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-card p-4" role="alert">
				<span class="text-xs font-semibold uppercase tracking-wider text-destructive">Check</span>
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

		<StrataPanel bind:project {results} />

		<ResultsSummary {results} />

		{#if stratumIssues.length > 0}
			<div class="text-xs text-muted-foreground">
				Excluded from calculation —
				{#each stratumIssues as stratum (stratum.id)}
					<span class="font-medium text-destructive">{stratum.name}</span>
					({stratum.issues.join('; ')}){#if stratum !== stratumIssues[stratumIssues.length - 1]},{/if}
				{/each}
			</div>
		{/if}
	</main>
</div>
