import type { IAvatarCrop } from '$lib/data/interface/user';

// ---------------------------------------------------------------------------
// Entity types (mirrors Go model structs)
// ---------------------------------------------------------------------------

export interface IGame {
	id: number;
	createdAt: string;
	deletedAt: string | null;
	name: string;
	description: string | null;
	creatorId: number;
	creatorToken?: string; // only present in the create response, never in GET responses
	creatorUsername?: string | null; // in paginate / getOne responses; null when a guest made the game
	creatorAvatarUrl?: string | null;
	creatorAvatarCrop?: IAvatarCrop | null;
	difficulty: string | null;
	isPublic: boolean | null;
	likes: number | null;
	isLiked?: boolean;
	playCount: number | null;
	thumbnailUrl: string | null;
	thumbnailPositionX: number | null;
	thumbnailPositionY: number | null;
}

export interface IGameImageHint {
	id: number;
	createdAt: string;
	deletedAt: string | null;
	imageId: number;
	hint: string;
	orderIndex: number;
}

export interface IGameImage {
	id: number;
	createdAt: string;
	deletedAt: string | null;
	gameId: number;
	name: string | null;
	imageUrl: string;
	thumbnailUrl: string | null;
	answer: string;
	hints: IGameImageHint[];
	gridSize: number;
	orderIndex: number;
	timeLimit: number | null;
	maxReveal: number | null;
}

export interface IGameSession {
	id: number;
	createdAt: string;
	deletedAt: string | null;
	userId: number;
	gameId: number;
	currentImageIndex: number;
	revealedTiles: number[];
	undoStack: number[][];
	score: number | null;
	isFinished: boolean | null;
}

// ---------------------------------------------------------------------------
// Request / response shapes (mirrors Go pkg/request_model & pkg/response_model)
// ---------------------------------------------------------------------------

export interface IRequestPaginate<T> {
	search: T;
	page: number;
	limit: number;
}

export interface ISingleResponse<T> {
	doc: T;
	status: string;
	message?: string;
}

export interface IPaginateResponse<T> {
	docs: T[];
	status: string;
	pages: number;
	total: number;
}

export interface IListResponse<T> {
	docs: T[];
	status: string;
}

export interface IStatusResponse {
	status: string;
	error?: string;
}

// ---------------------------------------------------------------------------
// Search / filter payloads (mirrors Go dto/request_search.go)
// ---------------------------------------------------------------------------

export interface ISearchGames {
	search?: string;
	difficulty?: string;
	creatorId?: number;
	isPublic?: boolean;
	viewerUserId?: number;
	likedByUserId?: number;
}

export interface ISearchImages {
	search?: string;
	gameId?: number;
}

export interface ISearchImageHints {
	imageId?: number;
}

export interface ISearchGameSessions {
	userId?: number;
	gameId?: number;
	isFinished?: boolean;
}

// ---------------------------------------------------------------------------
// Create / update request bodies
// ---------------------------------------------------------------------------

export interface ICreateGameRequest {
	name: string;
	description?: string;
	creatorId: number | null;
	difficulty?: string;
	isPublic?: boolean;
	thumbnailUrl?: string;
	thumbnailPositionX?: number;
	thumbnailPositionY?: number;
}

export interface IUpdateGameRequest {
	name?: string;
	description?: string;
	difficulty?: string;
	isPublic?: boolean;
	thumbnailUrl?: string | null;
	thumbnailPositionX?: number;
	thumbnailPositionY?: number;
}

export interface ICreateImageRequest {
	gameId: number;
	imageUrl: string;
	answer: string;
	gridSize: number;
	orderIndex: number;
	name?: string;
	thumbnailUrl?: string;
	timeLimit?: number;
	maxReveal?: number;
}

export interface IUpdateImageRequest {
	name?: string;
	imageUrl?: string;
	thumbnailUrl?: string;
	answer?: string;
	gridSize?: number;
	orderIndex?: number;
	timeLimit?: number;
	maxReveal?: number;
}

export interface ICreateImageHintRequest {
	imageId: number;
	hint: string;
	orderIndex: number;
}

export interface IUpdateImageHintRequest {
	hint?: string;
	orderIndex?: number;
}

export interface ICreateSessionRequest {
	userId: number;
	gameId: number;
	currentImageIndex?: number;
	revealedTiles?: number[];
	undoStack?: number[][];
	score?: number;
	isFinished?: boolean;
}

export interface IUpdateSessionRequest {
	currentImageIndex?: number;
	revealedTiles?: number[];
	undoStack?: number[][];
	score?: number;
	isFinished?: boolean;
}
