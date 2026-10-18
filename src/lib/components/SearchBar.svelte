<script lang="ts">
	// Shared search box: runs on button click or Enter (form submit), never while typing.
	let {
		value = $bindable(''),
		placeholder = 'ค้นหา...',
		label = placeholder,
		disabled = false,
		onsearch
	}: {
		value?: string;
		placeholder?: string;
		label?: string;
		disabled?: boolean;
		onsearch: () => void;
	} = $props();

	function submit(e: SubmitEvent) {
		e.preventDefault();
		onsearch();
	}
</script>

<form onsubmit={submit} role="search" class="mt-lg flex justify-end">
	<div
		class="flex w-full items-center overflow-hidden rounded-full border border-primary-300 bg-white shadow-sm transition-colors focus-within:border-primary-500 sm:w-96"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="ml-3 shrink-0 text-gray-400"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
		</svg>
		<!-- outline-none! (important): the global :focus-visible rule in layout.css is unlayered
		     and would otherwise beat the utility and draw an orange box around the input. -->
		<input
			type="search"
			bind:value
			{placeholder}
			aria-label={label}
			class="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none! placeholder:text-gray-400"
		/>
		<button
			type="submit"
			{disabled}
			class="bg-primary-500 px-4 py-2 text-sm font-medium text-white outline-offset-[-3px]! transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-btn-primary-disabled"
		>
			ค้นหา
		</button>
	</div>
</form>
