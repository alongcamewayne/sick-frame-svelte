import type { RequestHandler } from './$types.js';
import { createVerifyAppKeyWithHub, parseWebhookEvent } from '@farcaster/frame-node';
import { HUB_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.json();

	const verifier = createVerifyAppKeyWithHub(HUB_URL);
	const result = await parseWebhookEvent(payload, verifier);
	console.log(result);

	return new Response('OK', { status: 200 });
};
