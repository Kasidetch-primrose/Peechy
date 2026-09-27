import MultiplayerService from './index';
import type {
	DrawRatio,
	IDrawPlayer,
	IDrawReference,
	IDrawRoom,
	IPoint,
	IPublishMeta,
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
	references?: IDrawReference[];
	referenceControllers?: Record<string, IRefController>;
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

	static refAdd(code: string, url: string, aspect: number, name: string): void {
		MultiplayerService.getSocket().emit('draw:ref:add', { code, url, aspect, name });
	}

	static refPatch(
		code: string,
		id: string,
		patch: { opacity?: number; locked?: boolean; rotation?: number }
	): void {
		MultiplayerService.getSocket().emit('draw:ref:patch', { code, id, patch });
	}

	// Owner-only: make several of your images public/private at once.
	static refSetVisibility(code: string, ids: string[], isPublic: boolean): void {
		MultiplayerService.getSocket().emit('draw:ref:visibility', { code, ids, isPublic });
	}

	static refReorder(code: string, id: string, direction: 'up' | 'down'): void {
		MultiplayerService.getSocket().emit('draw:ref:reorder', { code, id, direction });
	}

	static refGrab(code: string, id: string): void {
		MultiplayerService.getSocket().emit('draw:ref:grab', { code, id });
	}

	static refMove(code: string, id: string, x: number, y: number, width: number, rotation: number): void {
		MultiplayerService.getSocket().emit('draw:ref:move', { code, id, x, y, width, rotation });
	}

	static refRelease(code: string, id: string): void {
		MultiplayerService.getSocket().emit('draw:ref:release', { code, id });
	}

	static refDelete(code: string, id: string): void {
		MultiplayerService.getSocket().emit('draw:ref:delete', { code, id });
	}

	static requestClear(code: string): void {
		MultiplayerService.getSocket().emit('draw:clear:request', { code });
	}

	static respondClear(code: string, approve: boolean): void {
		MultiplayerService.getSocket().emit('draw:clear:respond', { code, approve });
	}

	static requestPublish(code: string, meta: IPublishMeta): void {
		MultiplayerService.getSocket().emit('draw:publish:request', { code, meta });
	}

	static respondPublish(code: string, approve: boolean): void {
		MultiplayerService.getSocket().emit('draw:publish:respond', { code, approve });
	}

	static cancelPublish(code: string): void {
		MultiplayerService.getSocket().emit('draw:publish:cancel', { code });
	}

	static publishDone(code: string, artworkId: string, title: string): void {
		MultiplayerService.getSocket().emit('draw:publish:done', { code, artworkId, title });
	}

	static cancelClear(code: string): void {
		MultiplayerService.getSocket().emit('draw:clear:cancel', { code });
	}
}
