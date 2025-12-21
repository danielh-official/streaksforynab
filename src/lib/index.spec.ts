import { filterTransaction } from "$lib";
import { describe, expect, it } from "vitest";
import { TransactionClearedStatus, type TransactionDetail } from "ynab";
import type { HabitQuery } from "./db";

describe("filter transaction", () => {
    describe.each([
        {
            representation: "(category_name contains 'Coffee' AND payee_name is not 'Starbucks') OR (memo contains 'Work')",
            query: {
                operator: 'or',
                subgroups: [
                    {
                        operator: 'and',
                        conditions: [
                            {
                                field: 'category_name',
                                operator: 'contains',
                                value: 'Coffee'
                            },
                            {
                                field: 'payee_name',
                                operator: 'is_not',
                                value: 'Starbucks'
                            }
                        ]
                    },
                    {
                        operator: 'and',
                        conditions: [
                            {
                                field: 'memo',
                                operator: 'contains',
                                value: 'Work'
                            }
                        ]
                    }
                ]
            } as HabitQuery,
            cases: [
                {
                    transaction: {
                        category_name: 'Coffee Shops', // Category name contains 'Coffee'
                        payee_name: 'Dunkin Donuts', // Payee name is not 'Starbucks'
                        account_name: 'Checking Account',
                        memo: 'Morning Coffee Run', // Memo does not contain 'Work' but first condition is satisfied and OR logic applies
                        amount: -500,
                        id: "test",
                        date: "2024-06-15",
                        cleared: TransactionClearedStatus.Cleared,
                        approved: true,
                        account_id: "2340923u4r42342",
                        deleted: false,
                        subtransactions: []
                    } as TransactionDetail,
                    expected: true,
                    date: new Date('2024-06-15')
                },
                {
                    transaction: {
                        category_name: 'Groceries', // Category name does not contain 'Coffee'
                        payee_name: 'Whole Foods', // Payee name is not 'Starbucks' but first condition fails
                        account_name: 'Checking Account',
                        memo: 'Weekly Shopping', // Memo does not contain 'Work', resulting in both conditions failing
                        amount: -8000,
                        id: "test2",
                        date: "2024-06-16",
                        cleared: TransactionClearedStatus.Cleared,
                        approved: true,
                        account_id: "2340923u4r42342",
                        deleted: false,
                        subtransactions: []
                    } as TransactionDetail,
                    expected: false,
                    date: new Date('2024-06-15')
                }
            ]
        },
        {
            representation: "category_name is 'Dining' AND payee_name contains 'Pizza'",
            query: {
                operator: 'and',
                subgroups: [
                    {
                        operator: 'and',
                        conditions: [
                            {
                                field: 'category_name',
                                operator: 'is',
                                value: 'Dining'
                            },
                            {
                                field: 'payee_name',
                                operator: 'contains',
                                value: 'Pizza'
                            }
                        ]
                    }
                ]
            } as HabitQuery,
            cases: [
                {
                    transaction: {
                        category_name: 'Dining',
                        payee_name: 'Pizza Hut',
                        account_name: 'Credit Card',
                        memo: 'Dinner with friends',
                        amount: -2500,
                        id: "test3",
                        date: "2024-06-17",
                        cleared: TransactionClearedStatus.Cleared,
                        approved: true,
                        account_id: "2340923u4r42342",
                        deleted: false,
                        subtransactions: []
                    } as TransactionDetail,
                    expected: true,
                    date: new Date('2024-06-16')
                },
                {
                    transaction: {
                        category_name: 'Dining',
                        payee_name: 'Burger King',
                        account_name: 'Credit Card',
                        memo: 'Lunch meeting',
                        amount: -1500,
                        id: "test4",
                        date: "2024-06-18",
                        cleared: TransactionClearedStatus.Cleared,
                        approved: true,
                        account_id: "2340923u4r42342",
                        deleted: false,
                        subtransactions: []
                    } as TransactionDetail,
                    expected: false,
                    date: new Date('2024-06-16')
                }
            ]
        }
    ])("with query %#: $representation", ({ query, cases }) => {
        it.each(cases)("should return $expected for transaction %#: $transaction.id", (
            {
                transaction,
                expected,
                date
            }
        ) => {
            const result = filterTransaction(transaction, query, date);
            expect(result).toBe(expected);
        });
    });
})