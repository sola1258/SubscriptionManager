import type { FeedItem } from '../types';
import { findAll, textOf, type Json } from './innertube';

// YouTube 구독 피드의 영상 데이터를 해석한다. RSS와 달리 시청 진행률과 라이브·예정 여부를 알 수 있다.
// 구독 페이지의 카드 요소에 붙어 있는 데이터를 읽는 데 쓴다.

const DURATION = /^\d+(:\d{2})+$/;
const SCHEDULED = /예정|scheduled|premieres/i;

/**
 * 트리 전체에서 영상을 찾아 items에 추가하고, 다음 페이지 토큰이 있으면 반환한다.
 * YouTube가 구형(videoRenderer)과 신형(lockupViewModel) 형식을 섞어 쓰므로 둘 다 읽는다.
 * Shorts는 다른 형식(shortsLockupViewModel, reelItemRenderer)으로 오기 때문에 수집되지 않는다.
 */
export function collectFeedItems(root: Json, items: Map<string, FeedItem>, now: number): string | null {
  let token: string | null = null;
  const stack: Json[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push(node[i]);
      continue;
    }
    const item = node.videoRenderer
      ? fromVideoRenderer(node.videoRenderer, now)
      : node.lockupViewModel
        ? fromLockup(node.lockupViewModel, now)
        : undefined;
    if (item !== undefined) {
      if (item && !items.has(item.id)) items.set(item.id, item);
      continue;
    }
    const next = node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (next) {
      token = next;
      continue;
    }
    for (const value of Object.values(node)) stack.push(value);
  }
  return token;
}

function fromVideoRenderer(renderer: Json, now: number): FeedItem | null {
  if (!renderer.videoId) return null;
  const timeStatus = findAll(renderer.thumbnailOverlays, 'thumbnailOverlayTimeStatusRenderer')[0];
  if (timeStatus?.style === 'SHORTS' || renderer.navigationEndpoint?.reelWatchEndpoint) return null;

  const owner = renderer.ownerText ?? renderer.shortBylineText ?? renderer.longBylineText;
  const duration = textOf(renderer.lengthText) || textOf(timeStatus?.text);
  const publishedText = textOf(renderer.publishedTimeText);
  const resume = findAll(renderer.thumbnailOverlays, 'thumbnailOverlayResumePlaybackRenderer')[0];
  // 공개 예정인 최초 공개 영상은 길이가 있어도 아직 볼 수 없다.
  const playable = !renderer.upcomingEventData && DURATION.test(duration);
  return {
    id: renderer.videoId,
    title: textOf(renderer.title),
    channelId: owner?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
    channelTitle: textOf(owner),
    durationText: playable ? duration : null,
    watchedPercent: resume?.percentDurationWatched ?? 0,
    publishedText,
    publishedAt: toTimestamp(publishedText, now),
  };
}

function fromLockup(lockup: Json, now: number): FeedItem | null {
  if (!lockup.contentId || lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
  const metadata = lockup.metadata?.lockupMetadataViewModel;
  const parts = findAll(metadata?.metadata, 'metadataParts')
    .flat()
    .map((part: Json) => textOf(part?.text))
    .filter(Boolean);
  const publishedText = parts.find((part) => parseRelativeAge(part) !== null) ?? '';

  const badges = findAll(lockup.contentImage, 'thumbnailBadgeViewModel');
  const duration = badges.map((badge: Json) => textOf(badge?.text)).find((text) => DURATION.test(text));
  const live = badges.some((badge: Json) => /LIVE/.test(badge?.badgeStyle ?? ''));
  const scheduled = !publishedText && parts.some((part) => SCHEDULED.test(part));
  const progress = findAll(lockup.contentImage, 'thumbnailOverlayProgressBarViewModel')[0];
  return {
    id: lockup.contentId,
    title: textOf(metadata?.title),
    channelId: findAll(lockup, 'browseEndpoint')
      .map((endpoint: Json) => endpoint?.browseId)
      .find((id) => typeof id === 'string' && id.startsWith('UC')),
    channelTitle: parts[0] ?? '',
    durationText: duration && !live && !scheduled ? duration : null,
    watchedPercent: progress?.startPercent ?? 0,
    publishedText,
    publishedAt: toTimestamp(publishedText, now),
  };
}

function toTimestamp(publishedText: string, now: number): number | null {
  const age = parseRelativeAge(publishedText);
  return age === null ? null : now - age;
}

const SECOND = 1000;
const UNIT_MS: Record<string, number> = {
  초: SECOND,
  second: SECOND,
  분: 60 * SECOND,
  minute: 60 * SECOND,
  시간: 3600 * SECOND,
  hour: 3600 * SECOND,
  일: 86_400 * SECOND,
  day: 86_400 * SECOND,
  주: 7 * 86_400 * SECOND,
  week: 7 * 86_400 * SECOND,
  개월: 30 * 86_400 * SECOND,
  달: 30 * 86_400 * SECOND,
  month: 30 * 86_400 * SECOND,
  년: 365 * 86_400 * SECOND,
  year: 365 * 86_400 * SECOND,
};
const RELATIVE_KO = /(\d+)\s*(초|분|시간|일|주|개월|달|년)\s*전/;
const RELATIVE_EN = /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i;

/** "3일 전", "스트리밍 시간: 2시간 전", "5 days ago" 같은 문구를 경과 시간(ms)으로 바꾼다. 모르는 형식이면 null. */
export function parseRelativeAge(text: string): number | null {
  const match = RELATIVE_KO.exec(text) ?? RELATIVE_EN.exec(text);
  if (!match) return null;
  return Number(match[1]) * UNIT_MS[match[2]!.toLowerCase()]!;
}
