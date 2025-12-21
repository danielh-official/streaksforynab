<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Get hash access token from URL

		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get('access_token');

		if (accessToken) {
			// Store the access token securely (e.g., in localStorage or a Svelte store)
			sessionStorage.setItem('ynab_access_token', accessToken);

			// Redirect to the main application page
			goto('/');
		}
	});
</script>
