import { Dexie, type EntityTable } from "dexie"
import type { BudgetDetail, TransactionDetail } from "ynab"

interface MetaBudget {
    id: string
    server_knowledge: number
    last_fetched: Date
}

const db = new Dexie("StreaksForYnabDB") as Dexie & {
    budgets: EntityTable<BudgetDetail,
    "id" // primary key "id" (for the typings only)
  >,
    transactions: EntityTable<TransactionDetail,
    "id" // primary key "id" (for the typings only)
  >
    meta_budgets: EntityTable<MetaBudget,
    "id" // primary key "id" (for the typings only)
  >
}

// Schema declaration:
db.version(1).stores({
    budgets: "id",
    transactions: "id",
    meta_budgets: "id"
})

export type { MetaBudget }
export { db }
