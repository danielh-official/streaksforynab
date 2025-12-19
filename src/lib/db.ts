import { Dexie, type EntityTable } from 'dexie';
import type { BudgetDetail, TransactionDetail } from 'ynab';

interface MetaBudget {
	id: string;
	transactions_server_knowledge: number;
	last_fetched: Date;
}

interface Habit {
	id: number;
	name: string;
	goal: number;
	goal_type: 'above' | 'below';
	query: string | null;
	start_date: Date;
	created_at: Date;
	updated_at: Date;
	transactions: TransactionDetail[];
	skipped_dates: Date[];
	day_records: HabitDayRecord[];
}

interface HabitDayRecord {
	date: Date;
	completed: boolean;
}

const db = new Dexie('StreaksForYnabDB') as Dexie & {
	budgets: EntityTable<BudgetDetail, 'id'>;
	transactions: EntityTable<TransactionDetail, 'id'>;
	meta_budgets: EntityTable<MetaBudget, 'id'>;
	habits: EntityTable<Habit, 'id'>;
};

// Schema declaration:
db.version(1).stores({
	budgets: 'id',
	transactions: 'id',
	meta_budgets: 'id',
	habits: '++id'
});

export type { MetaBudget, Habit, HabitDayRecord };
export { db };
