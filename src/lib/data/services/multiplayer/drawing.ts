import MultiplayerService from './index';
import type { DrawRatio, IDrawPlayer, IDrawRoom, IPoint, IStroke } from '$lib/data/interface/drawing';

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
