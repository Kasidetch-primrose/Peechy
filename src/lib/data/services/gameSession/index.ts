import type {
	IGameSession,
	ICreateSessionRequest,
	IUpdateSessionRequest,
	ISearchGameSessions,
	ISingleResponse,
	IPaginateResponse,
	IStatusResponse
} from '$lib/data/interface/game';

export default class GameSessionService {
	static async create(
		data: ICreateSessionRequest,
		accessToken: string
	): Promise<ISingleResponse<IGameSession> & IStatusResponse> {
		const res = await fetch('/api/game-sessions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			},
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async getOne(id: number): Promise<ISingleResponse<IGameSession> & IStatusResponse> {
		const res = await fetch(`/api/game-sessions/${id}`);
		return res.json();
	}

	static async update(
		id: number,
		data: IUpdateSessionRequest,
		accessToken: string
	): Promise<ISingleResponse<IGameSession> & IStatusResponse> {
		const res = await fetch(`/api/game-sessions/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			},
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async deleteMany(ids: number[]): Promise<IStatusResponse> {
		const res = await fetch('/api/game-sessions', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		return res.json();
	}

	static async paginate(
		search: ISearchGameSessions,
		page = 1,
		limit = 20
	): Promise<IPaginateResponse<IGameSession> & IStatusResponse> {
		const res = await fetch('/api/game-sessions/paginate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...search, page, limit })
		});
		return res.json();
	}
}
