const GUEST_ID_KEY = 'peechy_guest_id';
const GUEST_NAME_KEY = 'peechy_guest_name';

export interface PlayerIdentity {
	id: string;
	name: string;
}

/**
 * Guest ids must start with "guest_" — the realtime server (isGuestId in
 * realtime-server/src/game.ts) uses this prefix to exclude guests from the
 * multiplayer_results DB write at game end. The id is kept stable per
 * browser so a guest can reconnect to the same room after a refresh.
 */
export function getGuestId(): string {
	if (typeof localStorage === 'undefined') return '';
	let id = localStorage.getItem(GUEST_ID_KEY);
	if (!id) {
		id = `guest_${crypto.randomUUID().slice(0, 8)}`;
		localStorage.setItem(GUEST_ID_KEY, id);
	}
	return id;
}

/** Last nickname a guest typed — used only to prefill the prompt, never to skip it. */
export function getSavedGuestName(): string {
	if (typeof localStorage === 'undefined') return '';
	return localStorage.getItem(GUEST_NAME_KEY) ?? '';
}

export function saveGuestName(name: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(GUEST_NAME_KEY, name.trim());
}
