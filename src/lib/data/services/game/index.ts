import type {
	IGame,
	ICreateGameRequest,
	IUpdateGameRequest,
	ISearchGames,
	ISingleResponse,
	IPaginateResponse,
	IListResponse,
	IStatusResponse
} from '$lib/data/interface/game';

export default class GameService {
	static async create(data: ICreateGameRequest): Promise<ISingleResponse<IGame> & IStatusResponse> {
		const res = await fetch('/api/games', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async getOne(id: number): Promise<ISingleResponse<IGame> & IStatusResponse> {
		const res = await fetch(`/api/games/${id}`);
		return res.json();
	}

	static async update(
		id: number,
		data: IUpdateGameRequest
	): Promise<ISingleResponse<IGame> & IStatusResponse> {
		const res = await fetch(`/api/games/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async deleteMany(ids: number[]): Promise<IStatusResponse> {
		const res = await fetch('/api/games', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		return res.json();
	}

	static async paginate(
		search: ISearchGames,
		page = 1,
		limit = 20
	): Promise<IPaginateResponse<IGame> & IStatusResponse> {
		const res = await fetch('/api/games/paginate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...search, page, limit })
		});
		return res.json();
	}

	static async listAll(): Promise<
		IListResponse<Pick<IGame, 'id' | 'name' | 'difficulty'>> & IStatusResponse
	> {
		const res = await fetch('/api/games/list');
		return res.json();
	}

	static async incrementPlayCount(id: number): Promise<IStatusResponse> {
		const res = await fetch(`/api/games/${id}/play`, {
			method: 'POST'
		});
		return res.json();
	}

	static async toggleLike(
		gameId: number,
		userId: number
	): Promise<IStatusResponse & { liked?: boolean; likes?: number }> {
		const res = await fetch(`/api/games/${gameId}/like`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId })
		});
		return res.json();
	}
}
