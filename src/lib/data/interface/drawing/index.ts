export interface IDrawPlayer {
	id: string;
	name: string;
	connected: boolean;
	joinedAt: number;
}

export type DrawRatio = '4:3' | '16:9' | '1:1' | '3:4';

// width / height for each canvas ratio the host can pick.
export const DRAW_RATIO_VALUE: Record<DrawRatio, number> = {
	'4:3': 4 / 3,
	'16:9': 16 / 9,
	'1:1': 1,
	'3:4': 3 / 4
};

export const DRAW_RATIO_OPTIONS: { value: DrawRatio; label: string; hint: string }[] = [
	{ value: '4:3', label: '4:3', hint: 'กระดาษทั่วไป' },
	{ value: '16:9', label: '16:9', hint: 'แนวกว้าง' },
	{ value: '1:1', label: '1:1', hint: 'สี่เหลี่ยมจัตุรัส' },
	{ value: '3:4', label: '3:4', hint: 'แนวตั้ง' }
];

export interface IDrawRoom {
	code: string;
	hostId: string;
	ratio: DrawRatio;
	createdAt: number;
}

export interface IPoint {
	x: number;
	y: number;
}

export interface IStroke {
	id: string;
	playerId: string;
	color: string;
	width: number;
	// Eraser strokes are replayed in order like any other stroke, but
	// punch through earlier ink instead of adding colour.
	erase?: boolean;
	// Bucket fill: a single point + colour. Every client re-runs the flood
	// fill on its own canvas at that point in the stroke order.
	fill?: boolean;
	points: IPoint[];
}

export type DrawTool = 'pen' | 'eraser' | 'bucket';

// A trace-image layer under the drawing. x/y (top-left) and width are
// fractions (0..1) of the paper's width/height, so it sits in the same place
// on every screen; height follows from `aspect` (natural width / height).
export interface IDrawReference {
	id: string;
	url: string;
	name: string;
	x: number;
	y: number;
	width: number;
	aspect: number;
	// Degrees, clockwise, in (-180, 180], about the image's centre. x/y/width
	// describe the UNrotated box; rotation is applied on top of it.
	rotation: number;
	opacity: number;
	locked: boolean; // static / trace mode — can't be moved, resized, rotated or deleted
	// The uploader. Only they can change `isPublic`. '' = an old image with no owner.
	ownerId: string;
	ownerName: string;
	// false (the default for a new upload): the server only ever sends it to its owner.
	// true: everyone in the room sees it and can adjust it.
	isPublic: boolean;
}

// Who is currently moving/resizing a layer (one person per layer at a time).
export interface IRefController {
	playerId: string;
	name: string;
}

export type RefDeniedReason = 'locked' | 'busy' | 'invalid' | 'limit';

// A room-wide vote to clear the canvas. votes: playerId -> true (yes) /
// null (hasn't answered). The starter is always true.
export interface IClearVote {
	initiatorId: string;
	initiatorName: string;
	expiresAt: number;
	votes: Record<string, boolean | null>;
}

export type ClearResultStatus = 'approved' | 'rejected' | 'expired' | 'cancelled';

// 'busy' / 'cooldown' are replies to a request the server refused.
export interface IClearNotice {
	id: number;
	status: ClearResultStatus | 'busy' | 'cooldown';
	byName?: string;
	seconds?: number;
}

// Publishing to the gallery is a room vote like clearing (server: draw.ts).
export interface IPublishVote {
	initiatorId: string;
	initiatorName: string;
	title: string;
	expiresAt: number;
	votes: Record<string, boolean | null>;
}

export interface IPublishMeta {
	title: string;
	description: string;
	creatorName: string;
}

// A short message about the last publish attempt. 'published' carries the new artwork.
export interface IPublishNotice {
	id: number;
	status: 'approved' | 'rejected' | 'expired' | 'cancelled' | 'busy' | 'cooldown' | 'invalid' | 'published' | 'failed';
	byName?: string;
	seconds?: number;
	artworkId?: string;
	title?: string;
}
