import type { RequestHandler } from './$types.js';
import { APP_CUSTODY_PRIVATE_KEY, APP_FID } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { encodeURI } from 'js-base64';

const account = privateKeyToAccount(APP_CUSTODY_PRIVATE_KEY as Hex);

export const GET: RequestHandler = async ({ request }) => {
	const domain = request.headers.get('host');

	const header = {
		fid: Number(APP_FID),
		type: 'custody',
		key: account.address,
	};

	const payload = { domain };

	const encodedHeader = encodeURI(JSON.stringify(header));
	const encodedPayload = encodeURI(JSON.stringify(payload));
	const signature = await account.signMessage({
		message: `${encodedHeader}.${encodedPayload}`,
	});

	const encodedSignature = encodeURI(signature);
	const accountAssociation = {
		header: encodedHeader,
		payload: encodedPayload,
		signature: encodedSignature,
	};

	const baseUrl = domain ? `https://${domain}` : 'http://localhost:5173';

	const manifest = {
		accountAssociation,
		frame: {
			version: '1',
			name: 'Sick Frame Dev Frame',
			homeUrl: baseUrl,
			iconUrl: 'https://fakeimg.pl/200x200/000000/ffffff?text=!&font=bebas',
			imageUrl: 'https://fakeimg.pl/600x400/000000/ffffff?text=sick+frame&font=bebas',
			buttonTitle: `Launch`,
			webhookUrl: `${baseUrl}/api/webhook`,
		},
	};

	console.log(manifest);

	return json(manifest);
};
