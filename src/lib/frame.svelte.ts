import { getContext, onDestroy, setContext } from 'svelte';
import type { FrameSDK } from '@farcaster/frame-sdk/dist/types.js';
import type { Context } from '@farcaster/frame-sdk';

const FRAME_SDK_KEY = Symbol('frame-sdk');

export function loadFrameSdk(opts: FrameSdkInstanceConstructor = {}) {
	return setContext(FRAME_SDK_KEY, new FrameSdkInstance(opts));
}

export function getFrame() {
	return getContext<ReturnType<typeof loadFrameSdk>>(FRAME_SDK_KEY);
}

type FrameSdkInstanceConstructor = {
	deferReady?: boolean;
	onLoad?: (sdk: FrameSDK) => Promise<void>;
};

class FrameSdkInstance {
	#isFrame: boolean = $state(false);
	#isFrameAdded: boolean = $state(false);
	#sdk: FrameSDK | undefined;
	#onLoad: (sdk: FrameSDK) => Promise<void>;
	#hasRunOnLoad: boolean = false;
	#deferReady: boolean = false;
	#safeArea: Context.SafeAreaInsets = $state({ top: 0, right: 0, bottom: 0, left: 0 });
	#context: Context.FrameContext = $state({
		user: { fid: 0 },
		client: { clientFid: 0, added: false },
	});

	constructor(opts: FrameSdkInstanceConstructor = {}) {
		this.#deferReady = opts.deferReady ?? false;
		this.#onLoad = opts.onLoad ?? (async () => {});
		this.loadSdk();

		onDestroy(() => {
			if (!this.#sdk) return;
			this.#sdk.removeAllListeners();
		});
	}

	get sdk() {
		return this.#sdk;
	}

	get context() {
		return this.#context;
	}

	get isFrame() {
		return this.#isFrame;
	}

	get isFrameAdded() {
		return this.#isFrameAdded;
	}

	get safeArea() {
		return this.#safeArea;
	}

	get isDesktop() {
		if (typeof window === 'undefined') return;
		return window.self !== window.top;
	}

	private loadSdk = async () => {
		// only load sdk in the browser or if it hasn't been loaded yet
		if (typeof window === 'undefined' || this.#sdk || this.#hasRunOnLoad) return;
		try {
			const importedSdk = (await import('@farcaster/frame-sdk')).default as unknown as FrameSDK;
			const context = await importedSdk.context;

			if (!context) {
				console.warn('Frame SDK has been loaded, but no context is available.');
				return;
			}

			// set sdk and convenience vars
			this.#sdk = importedSdk;
			this.#context = context;
			this.#isFrameAdded = context.client.added ?? false;
			if (context.client.safeAreaInsets) this.#safeArea = context.client.safeAreaInsets;
			this.#isFrame = true;

			// register event listeners
			this.#sdk.on('frameAdded', async () => {
				this.#isFrameAdded = true;
				// wait for notification details to be available
				await new Promise((resolve) => setTimeout(resolve, 800));
				this.#context = await this.#sdk!.context;
			});
			this.#sdk.on('frameRemoved', async () => {
				this.#isFrameAdded = false;
				this.#context = await this.#sdk!.context;
			});

			// Run onLoad callback
			await this.#onLoad(this.#sdk);
			this.#hasRunOnLoad = true;

			// Call ready unless deferReady is true
			if (!this.#deferReady) this.#sdk.actions.ready();
		} catch (error) {
			console.error('Failed to load Frame SDK:', error);
		}
	};
}
