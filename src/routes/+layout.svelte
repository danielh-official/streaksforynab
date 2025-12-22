<script lang="ts">
	import WorksWithYnab from '$lib/components/WorksWithYnab.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<div class="dark:text-white">
	<div class="flex flex-col items-end p-5">
		<WorksWithYnab />
	</div>

	{@render children()}
</div>

<footer class="text-center text-sm text-gray-500">
	<p class="mt-8 md:px-40 px-5 pt-5 border-t border-gray-300">
		&copy; {new Date().getFullYear()} Streaks (For YNAB). Built with
		<a
			href="https://svelte.dev"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blue-500 hover:underline">SvelteKit</a
		>.
		<br />
		<a
			class="text-blue-500 hover:underline"
			target="_blank"
			rel="noopener noreferrer"
			href="https://www.flaticon.com/free-icons/coin"
			title="coin icons">Coin icons created by Ardiansyah - Flaticon</a
		>
	</p>
	<p class="mt-4 md:px-40 px-5">
		<a
			target="_blank"
			href="https://github.com/danielh-official/streaksforynab/blob/main/PRIVACY.md"
			class="text-blue-500 hover:underline">Privacy Policy</a
		>
	</p>
	<p class="mt-4 md:px-40 px-5 pb-5 w-1/2 mx-auto">
		<b>Statement of Affiliation</b>: We are not affiliated, associated, or in any way officially
		connected with YNAB or any of its subsidiaries or affiliates. The official YNAB website can be
		found at https://www.ynab.com. The names YNAB and You Need A Budget, as well as related names,
		tradenames, marks, trademarks, emblems, and images are registered trademarks of YNAB.
	</p>
</footer>

<a
	target="_blank"
	rel="noopener noreferrer"
	class="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition gap-x-2 hidden md:flex"
	href="https://github.com/danielh-official/streaksforynab"
	><svg viewBox="0 0 24 24" aria-hidden="true" class="size-6 fill-slate-100"
		><path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.607 9.607 0 0 1 12 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2Z"
		></path></svg
	>View on GitHub</a
>
