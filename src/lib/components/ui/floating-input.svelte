<script lang="ts">
	let {
		id,
		label,
		type = 'text',
		value = $bindable(''),
		required = false,
		autocomplete,
		invalid = false,
		errorMessage = '',
		oninput
	}: {
		id: string;
		label: string;
		type?: string;
		value?: string;
		required?: boolean;
		autocomplete?: AutoFill;
		invalid?: boolean;
		errorMessage?: string;
		oninput?: (e: Event) => void;
	} = $props();

	let isFocused = $state(false);

	const labelClasses = $derived(
		isFocused || value
			? 'top-[0.3rem] text-[0.7rem] text-primary-600'
			: 'top-[0.85rem] text-sm text-gray-400'
	);
</script>

<div class="relative">
	<input
		{id}
		{type}
		bind:value
		{required}
		{autocomplete}
		{oninput}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		class="w-full rounded-lg border {invalid
			? 'border-error'
			: 'border-gray-200'} bg-white/70 px-4 pt-[1.15rem] pb-[0.4rem] text-sm text-gray-900 backdrop-blur-sm transition-colors outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
	/>
	<label
		for={id}
		class="pointer-events-none absolute left-4 transition-all duration-150 {labelClasses}"
	>
		{label}
	</label>
	{#if invalid && errorMessage}
		<span class="mt-1 block text-xs text-error">{errorMessage}</span>
	{/if}
</div>
