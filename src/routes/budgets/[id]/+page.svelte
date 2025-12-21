<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { derived } from 'svelte/store';
	import * as ynab from 'ynab';
	import { db, type HabitQuery } from '$lib/db';
	import { page } from '$app/state';
	import { liveQuery } from 'dexie';
	import HabitComponent from '$lib/components/habit.svelte';
	import { setTransactionsAndDayStatusesForHabit } from '$lib';
	import QueryBuilder from '$lib/components/habit/QueryBuilder.svelte';

	let loading = $state(false);

	onMount(async () => {
		loading = true;

		if (browser) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		loading = false;
	});

	let currentUrl = derived([], () => {
		if (browser) {
			// Get current root URL
			return window.location.origin;
		}
		return '';
	});

	let authUrl = derived(currentUrl, ($currentUrl) => {
		const clientId = 'BcdLFTpW1QxdDNy0RwfCiuTxEKSYMB0i3cQRB8SpkeY';

		const redirectUri = `${$currentUrl}/callback`;

		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`;
	});

	let authToken = derived([], () => {
		if (browser) {
			return sessionStorage.getItem('ynab_access_token') || null;
		}
		return null;
	});

	let fetchingTransactions = $state(false);

	async function fetchTransactionsForBudget() {
		if (!browser) return;

		const token = sessionStorage.getItem('ynab_access_token');
		if (!token) return;

		const budgetId = page.params.id;

		if (!budgetId) {
			alert('No budget ID found in URL!');
			return;
		}

		fetchingTransactions = true;

		let lastKnowledgeOfServer = await db.meta_budgets
			.get(budgetId)
			.then((meta) => meta?.transactions_server_knowledge || 0)
			.catch(() => 0);

		try {
			const responseData = await new ynab.API(token).transactions.getTransactions(
				budgetId,
				undefined,
				undefined,
				lastKnowledgeOfServer
			);

			responseData.data.transactions.forEach(async (transaction) => {
				await db.transactions.put(transaction, 'id');
			});

			db.meta_budgets.put(
				{
					id: budgetId,
					transactions_server_knowledge: responseData.data.server_knowledge,
					last_fetched: new Date()
				},
				'id'
			);

			alert('Transactions fetched and stored locally!');

			fetchingTransactions = false;

			$habits.forEach((habit) => {
				setTransactionsAndDayStatusesForHabit({
					habit_id: habit.id,
					goal_type: habit.goal_type,
					goal: habit.goal,
					start_date: habit.start_date,
					query: habit.query
				});
			});
		} catch (error) {
			console.error('Error fetching transactions:', error);
			fetchingTransactions = false;
			alert('Failed to fetch transactions.');
		}
	}

	let showHabitCreationModal = $state(false);

	let createHabitDialog = $state(); // HTMLDialogElement

	$effect(() => {
		if (showHabitCreationModal && createHabitDialog instanceof HTMLDialogElement) {
			createHabitDialog.showModal();
		}

		if (!showHabitCreationModal && createHabitDialog instanceof HTMLDialogElement) {
			createHabitDialog.close();
		}
	});

	interface HabitFormData {
		name: string;
		goal_type: 'above' | 'below';
		goal: number;
		start_date: string;
		query: HabitQuery | null;
	}

	let createHabitFormData: HabitFormData = $state({
		name: '',
		goal_type: 'below',
		goal: 10,
		start_date: new Date().toISOString().split('T')[0],
		query: null
	});

	async function createNewHabit(event: Event) {
		event.preventDefault();

		const budgetId = page.params.id;

		try {
			function normalizeHabitQuery(query: HabitQuery | null): HabitQuery | null {
				if (!query) return null;

				return {
					operator: query.operator,
					subgroups: query.subgroups.map((sg) => ({
						operator: sg.operator,
						conditions: sg.conditions.map((c) => ({
							field: c.field,
							value: c.value,
							operator: c.operator
						}))
					}))
				};
			}

			const newHabit = {
				budget_id: budgetId,
				name: createHabitFormData.name,
				goal_type: createHabitFormData.goal_type,
				goal: Number(createHabitFormData.goal),
				start_date: new Date(createHabitFormData.start_date + 'T00:00:00'),
				query: normalizeHabitQuery(createHabitFormData.query),
				created_at: new Date(),
				updated_at: new Date(),
				skipped_dates: [],
				transactions: [],
				day_records: []
			};

			const habitId = await db.habits.add(newHabit);

			if (habitId) {
				setTransactionsAndDayStatusesForHabit({
					habit_id: habitId,
					goal_type: newHabit.goal_type,
					goal: newHabit.goal,
					start_date: newHabit.start_date,
					query: newHabit.query
				});
			}
		} catch (error) {
			console.error('Error creating habit:', error);
			alert('Failed to create habit.');
		}

		// Reset form data
		createHabitFormData = {
			name: '',
			goal_type: 'above',
			goal: 10,
			start_date: new Date().toISOString().split('T')[0],
			query: null
		};

		showHabitCreationModal = false;
	}

	const lastFetched = liveQuery(async () => {
		const budgetId = page.params.id;
		if (!budgetId) return null;

		const meta = await db.meta_budgets.get(budgetId);
		return meta?.last_fetched || null;
	});

	const habits = liveQuery(() => db.habits.toArray());

	let viewHabitDialog = $state(); // HTMLDialogElement

	let showViewHabitModal = $state(false);

	$effect(() => {
		if (showViewHabitModal && viewHabitDialog instanceof HTMLDialogElement) {
			viewHabitDialog.showModal();
		}

		if (!showViewHabitModal && viewHabitDialog instanceof HTMLDialogElement) {
			viewHabitDialog.close();
		}
	});
</script>

<svelte:head>
	<title>Budget | Streaks (For YNAB)</title>
</svelte:head>

<div class="flex justify-center items-center md:h-screen">
	{#if loading}
		<div
			class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"
		></div>
	{:else if $authToken}
		<div class="text-center flex flex-col gap-y-8">
			<div class="flex md:flex-row flex-col gap-y-4 gap-x-4 justify-center p-5">
				<a href="/" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
					Back to Budgets
				</a>
				<button
					onclick={fetchTransactionsForBudget}
					class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
				>
					Fetch Transactions For Budget
				</button>
				<button
					class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 cursor-pointer"
					onclick={() => (showHabitCreationModal = true)}
				>
					Create New Habit
				</button>

				<dialog
					bind:this={createHabitDialog}
					onclose={() => (showHabitCreationModal = false)}
					class="rounded-lg p-6 border border-gray-300 shadow-lg w-full md:h-3/4 xl:w-2/4 mx-auto my-auto dark:bg-gray-800 dark:text-white"
				>
					<h2 class="text-xl font-bold mb-4">Create New Habit</h2>
					<form method="dialog" class="flex flex-col gap-y-4" onsubmit={createNewHabit}>
						<div class="flex flex-col">
							<label for="name">Name of Habit</label>
							<input
								id="name"
								name="name"
								type="text"
								class="border border-gray-300 rounded px-2 py-1 mt-1 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
								required
								bind:value={createHabitFormData.name}
								placeholder="e.g., Spend Less on Coffee"
							/>
						</div>

						<div class="flex flex-col">
							<label for="goal_type">Goal Type</label>
							<select
								id="goal_type"
								name="goal_type"
								class="border border-gray-300 rounded px-2 py-1 mt-1 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
								required
								bind:value={createHabitFormData.goal_type}
							>
								<option value="below">Below</option>
								<option value="above">Above</option>
							</select>
						</div>

						<div class="flex flex-col">
							<label for="goal">Goal Amount</label>
							<input
								id="goal"
								name="goal"
								type="number"
								class="border border-gray-300 rounded px-2 py-1 mt-1 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
								required
								bind:value={createHabitFormData.goal}
							/>
						</div>

						<div class="flex flex-col">
							<label for="start_date">Start Date</label>
							<input
								id="start_date"
								name="start_date"
								type="date"
								class="border border-gray-300 rounded px-2 py-1 mt-1 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
								required
								bind:value={createHabitFormData.start_date}
								max={new Date().toISOString().split('T')[0]}
							/>
						</div>

						<div class="flex flex-col">Query (Optional)</div>

						<QueryBuilder bind:value={createHabitFormData.query} />

						<div class="flex justify-end gap-x-4">
							<button
								type="button"
								class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600 cursor-pointer"
								onclick={() => (showHabitCreationModal = false)}
							>
								Cancel
							</button>
							<button
								type="submit"
								class="bg-green-500 px-4 py-2 rounded hover:bg-green-600 cursor-pointer"
							>
								Create Habit
							</button>
						</div>
					</form>
				</dialog>
			</div>

			{#if fetchingTransactions}
				<p>Fetching transactions...</p>
			{/if}

			<div class="flex flex-col gap-y-2 border border-gray-300 p-4">
				<div>
					Transactions Last Fetched: {#if $lastFetched}
						{new Date($lastFetched).toLocaleString()}
					{:else}
						Never
					{/if}
				</div>

				<div>
					Transactions Count: {#await db.transactions.count() then count}
						{count}
					{/await}
				</div>
			</div>

			<div class="grid md:grid-cols-3 gap-4">
				{#each $habits as habit}
					<HabitComponent {habit} />
				{/each}
			</div>
		</div>
	{:else}
		<div class="text-center">
			<h1 class="text-2xl font-bold mb-4">Welcome to Streaks (For YNAB)</h1>
			<p class="mb-4">Please log in with your YNAB account to continue.</p>
			<a href={$authUrl} class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
				>Log in with YNAB</a
			>
		</div>
	{/if}
</div>
