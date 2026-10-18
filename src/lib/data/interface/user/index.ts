// ---------------------------------------------------------------------------
// Avatar crop — which part of the uploaded picture shows inside the circle.
// x / y are the circle's centre as a fraction (0–1) of the picture's width / height,
// zoom ≥ 1 (1 = the picture's short side exactly fills the circle),
// aspect = picture width / height (lets any size of circle be laid out without loading the image first).
// ---------------------------------------------------------------------------

export interface IAvatarCrop {
	x: number;
	y: number;
	zoom: number;
	aspect: number;
}

export interface IPublicUser {
	id: number;
	username: string;
	name: string | null;
	avatarUrl: string | null;
	avatarCrop: IAvatarCrop | null;
}

export interface IAvatarResponse {
	status: string;
	avatarUrl?: string | null;
	avatarCrop?: IAvatarCrop | null;
	error?: string;
}
