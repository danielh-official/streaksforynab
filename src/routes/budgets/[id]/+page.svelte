<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db, type HabitQuery } from '$lib/db';
	import { page } from '$app/state';
	import { liveQuery } from 'dexie';
	import HabitComponent from '$lib/components/habit.svelte';
	import { setTransactionsAndDayStatusesForHabit } from '$lib';
	import QueryBuilder from '$lib/components/habit/QueryBuilder.svelte';
	import type { TransactionDetail, TransactionsResponse } from 'ynab';
	import { PUBLIC_BASE_PATH } from '$env/static/public';

	let isOnline = $state(navigator.onLine);

	let loading = $state(true);

	onMount(async () => {
		if (browser) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		loading = false;

		const updateStatus = () => {
			isOnline = navigator.onLine;
		};

		window.addEventListener('online', updateStatus);
		window.addEventListener('offline', updateStatus);
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
			const response = await fetch(
				`https://api.ynab.com/v1/budgets/${budgetId}/transactions?last_knowledge_of_server=${lastKnowledgeOfServer}`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			const responseData: TransactionsResponse = await response.json();

			responseData.data.transactions.forEach(async (transaction: TransactionDetail) => {
				await db.transactions.put(transaction, 'id');
			});

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

			const now = new Date();

			db.meta_budgets.put(
				{
					id: budgetId,
					transactions_server_knowledge: responseData.data.server_knowledge,
					transactions_last_fetched: now,
					habits_last_refreshed: now
				},
				'id'
			);
		} catch (error) {
			console.error('Error fetching transactions:', error);
			fetchingTransactions = false;
			alert('Failed to fetch transactions.');
		}
	}

	let refreshingHabits = $state(false);

	async function refreshHabits() {
		if (!browser) return;

		refreshingHabits = true;

		// Small delay to show loading state
		await new Promise((resolve) => setTimeout(resolve, 500));

		try {
			$habits.forEach((habit) => {
				setTransactionsAndDayStatusesForHabit({
					habit_id: habit.id,
					goal_type: habit.goal_type,
					goal: habit.goal,
					start_date: habit.start_date,
					query: habit.query
				});
			});

			const metaBudget = await db.meta_budgets.get(page.params.id ?? '');
			if (!metaBudget) throw new Error('Meta budget not found');

			const now = new Date();

			metaBudget.habits_last_refreshed = now;

			await db.meta_budgets.put(metaBudget, 'id');
		} catch (error) {
			console.error('Error refreshing habits:', error);
			alert('Failed to refresh habits.');
		}

		refreshingHabits = false;
	}

	let showHabitCreationModal = $state(false);

	let createHabitDialog = $state(); // HTMLDialogElement

	$effect(() => {
		if (!browser) return;

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
		if (!browser) return;

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
		if (!browser) return;

		const budgetId = page.params.id;
		if (!budgetId) return null;

		const meta = await db.meta_budgets.get(budgetId);
		return meta?.transactions_last_fetched || null;
	});

	const habitsLastRefreshed = liveQuery(async () => {
		if (!browser) return;

		const budgetId = page.params.id;
		if (!budgetId) return null;

		const meta = await db.meta_budgets.get(budgetId);
		return meta?.habits_last_refreshed || null;
	});

	const habits = liveQuery(() => db.habits.toArray());

	const transactions = liveQuery(() => db.transactions.toArray());

	let viewHabitDialog = $state(); // HTMLDialogElement

	let showViewHabitModal = $state(false);

	$effect(() => {
		if (!browser) return;

		if (showViewHabitModal && viewHabitDialog instanceof HTMLDialogElement) {
			viewHabitDialog.showModal();
		}

		if (!showViewHabitModal && viewHabitDialog instanceof HTMLDialogElement) {
			viewHabitDialog.close();
		}
	});

	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

	let lastFetchedRelative = $derived.by(() => {
		if (!browser) return '';

		if (!$lastFetched) return 'Never';

		const now = new Date();
		const lastFetchedDate = new Date($lastFetched);

		const diffInMinutes = Math.round((lastFetchedDate.getTime() - now.getTime()) / 1000 / 60);

		return rtf.format(diffInMinutes, 'minute');
	});

	let habitsLastRefreshedRelative = $derived.by(() => {
		if (!browser) return '';

		if (!$habitsLastRefreshed) return 'Never';

		const now = new Date();
		const lastRefreshedDate = new Date($habitsLastRefreshed);

		const diffInMinutes = Math.round((lastRefreshedDate.getTime() - now.getTime()) / 1000 / 60);

		return rtf.format(diffInMinutes, 'minute');
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
	{:else}
		<div class="text-center flex flex-col gap-y-8">
			{#if !isOnline}
				<p class="text-red-500">You are currently offline. Some features may be unavailable.</p>
			{/if}

			<div class="flex md:flex-row flex-col gap-y-4 gap-x-4 justify-center p-5">
				<a
					href={`${PUBLIC_BASE_PATH ? PUBLIC_BASE_PATH : '/'}`}
					class="text-blue-500 px-4 py-2 rounded hover:text-blue-600 hover:underline cursor-pointer"
				>
					Back to Budgets
				</a>
				<button
					onclick={fetchTransactionsForBudget}
					class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={fetchingTransactions || !isOnline}
				>
					{#if fetchingTransactions}
						Fetching Transactions...
					{:else}
						Fetch Transactions For Budget
					{/if}
				</button>
				<button
					onclick={refreshHabits}
					class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={$habits?.length === 0 || refreshingHabits}
				>
					{#if refreshingHabits}
						Refreshing Habits...
					{:else}
						Refresh Habits
					{/if}
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

			<div class="grid grid-cols-2 gap-y-2 border border-gray-300 p-4">
				<div>
					<div>
						Transactions Last Fetched: {#if $lastFetched}
							{lastFetchedRelative}
						{:else}
							Never
						{/if}
					</div>
					<div>
						Habits Last Refreshed: {#if $habitsLastRefreshed}
							{habitsLastRefreshedRelative}
						{:else}
							Never
						{/if}
					</div>
				</div>
				<div>
					<div>
						Habits Count: {$habits?.length || 0}
					</div>
					<div>
						Transactions Count: {$transactions?.length || 0}
					</div>
				</div>
			</div>

			<div class="grid md:grid-cols-3 gap-4">
				{#each $habits as habit}
					<HabitComponent {habit} />
				{/each}
			</div>
		</div>
	{/if}
</div>
