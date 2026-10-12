export const FETCH_SUBSCRIPTIONS = 'fetch-subscriptions';
export const OPEN_DASHBOARD = 'open-dashboard';

/** 확장 페이지가 youtube.com 콘텐츠 스크립트에 보내는 요청 */
export type YouTubeRequest = { type: typeof FETCH_SUBSCRIPTIONS };

export type YouTubeResponse<T> = { ok: true; data: T } | { ok: false; error: string };
