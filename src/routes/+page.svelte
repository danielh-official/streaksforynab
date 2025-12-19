<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { derived } from 'svelte/store';
	import * as ynab from 'ynab';
	import { db } from '$lib/db';
	import { liveQuery } from 'dexie';

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

	async function fetchYnabBudgets() {
		if (!browser) return;

		const token = sessionStorage.getItem('ynab_access_token');
		if (!token) {
			alert('No YNAB access token found. Please log in again.');
			return;
		}

		try {
			const responseData = await new ynab.API(token).budgets.getBudgets();

			responseData.data.budgets.forEach(async (budget) => {
				await db.budgets.put(budget, 'id');
			});

			localStorage.setItem('last_budget_fetch', new Date().toISOString());
			localStorage.setItem('default_budget_id', responseData.data.default_budget?.id || '');

			alert('Budgets fetched and stored locally!');
		} catch (error) {
			console.error('Error fetching budgets from YNAB:', error);

			if ((error as ynab.ErrorResponse).error.id === '401') {
				alert('Your YNAB access token is invalid or has expired. Please log in again.');
				sessionStorage.removeItem('ynab_access_token');
				window.location.reload();
			} else {
				alert('Failed to fetch budgets from YNAB. Please try again.');
			}
		}
	}

	const budgets = liveQuery(() => db.budgets.toArray());
</script>

<svelte:head>
	<title>Streaks (For YNAB)</title>
	<meta name="description" content="A web app to track your spending habits with YNAB." />
</svelte:head>

<div class="flex justify-center items-center h-screen">
	{#if loading}
		<div
			class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"
		></div>
	{:else if $authToken}
		<div class="text-center flex flex-col gap-y-8">
			<h1 class="text-2xl font-bold mb-4">You are logged in!</h1>

			<button
				onclick={fetchYnabBudgets}
				class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
			>
				Fetch YNAB Budgets
			</button>

			<table>
				<thead>
					<tr>
						<th class="border px-4 py-2">Budget Name</th>
						<th class="border px-4 py-2">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each $budgets as budget}
						<tr>
							<td class="border px-4 py-2">{budget.name}</td>
							<td class="border px-4 py-2">
								<a href={`/budgets/${budget.id}`} class="text-blue-500 hover:underline"
									>View Details
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="text-center flex flex-col gap-y-6">
			<h1 class="text-2xl font-bold mb-4">Welcome to Streaks (For YNAB)</h1>
			<p class="mb-4">Please log in with your YNAB account to continue.</p>
			<a href={$authUrl} class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
				>Log in with YNAB</a
			>
		</div>
	{/if}
</div>
