import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumeTicket } from '$lib/server/oauth';

export const POST: RequestHandler = async ({ request }) => {
	const { ticket } = await request.json();

	if (!ticket) {
		return json({ status: 'error', message: 'ticket required' }, { status: 400 });
	}

	const data = await consumeTicket(ticket as string);
	if (!data) {
		return json({ status: 'error', message: 'Invalid or expired ticket' }, { status: 401 });
	}

	return json({ status: 'success', ...data });
};
