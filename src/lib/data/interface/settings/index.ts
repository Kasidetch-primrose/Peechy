/** How many cards a home page section shows. "desktop" is lg and up (3 per row); "mobile" is phone + tablet (2 per row). */
export interface IHomeSectionLimit {
	desktop: number;
	mobile: number;
}

/** Home page layout set in the CMS. 0 hides the section on that screen size. */
export interface IHomeSettings {
	games: IHomeSectionLimit;
	artworks: IHomeSectionLimit;
}

export const HOME_SECTIONS = ['games', 'artworks'] as const;
export const HOME_LIMIT_MAX = 24;

export const DEFAULT_HOME_SETTINGS: IHomeSettings = {
	games: { desktop: 6, mobile: 4 },
	artworks: { desktop: 6, mobile: 4 }
};
