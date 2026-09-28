<script>
	import { createSortedRowModel, createTable, FlexRender, rowSortingFeature, tableFeatures } from '@tanstack/svelte-table'
	import { renderComponent } from '@tanstack/svelte-table'
	import PlusIcon from '@lucide/svelte/icons/plus'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '$lib/components/ui/table/index.js'
	import SortableHeader from './SortableHeader.svelte'
	import AllocationCell from './cells/AllocationCell.svelte'
	import NumberCell from './cells/NumberCell.svelte'
	import RemoveCell from './cells/RemoveCell.svelte'
	import TextCell from './cells/TextCell.svelte'
	import VarianceCell from './cells/VarianceCell.svelte'

	let { project = $bindable(), results } = $props()

	const features = tableFeatures({
		rowSortingFeature,
		sortedRowModel: createSortedRowModel()
	})

	function header(label) {
		return (header) => renderComponent(SortableHeader, { header, label })
	}

	function fmt(value, digits = 2) {
		return value === null || value === undefined || Number.isNaN(value)
			? '—'
			: value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
	}

	function computedCell(field, digits = 2) {
		return (info) => {
			const row = computedById.get(info.row.original.id)
			return row && !row.excluded ? fmt(row[field], digits) : '—'
		}
	}

	const columns = [
		{
			accessorKey: 'name',
			header: header('Stratum'),
			cell: (info) =>
				renderComponent(TextCell, {
					stratum: info.row.original,
					field: 'name',
					onCommit: (value) => (info.row.original.name = value)
				})
		},
		{
			accessorKey: 'area',
			numeric: true,
			header: header('Area (ha)'),
			cell: (info) =>
				renderComponent(NumberCell, {
					stratum: info.row.original,
					field: 'area',
					onCommit: (value) => (info.row.original.area = value)
				})
		},
		{
			accessorKey: 'mean',
			numeric: true,
			header: header('Mean (t C/ha)'),
			cell: (info) =>
				renderComponent(NumberCell, {
					stratum: info.row.original,
					field: 'mean',
					onCommit: (value) => (info.row.original.mean = value)
				})
		},
		{
			id: 'variability-input',
			accessorKey: 'varianceInput.value',
			numeric: true,
			header: header('Variability'),
			cell: (info) =>
				renderComponent(VarianceCell, {
					stratum: info.row.original,
					onValueChange: (value) => (info.row.original.varianceInput.value = value),
					onModeChange: (mode) => (info.row.original.varianceInput.mode = mode)
				})
		},
		{ accessorKey: 'sd', numeric: true, header: header('SD'), cell: computedCell('sd') },
		{ accessorKey: 'cv', numeric: true, header: header('CV (%)'), cell: computedCell('cv') },
		{ accessorKey: 'weight', numeric: true, header: header('Weight'), cell: computedCell('weight', 4) },
		{
			id: 'allocation',
			accessorKey: 'ni',
			numeric: true,
			header: header('Neyman allocation'),
			cell: (info) => {
				const row = computedById.get(info.row.original.id)
				return renderComponent(AllocationCell, { row, maxNi })
			}
		},
		{
			id: 'total-allocation',
			accessorKey: 'totalAllocation',
			numeric: true,
			header: header('Total allocation'),
			cell: (info) => {
				const row = computedById.get(info.row.original.id)
				if (!row || row.excluded) return '—'
				return row.backupPlots > 0 ? `${fmt(row.totalAllocation, 0)} (+${row.backupPlots})` : fmt(row.totalAllocation, 0)
			}
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: (info) =>
				renderComponent(RemoveCell, {
					label: info.row.original.name,
					onclick: () => removeStratum(info.row.original.id)
				})
		}
	]

	const computedById = $derived(new Map(results.strata.map((s) => [s.id, s])))
	const maxNi = $derived(Math.max(0, ...results.strata.map((s) => s.ni ?? 0)))

	const table = createTable({
		features,
		columns,
		get data() {
			return project.strata
		},
		getRowId: (row) => row.id
	})

	function removeStratum(id) {
		project.strata = project.strata.filter((s) => s.id !== id)
	}

	function addStratum() {
		project.strata = [
			...project.strata,
			{
				id: crypto.randomUUID(),
				name: `Stratum ${project.strata.length + 1}`,
				area: null,
				mean: null,
				varianceInput: { mode: 'sd', value: null }
			}
		]
	}
</script>

<Card.Root class="plate gap-4 py-4">
	<Card.Header class="px-4">
		<Card.Title class="engraved">Strata ledger</Card.Title>
		<Card.Description>Area, mean carbon stock and variability per stratum — values update the readout live</Card.Description>
	</Card.Header>
	<Card.Content class="px-4">
		<div class="overflow-x-auto">
		<Table>
			<TableHeader>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<TableRow>
						{#each headerGroup.headers as header (header.id)}
							<TableHead class={header.column.columnDef.numeric ? 'text-right' : ''}>
								{#if !header.isPlaceholder}
									<FlexRender {header} />
								{/if}
							</TableHead>
						{/each}
					</TableRow>
				{/each}
			</TableHeader>
			<TableBody>
				{#each table.getRowModel().rows as row (row.id)}
					{@const computed = computedById.get(row.original.id)}
					<TableRow class={computed?.excluded ? 'excluded-rule opacity-85' : ''}>
						{#each row.getAllCells() as cell (cell.id)}
							<TableCell
								class={`font-mono text-sm tabular-nums [&_input]:font-mono${
									cell.column.columnDef.numeric ? ' text-right' : ''
								}`}
							>
								<FlexRender {cell} />
							</TableCell>
						{/each}
					</TableRow>
				{:else}
					<TableRow>
						<TableCell colspan={columns.length} class="py-8 text-center">
							<span class="engraved">No strata yet — draw the first line below to begin</span>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
			<TableFooter>
				<TableRow class="sum-rule font-mono hover:bg-transparent">
					<TableCell class="engraved pt-3">Total</TableCell>
					<TableCell class="pt-3 text-right">{fmt(results.totalArea, 0)}</TableCell>
					<TableCell colspan={5} class="pt-3"></TableCell>
					<TableCell class="pt-3 text-right text-sm font-bold">{results.method ? fmt(results.nRaw) : '—'}</TableCell>
					<TableCell class="pt-3 text-right text-sm font-bold">{results.method ? fmt(results.totalAllocation, 0) : '—'}</TableCell>
					<TableCell class="pt-3"></TableCell>
				</TableRow>
			</TableFooter>
		</Table>
		</div>

		<!-- next blank line -->
		<button
			type="button"
			class="mt-3 flex h-9 w-full items-center gap-2 border border-dashed border-input px-3 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={addStratum}
		>
			<PlusIcon class="size-3.5" />
			<span class="engraved">Add stratum</span>
		</button>
	</Card.Content>
</Card.Root>
