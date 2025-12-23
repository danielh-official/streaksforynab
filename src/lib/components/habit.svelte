<script lang="ts">
	import { db, type Habit, type HabitDayRecord, type HabitQuery } from '$lib/db';
	import { setTransactionsAndDayStatusesForHabit } from '$lib';
	import QueryBuilder from './habit/QueryBuilder.svelte';

	let { habit } = $props<{
		habit: Habit;
	}>();

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

	function confirmDelete(habitId: number) {
		return async () => {
			const confirmed = confirm('Are you sure you want to delete this habit?');
			if (confirmed) {
				try {
					await db.habits.delete(habitId);
				} catch (error) {
					console.error('Error deleting habit:', error);
					alert('Failed to delete habit.');
				}
			}
		};
	}

	let editHabitDialog = $state(); // HTMLDialogElement

	let showHabitEditModal = $state(false);

	$effect(() => {
		if (showHabitEditModal && editHabitDialog instanceof HTMLDialogElement) {
			editHabitDialog.showModal();
		}

		if (!showHabitEditModal && editHabitDialog instanceof HTMLDialogElement) {
			editHabitDialog.close();
		}
	});

	let editHabitFormData: HabitFormData = $state({
		name: '',
		goal_type: 'above',
		goal: 0,
		start_date: new Date().toISOString().split('T')[0],
		query: null
	});

	function setShowHabitEditModalToTrue(habit: Habit) {
		return () => {
			editHabitFormData = {
				name: habit.name,
				goal_type: habit.goal_type,
				goal: habit.goal,
				start_date: habit.start_date.toISOString().split('T')[0],
				query: habit.query
			};
			showHabitEditModal = true;
		};
	}

	function setShowHabitEditModalToFalse() {
		return () => {
			showHabitEditModal = false;
		};
	}

	function updateExistingHabit(event: Event, habit: Habit) {
		event.preventDefault();

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

			db.habits
				.where({
					id: habit.id
				})
				.modify({
					name: editHabitFormData.name,
					goal_type: editHabitFormData.goal_type,
					goal: Number(editHabitFormData.goal),
					start_date: new Date(editHabitFormData.start_date + 'T00:00:00'),
					query: normalizeHabitQuery(editHabitFormData.query),
					updated_at: new Date()
				});

			setTransactionsAndDayStatusesForHabit({
				habit_id: habit.id,
				goal_type: editHabitFormData.goal_type,
				goal: Number(editHabitFormData.goal),
				start_date: new Date(editHabitFormData.start_date + 'T00:00:00'),
				query: editHabitFormData.query
			});
		} catch (error) {
			console.error('Error editing habit:', error);
			alert('Failed to edit habit.');
		}

		showHabitEditModal = false;
	}

	function getCurrentStreak(habit: Habit): number {
		const today = new Date();
		let streak = 0;

		for (let i = habit.day_records?.length - 1; i >= 0; i--) {
			const record = habit.day_records[i];
			const recordDate = new Date(record.date);
			recordDate.setHours(0, 0, 0, 0);
			today.setHours(0, 0, 0, 0);

			if (recordDate > today) {
				continue;
			}

			if (record.completed) {
				streak++;
			} else {
				break;
			}
		}

		return streak;
	}

	let streak = $derived.by(() => getCurrentStreak(habit));

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

	let selectedMonth = $state(new Date().getMonth());
	let selectedYear = $state(new Date().getFullYear());

	let currentRangeOfDates = $derived.by(() => {
		const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
		const dates = [];
		for (let day = 1; day <= daysInMonth; day++) {
			dates.push(new Date(selectedYear, selectedMonth, day));
		}
		return dates;
	});

	let anchorDate = $derived.by(() => new Date(selectedYear, selectedMonth, 1));

	function getStyleForDate(date: Date): string {
		const record = (habit as Habit).day_records?.find(
			(record: HabitDayRecord) => new Date(record.date).toDateString() === date.toDateString()
		);
		if (record) {
			return record.completed ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
		}
		const dateIsFuture = date > new Date();
		if (dateIsFuture) {
			return 'bg-gray-300 text-gray-500';
		}
		const dateIsBeforeStart = date < (habit as Habit).start_date;
		if (dateIsBeforeStart) {
			return 'bg-gray-300 text-gray-500';
		}
		return '';
	}

	const todayAmount = $derived.by(() => {
		const todayDate = new Date();
		const todayRecord = (habit as Habit).day_records?.find(
			(record: HabitDayRecord) => new Date(record.date).toDateString() === todayDate.toDateString()
		);
		if (todayRecord) {
			return todayRecord.amount;
		}
		return 0;
	});

	const todayProgress = $derived.by(() => {
		return todayAmount / habit.goal;
	});
</script>

<div
	class="border border-gray-300 rounded p-4 shadow hover:shadow-lg transition"
	id={'habit-' + habit.id}
>
	<div class="flex justify-end mb-2">
		<button
			type="button"
			class="text-gray-400 hover:text-gray-600 cursor-move"
			title="Drag to reorder"
			aria-label="Drag habit to reorder"
		>
			☰
		</button>
	</div>

	<!-- TODO: When dragging, make sure the box is not transparent. -->

	<div>
		<h2 class="text-lg font-bold">{habit.name}</h2>
		<p>Goal: {habit.goal_type} {habit.goal}</p>
		<p>Start Date: {new Date(habit.start_date).toLocaleDateString()}</p>
		<p>Current Streak: {streak} days</p>
	</div>

	<!-- A goal ring that displays the progress towards the habit goal and the percentage within it -->

	<div class="mt-4 flex justify-center items-center">
		<svg width="100" height="100" viewBox="0 0 100 100" class="fill-current">
			<circle cx="50" cy="50" r="45" stroke="#e5e7eb" stroke-width="10" fill="none" />
			<circle
				cx="50"
				cy="50"
				r="45"
				stroke="#10b981"
				stroke-width="10"
				fill="none"
				stroke-dasharray="282.6"
				stroke-dashoffset={282.6 * (1 - Math.min(todayProgress, 1))}
				transform="rotate(-90 50 50)"
			/>
			<text x="50" y="55" text-anchor="middle" font-size="15">
				{Math.min(Math.round(todayProgress * 100), 100)}%
			</text>
		</svg>
	</div>

	<div class="mt-4 flex md:flex-row flex-col gap-y-2 gap-x-2 justify-end text-sm">
		<button
			class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded cursor-pointer"
			onclick={() => (showViewHabitModal = true)}>Details</button
		>

		<dialog
			bind:this={viewHabitDialog}
			onclose={() => (showViewHabitModal = false)}
			class="rounded-lg p-6 border border-gray-300 shadow-lg md:w-3/4 md:h-3/4 xl:w-2/4 mx-auto my-auto dark:bg-gray-800 dark:text-white"
		>
			<div class="flex justify-between">
				<h2 class="text-xl font-bold mb-4">Habit Details</h2>

				<button
					class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600 cursor-pointer mb-4"
					onclick={() => (showViewHabitModal = false)}
				>
					Close
				</button>
			</div>

			<div class="flex flex-col gap-y-4">
				<h3 class="text-lg font-semibold mb-2">{habit.name}</h3>
			</div>

			<div class="flex flex-col gap-y-4">
				<div class="flex justify-between items-center">
					<h3 class="text-lg font-semibold mb-2">
						<button
							class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={selectedYear === (habit as Habit).start_date?.getFullYear() &&
								selectedMonth === (habit as Habit).start_date?.getMonth()}
							onclick={() => {
								if (selectedMonth === 0) {
									selectedMonth = 11;
									selectedYear -= 1;
								} else {
									selectedMonth -= 1;
								}
							}}>&lAarr;</button
						>
					</h3>
					<h3 class="text-lg font-semibold mb-2">
						{anchorDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
					</h3>
					<h3 class="text-lg font-semibold mb-2">
						<button
							class="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={selectedYear === new Date().getFullYear() &&
								selectedMonth === new Date().getMonth()}
							onclick={() => {
								if (selectedMonth === 11) {
									selectedMonth = 0;
									selectedYear += 1;
								} else {
									selectedMonth += 1;
								}
							}}>&rAarr;</button
						>
					</h3>
				</div>

				<div class="grid grid-cols-7 gap-4">
					{#each currentRangeOfDates as date (date.getTime())}
						<div
							class={`md:w-10 md:h-10 w-7 h-7 flex items-center justify-center border rounded-3xl ${getStyleForDate(date)}`}
						>
							{date.getDate()}
						</div>
					{/each}
				</div>
			</div>

			<div
				class="flex flex-col gap-y-2 p-6 border border-gray-300 rounded mt-6 dark:border-gray-700"
			>
				<p>Goal: {habit.goal_type} {habit.goal}</p>
				<p>Start Date: {new Date(habit.start_date).toLocaleDateString()}</p>
				<p>Current Streak: {streak} days</p>
				<p>Transactions: {habit.transactions?.length}</p>
			</div>
		</dialog>

		<button
			class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
			onclick={setShowHabitEditModalToTrue(habit)}>Edit</button
		>

		<dialog
			bind:this={editHabitDialog}
			onclose={setShowHabitEditModalToFalse()}
			class="rounded-lg p-6 border border-gray-300 shadow-lg w-full md:h-3/4 xl:w-2/4 mx-auto my-auto dark:bg-gray-800 dark:text-white"
		>
			<h2 class="text-xl font-bold mb-4">Update Existing Habit</h2>
			<form
				method="dialog"
				class="flex flex-col gap-y-4"
				onsubmit={(e) => updateExistingHabit(e, habit)}
			>
				<div class="flex flex-col">
					<label for="name">Name of Habit</label>
					<input
						id="name"
						name="name"
						type="text"
						class="border border-gray-300 rounded px-2 py-1 mt-1 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						required
						bind:value={editHabitFormData.name}
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
						bind:value={editHabitFormData.goal_type}
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
						bind:value={editHabitFormData.goal}
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
						bind:value={editHabitFormData.start_date}
						max={new Date().toISOString().split('T')[0]}
					/>
				</div>

				<div class="flex flex-col">Query (Optional)</div>

				<QueryBuilder bind:value={editHabitFormData.query} />

				<div class="flex justify-end gap-x-4">
					<button
						type="button"
						class="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 cursor-pointer dark:bg-gray-700 dark:hover:bg-gray-600"
						onclick={setShowHabitEditModalToFalse()}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="bg-green-500 px-4 py-2 rounded hover:bg-green-600 cursor-pointer"
					>
						Update Habit
					</button>
				</div>
			</form>
		</dialog>

		<button
			class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
			onclick={confirmDelete(habit.id)}>Delete</button
		>
	</div>
</div>
