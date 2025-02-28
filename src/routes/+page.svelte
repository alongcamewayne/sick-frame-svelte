<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { PUBLIC_BASE_URL } from '$env/static/public';
	import { getFrame } from '$lib/index.js';

	const frame = getFrame();
	let unwatch: () => void;

	onMount(async () => {
		unwatch = await frame.watchFrameEvents({
			onFrameAdded: async ({ data }) => {
				console.log('frame added:', data);
			},
			onFrameAddRejected: ({ data }) => {
				console.log('permission denied:', data.reason);
			},
			onFrameRemoved: () => {
				console.log('frame removed');
			},
		});
	});

	onDestroy(() => {
		unwatch?.();
	});
</script>

<svelte:head>
	<meta
		name="fc:frame"
		content={JSON.stringify({
			version: 'next',
			imageUrl: `https://fakeimg.pl/600x400/000000/ffffff?text=sick+frame&font=bebas`,
			button: {
				title: 'Launch',
				action: {
					type: 'launch_frame',
					name: 'Launch',
					url: PUBLIC_BASE_URL,
					splashImageUrl: `https://fakeimg.pl/200x200/000000/ffffff?text=*&font=bebas`,
					splashBackgroundColor: '#000',
				},
			},
		})} />
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-white">
	<p>{frame.isDesktop}</p>
	{#if frame.isFrame}
		{#if frame.isFrameAdded}
			<p>frame added</p>
		{:else}
			<button onclick={() => frame.sdk?.actions.addFrame()}>add frame</button>
		{/if}
	{:else}
		<p>not in frame</p>
	{/if}
</div>
