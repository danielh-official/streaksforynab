<script lang="ts">
	import type { HabitQuery } from '$lib/db';

	let { value = $bindable() }: { value: HabitQuery | null } = $props();

	function beginQuery() {
		value = {
			operator: 'and',
			subgroups: [
				{
					operator: 'and',
					conditions: [
						{
							field: 'category_name',
							operator: 'contains',
							value: ''
						}
					]
				}
			]
		};
	}

	function resetQuery() {
		value = null;
	}

	function subgroups(index: number) {
		value?.subgroups.splice(index, 1);

		if (value && value.subgroups.length === 0) {
			value = null;
		}
	}

	let queryInPlainText: string = $derived.by(() => {
		if (value === null) {
			return '';
		}

		function conditionToString(condition: any): string {
			return `${condition.field} ${condition.operator} '${condition.value}'`;
		}

		function subgroupToString(subgroup: any): string {
			const conditionsStr = subgroup.conditions
				.map(conditionToString)
				.join(` ${subgroup.operator.toUpperCase()} `);
			return `(${conditionsStr})`;
		}

		const subgroupsStr = value.subgroups
			.map(subgroupToString)
			.join(` ${value.operator.toUpperCase()} `);
		return subgroupsStr;
	});
</script>

{#if value === null}
	<button
		class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 md:w-1/4 self-center cursor-pointer"
		onclick={beginQuery}
	>
		Begin Query
	</button>
{:else}
	<div class="flex justify-center md:flex-row flex-col gap-x-4 gap-y-4 mb-4">
		<button
			class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
			onclick={resetQuery}
		>
			Reset Query
		</button>
		<button
			type="button"
			class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer md:w-1/4"
			onclick={() =>
				value?.subgroups.push({
					operator: 'and',
					conditions: [
						{
							field: 'category_name',
							operator: 'contains',
							value: ''
						}
					]
				})}
		>
			Add Group
		</button>
	</div>

	<div class="flex flex-col gap-y-5 mt-5">
		{#if value.subgroups.length > 1}
			<div>
				<select
					id="main-operator"
					class="border rounded p-2 w-1/2 bg-gray-50 dark:bg-gray-700"
					bind:value={value.operator}
				>
					<option value="and">AND</option>
					<option value="or">OR</option>
				</select>
			</div>
		{/if}

		<div>
			{#each value.subgroups as subgroup, index}
				<div class="border p-2 my-2">
					<div
						class="flex flex-col gap-y-5 p-5 bg-gray-100 dark:bg-gray-700 rounded place-items-center"
					>
						{#if value.subgroups.length > 1}
							<button
								type="button"
								class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mt-2 cursor-pointer md:w-1/4 self-end"
								onclick={() => subgroups(index)}
							>
								Delete Group
							</button>
						{/if}

						{#if subgroup.conditions.length > 1}
							<select
								id="subgroup-operator"
								class="border rounded p-2 w-1/2 bg-gray-50 dark:bg-gray-700"
								bind:value={subgroup.operator}
							>
								<option value="and">AND</option>
								<option value="or">OR</option>
							</select>
						{/if}

						{#each subgroup.conditions as condition, subIndex}
							<div
								class="md:border p-2 py-10 md:py-2 my-2 md:flex md:flex-row flex flex-col gap-y-6 gap-x-2 items-center"
							>
								<div>
									<select
										class="bg-gray-50 dark:bg-gray-700"
										id="field"
										bind:value={condition.field}
									>
										<option value="category_name">Category</option>
										<option value="payee_name">Payee</option>
										<option value="account_name">Account</option>
										<option value="memo">Memo</option>
									</select>
								</div>

								<div>
									<select
										class="bg-gray-50 dark:bg-gray-700"
										id="operator"
										bind:value={condition.operator}
									>
										<option value="contains">contains</option>
										<option value="does_not_contain">does not contain</option>
										<option value="is">is</option>
										<option value="is_not">is not</option>
									</select>
								</div>

								<div>
									<input
										class="bg-gray-50 dark:bg-gray-700"
										id="value"
										type="text"
										bind:value={condition.value}
									/>
								</div>

								<button
									class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 cursor-pointer"
									onclick={() => subgroup.conditions.splice(subIndex, 1)}
								>
									Delete
								</button>
							</div>

							{#if subgroup.conditions.length > 1 && subIndex < subgroup.conditions.length - 1}
								<div class="text-center text-gray-500 dark:text-gray-400">
									{subgroup.operator.toUpperCase()}
								</div>
							{/if}
						{/each}

						<button
							type="button"
							class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mt-2 cursor-pointer md:w-1/4 self-end"
							onclick={() =>
								subgroup.conditions.push({
									field: 'category_name',
									operator: 'contains',
									value: ''
								})}
						>
							Add Condition
						</button>
					</div>
				</div>

				{#if index < value.subgroups.length - 1}
					<div class="text-center text-gray-500 dark:text-gray-400 border-2 p-2 m-4">
						{value.operator.toUpperCase()}
					</div>
				{/if}
			{/each}

			<!-- <div class="flex justify-end mt-6">
				<button
					type="button"
					class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer md:w-1/4"
					onclick={() =>
						value?.subgroups.push({
							operator: 'and',
							conditions: [
								{
									field: 'category_name',
									operator: 'contains',
									value: ''
								}
							]
						})}
				>
					Add Group
				</button>
			</div> -->
		</div>
	</div>

	<div class="my-4 p-4 border rounded bg-gray-50 dark:bg-gray-800">
		<h3 class="font-bold mb-2">Query Preview:</h3>
		<p class="italic text-gray-600 dark:text-gray-400">{queryInPlainText}</p>
	</div>
{/if}
