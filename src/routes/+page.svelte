<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db } from '$lib/db';
	import { liveQuery } from 'dexie';
	import type { BudgetSummaryResponse, ErrorResponse } from 'ynab';
	import { PUBLIC_BASE_PATH, PUBLIC_YNAB_CLIENT_ID } from '$env/static/public';
	import { page } from '$app/state';

	let isOnline = $state(navigator.onLine);
	let loading = $state(true);
	let isFetching = $state(false);

	// Debounce: prevent multiple fetches within 5 seconds
	const FETCH_DEBOUNCE_MS = 5000;

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
		// The default client ID only works with production url.
		// Set the PUBLIC_YNAB_CLIENT_ID to a client that works with your dev URL.
		const clientId =
			PUBLIC_YNAB_CLIENT_ID.trim().length > 0
				? PUBLIC_YNAB_CLIENT_ID
				: 'aQfzesQUozhelo-S2RAddaG83YTcUm0CxbzJhVVZdEo';

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

		// Check offline status
		if (!isOnline) {
			alert('You are offline. Cannot fetch budgets.');
			return;
		}

		// Prevent duplicate requests with debounce
		const lastFetch = localStorage.getItem('last_budget_fetch');
		if (lastFetch) {
			const lastFetchTime = new Date(lastFetch).getTime();
			const now = Date.now();
			const timeSinceLastFetch = now - lastFetchTime;

			if (timeSinceLastFetch < FETCH_DEBOUNCE_MS) {
				alert(
					`Please wait ${Math.ceil((FETCH_DEBOUNCE_MS - timeSinceLastFetch) / 1000)}s before fetching again.`
				);
				return;
			}
		}

		const token = sessionStorage.getItem('ynab_access_token');
		if (!token) {
			alert('No YNAB access token found. Please log in again.');
			return;
		}

		isFetching = true;

		try {
			const res = await fetch('https://api.ynab.com/v1/budgets', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!res.ok) {
				throw res;
			}

			const responseData: BudgetSummaryResponse = await res.json();
			const defaultBudget = responseData.data.default_budget?.id;

			for (const budget of responseData.data.budgets) {
				await db.budgets.put({ ...budget, is_default: budget.id === defaultBudget }, 'id');
			}

			localStorage.setItem('last_budget_fetch', new Date().toISOString());
			alert('Budgets fetched and stored locally!');
		} catch (error) {
			// Handle different error scenarios
			if (error instanceof Response) {
				if (error.status === 401) {
					alert('Your YNAB access token is invalid or has expired. Please log in again.');
					sessionStorage.removeItem('ynab_access_token');
					window.location.reload();
					return;
				}

				try {
					const errorData: ErrorResponse = await error.json();
					console.error('Error fetching budgets from YNAB:', errorData);
				} catch {
					console.error('Error fetching budgets from YNAB. Unable to parse error response.');
				}
			} else if (error instanceof TypeError) {
				// Network error (offline, CORS, etc.)
				console.error('Network error fetching budgets:', error);
				alert('Network error. Please check your connection and try again.');
			} else {
				console.error('Unexpected error:', error);
			}

			alert('Failed to fetch budgets from YNAB. Please try again.');
		} finally {
			isFetching = false;
		}
	}

	// YAGNI approach for now: just load first 10 budgets. If I seriously have users who want to work with all 1 bajillion of their budgets, then I'll implement more robust pagination and search features.

	const budgets = liveQuery(() => db.budgets.orderBy('id').limit(10).toArray());
</script>

<svelte:head>
	<title>Streaks (For YNAB)</title>
</svelte:head>

<div class="flex justify-center items-center">
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
						<th class="border px-4 py-2">Default</th>
						<th class="border px-4 py-2">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each $budgets as budget}
						<tr>
							<td class="border px-4 py-2">{budget.name}</td>
							<td class="border px-4 py-2">{budget.is_default ? 'Yes' : 'No'}</td>
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
