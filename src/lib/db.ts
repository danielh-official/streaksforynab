import { Dexie, type EntityTable } from 'dexie';

interface Habit {
	id?: number;
	name: string;
	goal: string;
	goal_type: 'above' | 'below';
	amount: number;
	start_date: Date;
}

const db = new Dexie('StreaksForYnabDB') as Dexie & {
	postings: EntityTable<
		Habit,
		'id' // primary key "id" (for the typings only)
	>;
};

db.version(1).stores({
	habits: ['++id', 'name', 'goal', 'goal_type', 'amount', 'start_date'].join(', ') // Primary key and indexed props
});

export type { Habit };
export { db };
