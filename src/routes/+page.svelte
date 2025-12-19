<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { derived } from 'svelte/store';

	let loading = $state(false);

	// MARK: - onMount

	onMount(async () => {
		loading = true;

		if (browser) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		loading = false;
	});

	let currentUrl = derived([], () => {
		if (browser) {
			return window.location.href;
		}
		return '';
	});

	let authUrl = derived(currentUrl, ($currentUrl) => {
		const clientId = 'BcdLFTpW1QxdDNy0RwfCiuTxEKSYMB0i3cQRB8SpkeY';

		const redirectUri = (`${$currentUrl}callback`);

		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`;
	});

	let authToken = derived([], () => {
		if (browser) {
			return sessionStorage.getItem('ynab_access_token') || null;
		}
		return null;
	});
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
	{:else}
		{#if $authToken}
			<div class="text-center">
				<h1 class="text-2xl font-bold mb-4">You are logged in!</h1>

				
			</div>
		{:else}
			<div class="text-center">
				<h1 class="text-2xl font-bold mb-4">Welcome to Streaks (For YNAB)</h1>
				<p class="mb-4">Please log in with your YNAB account to continue.</p>
				<a
					href="{$authUrl}"
					class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
					>Log in with YNAB</a
				>
			</div>
		{/if}
	{/if}
</div>