<script lang="ts">
	let {
		id,
		label,
		value = $bindable(''),
		required = false,
		autocomplete,
		invalid = false
	}: {
		id: string;
		label: string;
		value?: string;
		required?: boolean;
		autocomplete?: AutoFill;
		invalid?: boolean;
	} = $props();

	let isFocused = $state(false);
	let show = $state(false);

	const labelClasses = $derived(
		isFocused || value
			? 'top-[0.3rem] text-[0.7rem] text-primary-600'
			: 'top-[0.85rem] text-sm text-gray-400'
	);
</script>

<div class="relative">
	<input
		{id}
		type={show ? 'text' : 'password'}
		bind:value
		{required}
		{autocomplete}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		class="w-full rounded-lg border {invalid
			? 'border-error'
			: 'border-gray-200'} bg-white/70 px-4 pt-[1.15rem] pr-10 pb-[0.4rem] text-sm text-gray-900 backdrop-blur-sm transition-colors outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
	/>
	<label
		for={id}
		class="pointer-events-none absolute left-4 transition-all duration-150 {labelClasses}"
	>
		{label}
	</label>
	<button
		type="button"
		class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
		onclick={() => (show = !show)}
		aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
	>
		{#if show}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
				/>
				<line x1="1" y1="1" x2="23" y2="23" />
			</svg>
		{:else}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		{/if}
	</button>
</div>
