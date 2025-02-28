<script lang="ts">
	import '../app.css';
	import { loadFrameSdk } from '$lib/index.js';

	let { children } = $props();

	loadFrameSdk();
</script>

{@render children()}
