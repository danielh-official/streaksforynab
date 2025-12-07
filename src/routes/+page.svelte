<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let loading = $state(false);

	// MARK: - onMount

	onMount(async () => {
		loading = true;

		if (browser) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		loading = false;
	});
</script>

<svelte:head>
	<title>Streaks (For YNAB)</title>
	<meta name="description" content="A web app to track your spending habits with YNAB." />
</svelte:head>

{#if loading}
	<div class="flex justify-center items-center h-screen">
		<div
			class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"
		></div>
	</div>
{:else}
	<div></div>
{/if}
