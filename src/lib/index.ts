// place files you want to import through the `$lib` alias in this folder.

import { db, type HabitDayRecord, type HabitQuery } from '$lib/db';
import type { TransactionDetail } from 'ynab';

export async function setTransactionsAndDayStatusesForHabit(params: {
	habit_id: number;
	goal_type: 'above' | 'below';
	goal: number;
	start_date: Date;
	query: HabitQuery | null;
}) {
	try {
		const { goal_type, goal, start_date, query } = params;

		const habit = await db.habits.get(params.habit_id);

		const allTransactions = await db.transactions.toArray();

		if (!habit) {
			throw new Error('Habit not found');
		}

		const filteredInTransactions = allTransactions.filter((transaction) =>
			filterTransaction(transaction, query, start_date)
		);

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
				completed,
				amount: Number(totalAmountForTheDay.toFixed(2))
			});
		}

		await db.habits.update(params.habit_id, {
			day_records: calculatedDayRecords
		});
	} catch (error) {
		console.error('Error setting transactions and day statuses for habit:', error);
	}
}

export function filterTransaction(
	transaction: TransactionDetail,
	query: HabitQuery | null,
	start_date: Date
) {
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

	if (!transaction.approved) {
		return false;
	}

	if (query && !parseQuery(query, transaction)) {
		return false;
	}

	return true;
}

function parseQuery(query: HabitQuery, transaction: TransactionDetail): boolean {
	if (!query.subgroups.length) return true;

	const evalSubgroup = (subgroup: HabitQuery['subgroups'][number]): boolean => {
		if (!subgroup.conditions.length) return true;

		const results = subgroup.conditions.map((condition) => {
			const rawValue = (transaction as any)[condition.field] ?? '';
			const fieldValue = String(rawValue).toLowerCase();
			const compareValue = condition.value.toLowerCase();

			switch (condition.operator) {
				case 'contains':
					return fieldValue.includes(compareValue);
				case 'does_not_contain':
					return !fieldValue.includes(compareValue);
				case 'is':
					return fieldValue === compareValue;
				case 'is_not':
					return fieldValue !== compareValue;
				default:
					return false;
			}
		});

		return subgroup.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
	};

	const subgroupResults = query.subgroups.map(evalSubgroup);

	return query.operator === 'and' ? subgroupResults.every(Boolean) : subgroupResults.some(Boolean);
}
