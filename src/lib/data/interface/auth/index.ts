import type { IAvatarCrop } from '$lib/data/interface/user';

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

export interface IRegisterRequest {
	username: string;
	email: string;
	password: string;
	name?: string;
}

export interface ILoginRequest {
	email: string;
	password: string;
}

export interface IVerifyOtpRequest {
	email: string;
	otp: string;
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface IAuthUser {
	id: number;
	email: string;
	username: string;
	name: string | null;
	isAdmin?: boolean;
	avatarUrl?: string | null;
	avatarCrop?: IAvatarCrop | null;
}

export interface ILoginResponse {
	status: string;
	accessToken: string;
	refreshToken: string;
	user: IAuthUser;
	message?: string;
}

export interface IRefreshResponse {
	status: string;
	accessToken: string;
	refreshToken: string;
	message?: string;
}

export interface IBaseResponse {
	status: string;
	message?: string;
}
