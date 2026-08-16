import type {
	IGameImage,
	ICreateImageRequest,
	IUpdateImageRequest,
	ISearchImages,
	ISingleResponse,
	IPaginateResponse,
	IStatusResponse
} from '$lib/data/interface/game';

export default class ImageService {
	static async create(
		data: ICreateImageRequest,
		accessToken?: string,
		creatorToken?: string
	): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
		const res = await fetch('/api/images', {
			method: 'POST',
			headers,
			body: JSON.stringify({ ...data, creatorToken })
		});
		return res.json();
	}

	static async getOne(id: number): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const res = await fetch(`/api/images/${id}`);
		return res.json();
	}

	static async update(
		id: number,
		data: IUpdateImageRequest,
		accessToken?: string,
		creatorToken?: string
	): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
		const res = await fetch(`/api/images/${id}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify({ ...data, creatorToken })
		});
		return res.json();
	}

	static async deleteMany(
		ids: number[],
		accessToken?: string,
		creatorToken?: string
	): Promise<IStatusResponse> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
		const res = await fetch('/api/images', {
			method: 'DELETE',
			headers,
			body: JSON.stringify({ ids, creatorToken })
		});
		return res.json();
	}

	static async paginate(
		search: ISearchImages,
		page = 1,
		limit = 20
	): Promise<IPaginateResponse<IGameImage> & IStatusResponse> {
		const res = await fetch('/api/images/paginate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...search, page, limit })
		});
		return res.json();
	}

	static async syncHints(
		imageId: number,
		hints: { hint: string; orderIndex: number }[],
		accessToken?: string,
		creatorToken?: string
	): Promise<IStatusResponse> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
		const res = await fetch(`/api/images/${imageId}/hints`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ hints, creatorToken })
		});
		return res.json();
	}
}
