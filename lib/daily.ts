import type { FeedItem } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DAILY_MAX_AGE_DAYS = 7;
export const WATCHED_THRESHOLD_PERCENT = 50;

// 끝난 라이브의 다시보기는 게시 문구가 "스트리밍 시간: 3일 전" / "Streamed 3 days ago"로 온다.
const STREAMED = /스트리밍|streamed/i;

/** live에는 라이브 중, 공개 예정, 라이브 다시보기가 모두 들어간다. */
export type ExclusionReason = 'live' | 'old' | 'watched';

/** 데일리 필터가 이 영상을 숨겨야 하면 그 이유를, 보여줘야 하면 null을 반환한다. */
export function dailyExclusion(item: FeedItem, now: number): ExclusionReason | null {
  if (item.durationText === null || STREAMED.test(item.publishedText)) return 'live';
  // "1주 전"은 7~13일을 뜻하므로 정확히 7일로 추정된 것도 기간 밖으로 본다.
  if (item.publishedAt !== null && now - item.publishedAt >= DAILY_MAX_AGE_DAYS * DAY_MS) return 'old';
  if (item.watchedPercent >= WATCHED_THRESHOLD_PERCENT) return 'watched';
  return null;
}
