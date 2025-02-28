import { getContext, onDestroy, setContext } from 'svelte';
import type { FrameSDK } from '@farcaster/frame-sdk/dist/types.js';
import type { Context } from '@farcaster/frame-sdk';
import {
	registerFrameEventListeners,
	watchFrameEvents,
	type FrameEventHandlers,
} from './events.js';

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
	#unregisterFrameEvents: (() => void) | undefined;

	constructor(opts: FrameSdkInstanceConstructor = {}) {
		this.#deferReady = opts.deferReady ?? false;
		this.#onLoad = opts.onLoad ?? (async () => {});
		this.loadSdk();

		onDestroy(() => {
			if (this.#sdk) this.#sdk.removeAllListeners();
			if (this.#unregisterFrameEvents) this.#unregisterFrameEvents();
		});
	}

	get sdk() {
		return this.#sdk;
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

	public watchFrameEvents = async (handlers: FrameEventHandlers) => {
		// only watch events in the browser
		if (typeof window === 'undefined') return;

		// wait for sdk to load
		if (!this.#sdk) await new Promise((resolve) => setTimeout(resolve, 1000));

		// check sdk again
		if (!this.#sdk) {
			console.warn('Frame SDK not loaded yet.');
			return;
		}

		return watchFrameEvents(handlers);
	};

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
			this.#isFrameAdded = context.client.added ?? false;
			if (context.client.safeAreaInsets) this.#safeArea = context.client.safeAreaInsets;
			this.#isFrame = true;

			// register event listeners
			this.#unregisterFrameEvents = registerFrameEventListeners(this.#sdk);
			this.watchFrameEvents({
				onFrameAdded: async () => (this.#isFrameAdded = true),
				onFrameRemoved: async () => (this.#isFrameAdded = false),
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
