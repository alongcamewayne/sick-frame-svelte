import mitt from 'mitt';
import type { EventMap, FrameSDK } from '@farcaster/frame-sdk/dist/types.js';

// assumes EventMap will only contain function with a single argument
type FirstArg<T> = T extends (arg: infer P, ...args: unknown[]) => unknown ? P : void;

// transforms eventName to onEventName and extracts the callback argument type
export type FrameEvents = {
	[E in keyof EventMap as `on${Capitalize<E & string>}`]: FirstArg<EventMap[E]>;
};

export type FrameEventHandlers = Partial<{
	[K in keyof FrameEvents]: (data: FrameEvents[K]) => void;
}>;

// idk why ts doesn't like mitt()
const events = (mitt as unknown as typeof mitt.default)<FrameEvents>();

export function registerFrameEventListeners(sdk: FrameSDK) {
	sdk.on('frameAdded', (data: FrameEvents['onFrameAdded']) => {
		events.emit('onFrameAdded', data);
	});

	sdk.on('frameAddRejected', (data: FrameEvents['onFrameAddRejected']) => {
		events.emit('onFrameAddRejected', data);
	});

	sdk.on('frameRemoved', () => {
		events.emit('onFrameRemoved');
	});

	sdk.on('notificationsEnabled', (data: FrameEvents['onNotificationsEnabled']) => {
		events.emit('onNotificationsEnabled', data);
	});

	sdk.on('notificationsDisabled', () => {
		events.emit('onNotificationsDisabled');
	});

	sdk.on('primaryButtonClicked', () => {
		events.emit('onPrimaryButtonClicked');
	});

	return () => events.all.clear();
}

export function watchFrameEvents(handlers: FrameEventHandlers) {
	const eventEntries = Object.entries(handlers) as Array<
		[keyof FrameEvents, (data: unknown) => void]
	>;

	eventEntries.forEach(([event, handler]) => events.on(event, handler));

	return () => {
		eventEntries.forEach(([event, handler]) => events.off(event, handler));
	};
}
