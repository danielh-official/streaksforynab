// place files you want to import through the `$lib` alias in this folder.

import { db, type HabitDayRecord } from '$lib/db';

export async function setTransactionsAndDayStatusesForHabit(params: {
	habit_id: number;
	goal_type: 'above' | 'below';
	goal: number;
	start_date: Date;
	query: string | null;
}) {
	try {
		const { goal_type, goal, start_date, query } = params;

		const habit = await db.habits.get(params.habit_id);

		const allTransactions = await db.transactions.toArray();

		if (!habit) {
			throw new Error('Habit not found');
		}

		const filteredInTransactions = allTransactions.filter((transaction) => {
			const transactionDate = new Date(transaction.date + 'T00:00:00');
			if (transactionDate < start_date) {
				return false;
			}

			if (transaction.amount >= 0) {
				return false;
			}

			if (transaction.deleted) {
				return false;
			}

			if (transaction.transfer_account_id) {
				return false;
			}

			if (query) {
				const lowerCaseQuery = query.toLowerCase();
				const matchesPayee = transaction.payee_name
					? transaction.payee_name.toLowerCase().includes(lowerCaseQuery)
					: false;
				const matchesMemo = transaction.memo
					? transaction.memo.toLowerCase().includes(lowerCaseQuery)
					: false;

				if (!matchesPayee && !matchesMemo) {
					return false;
				}
			}

			return true;
		});

		await db.habits.update(params.habit_id, {
			transactions: filteredInTransactions
		});

		const calculatedDayRecords: HabitDayRecord[] = [];

		const rangeFromHabitStartToToday = Math.ceil(
			(new Date().getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)
		);

		for (let i = 0; i <= rangeFromHabitStartToToday; i++) {
			const currentDate = new Date(start_date);
			currentDate.setDate(start_date.getDate() + i);

			const transactionsForTheDay = filteredInTransactions.filter((transaction) => {
				const transactionDate = new Date(transaction.date + 'T00:00:00');
				return (
					transactionDate.getFullYear() === currentDate.getFullYear() &&
					transactionDate.getMonth() === currentDate.getMonth() &&
					transactionDate.getDate() === currentDate.getDate()
				);
			});

			const totalAmountForTheDay = transactionsForTheDay.reduce(
				(sum, transaction) => sum + Math.abs(transaction.amount) / 1000,
				0
			);

			let completed: boolean = false;

			if (goal_type === 'above') {
				completed = totalAmountForTheDay >= goal;
			} else {
				completed = totalAmountForTheDay <= goal;
			}

			calculatedDayRecords.push({
				date: currentDate,
				completed
			});
		}

		await db.habits.update(params.habit_id, {
			day_records: calculatedDayRecords
		});
	} catch (error) {
		console.error('Error setting transactions and day statuses for habit:', error);
	}
}
