import MultiplayerService from './index';
import type {
	DrawRatio,
	IDrawPlayer,
	IDrawReference,
	IDrawRoom,
	IPoint,
	IRefController,
	IStroke
} from '$lib/data/interface/drawing';

interface CreateAck {
	ok: boolean;
	message?: string;
	code?: string;
}

interface JoinAck {
	ok: boolean;
	message?: string;
	room?: IDrawRoom;
	players?: IDrawPlayer[];
	strokes?: IStroke[];
	reference?: IDrawReference | null;
	referenceController?: IRefController | null;
}

export default class DrawingService {
	static createRoom(ratio: DrawRatio): Promise<CreateAck> {
		return new Promise((resolve) => {
			MultiplayerService.getSocket().emit('draw:room:create', { ratio }, resolve);
		});
	}

	static joinRoom(code: string): Promise<JoinAck> {
		return new Promise((resolve) => {
			MultiplayerService.getSocket().emit('draw:room:join', { code }, resolve);
		});
	}

	static leaveRoom(code: string): void {
		MultiplayerService.getSocket().emit('draw:room:leave', { code });
	}

	static strokeStart(code: string, stroke: IStroke): void {
		MultiplayerService.getSocket().emit('draw:stroke:start', { code, stroke });
	}

	static strokePoints(code: string, strokeId: string, points: IPoint[]): void {
		MultiplayerService.getSocket().emit('draw:stroke:points', { code, strokeId, points });
	}

	static strokeEnd(code: string, strokeId: string): void {
		MultiplayerService.getSocket().emit('draw:stroke:end', { code, strokeId });
	}

	static undo(code: string): void {
		MultiplayerService.getSocket().emit('draw:undo', { code });
	}

	static refAdd(code: string, url: string, aspect: number): void {
		MultiplayerService.getSocket().emit('draw:ref:add', { code, url, aspect });
	}

	static refPatch(
		code: string,
		patch: { opacity?: number; locked?: boolean; visible?: boolean }
	): void {
		MultiplayerService.getSocket().emit('draw:ref:patch', { code, patch });
	}

	static refGrab(code: string): void {
		MultiplayerService.getSocket().emit('draw:ref:grab', { code });
	}

	static refMove(code: string, x: number, y: number, width: number): void {
		MultiplayerService.getSocket().emit('draw:ref:move', { code, x, y, width });
	}

	static refRelease(code: string): void {
		MultiplayerService.getSocket().emit('draw:ref:release', { code });
	}

	static refDelete(code: string): void {
		MultiplayerService.getSocket().emit('draw:ref:delete', { code });
	}

	static requestClear(code: string): void {
		MultiplayerService.getSocket().emit('draw:clear:request', { code });
	}

	static respondClear(code: string, approve: boolean): void {
		MultiplayerService.getSocket().emit('draw:clear:respond', { code, approve });
	}

	static cancelClear(code: string): void {
		MultiplayerService.getSocket().emit('draw:clear:cancel', { code });
	}
}
