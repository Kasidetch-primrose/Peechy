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
		data: ICreateImageRequest
	): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const res = await fetch('/api/images', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async getOne(id: number): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const res = await fetch(`/api/images/${id}`);
		return res.json();
	}

	static async update(
		id: number,
		data: IUpdateImageRequest
	): Promise<ISingleResponse<IGameImage> & IStatusResponse> {
		const res = await fetch(`/api/images/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}

	static async deleteMany(ids: number[]): Promise<IStatusResponse> {
		const res = await fetch('/api/images', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
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
}
