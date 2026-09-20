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
