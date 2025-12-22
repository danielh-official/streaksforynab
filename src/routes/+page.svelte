<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db } from '$lib/db';
	import { liveQuery } from 'dexie';
	import type { BudgetDetail, BudgetSummaryResponse, ErrorResponse } from 'ynab';
	import { PUBLIC_BASE_PATH } from '$env/static/public';
	import { page } from '$app/state';

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

	let currentUrl = $derived.by(() => {
		if (browser) {
			return page.url.origin + PUBLIC_BASE_PATH;
		}
		return '';
	});

	let authUrl = $derived.by(() => {
		const clientId = 'BcdLFTpW1QxdDNy0RwfCiuTxEKSYMB0i3cQRB8SpkeY';

		const redirectUri = `${currentUrl}/callback`;

		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`;
	});

	let authToken = $derived.by(() => {
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
			const response = await fetch('https://api.ynab.com/v1/budgets', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			const responseData: BudgetSummaryResponse = await response.json();

			const defaultBudget = responseData.data.default_budget?.id;

			responseData.data.budgets.forEach(async (budget: BudgetDetail) => {
				await db.budgets.put({ ...budget, is_default: budget.id === defaultBudget }, 'id');
			});

			localStorage.setItem('last_budget_fetch', new Date().toISOString());

			alert('Budgets fetched and stored locally!');
		} catch (error) {
			console.error('Error fetching budgets from YNAB:', error);

			if ((error as ErrorResponse).error.id === '401') {
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
</svelte:head>

<div class="flex justify-center items-center md:h-screen">
	{#if loading}
		<div
			class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"
		></div>
	{:else if authToken}
		<div class="text-center flex flex-col gap-y-8">
			<h1 class="text-2xl font-bold mb-4">You are logged in!</h1>

			{#if !isOnline}
				<p class="text-red-500">You are currently offline. Some features may be unavailable.</p>
			{/if}

			<button
				onclick={fetchYnabBudgets}
				class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!isOnline}
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
								<a href={`${currentUrl}/budgets/${budget.id}`} class="text-blue-500 hover:underline"
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
			{#if !isOnline}
				<p class="text-red-500">You are currently offline. Some features may be unavailable.</p>
			{/if}

			<h1 class="text-2xl font-bold mb-4">Welcome to Streaks (For YNAB)</h1>
			<p class="mb-4">Please log in with your YNAB account to continue.</p>
			<a
				href={isOnline ? authUrl : '#'}
				class={{
					'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 cursor-pointer': isOnline,
					'bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed': !isOnline
				}}>Log in with YNAB</a
			>
		</div>
	{/if}
</div>
