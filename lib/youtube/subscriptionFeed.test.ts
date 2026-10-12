import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../types';
import { collectFeedItems, parseRelativeAge } from './subscriptionFeed';

const NOW = Date.parse('2026-10-12T12:00:00Z');
const HOUR = 3600_000;
const DAY = 24 * HOUR;

// 아래 픽스처는 알려진 응답 형태를 본뜬 것이다. 실제 응답과 다를 수 있으므로 Edge에서의 확인을 대신하지 않는다.
function videoRenderer(id: string, extra: object = {}) {
  return {
    videoRenderer: {
      videoId: id,
      title: { runs: [{ text: `제목 ${id}` }] },
      ownerText: { runs: [{ text: '채널', navigationEndpoint: { browseEndpoint: { browseId: 'UCowner' } } }] },
      lengthText: { simpleText: '12:34' },
      publishedTimeText: { simpleText: '3일 전' },
      thumbnailOverlays: [{ thumbnailOverlayTimeStatusRenderer: { style: 'DEFAULT', text: { simpleText: '12:34' } } }],
      ...extra,
    },
  };
}

function lockup(id: string, { badges = [{ text: '1:02:03' }], parts = ['채널', '조회수 1만회', '2시간 전'], progress }: {
  badges?: object[];
  parts?: string[];
  progress?: number;
} = {}) {
  const overlays: object[] = [
    { thumbnailBottomOverlayViewModel: { badges: badges.map((badge) => ({ thumbnailBadgeViewModel: badge })) } },
  ];
  if (progress !== undefined) overlays.push({ thumbnailOverlayProgressBarViewModel: { startPercent: progress } });
  return {
    lockupViewModel: {
      contentId: id,
      contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
      contentImage: { thumbnailViewModel: { overlays } },
      metadata: {
        lockupMetadataViewModel: {
          title: { content: `제목 ${id}` },
          image: { onTap: { innertubeCommand: { browseEndpoint: { browseId: 'UClockup' } } } },
          metadata: {
            contentMetadataViewModel: {
              metadataRows: [
                { metadataParts: [{ text: { content: parts[0] } }] },
                { metadataParts: parts.slice(1).map((content) => ({ text: { content } })) },
              ],
            },
          },
        },
      },
    },
  };
}

function collect(root: unknown) {
  const items = new Map<string, FeedItem>();
  const token = collectFeedItems(root, items, NOW);
  return { items: [...items.values()], token };
}

describe('collectFeedItems — videoRenderer', () => {
  it('일반 영상을 읽는다', () => {
    expect(collect([videoRenderer('a')]).items).toEqual([
      {
        id: 'a',
        title: '제목 a',
        channelId: 'UCowner',
        channelTitle: '채널',
        durationText: '12:34',
        watchedPercent: 0,
        publishedText: '3일 전',
        publishedAt: NOW - 3 * DAY,
      },
    ]);
  });

  it('시청 진행률을 읽는다', () => {
    const [item] = collect([
      videoRenderer('a', {
        thumbnailOverlays: [{ thumbnailOverlayResumePlaybackRenderer: { percentDurationWatched: 72 } }],
      }),
    ]).items;
    expect(item!.watchedPercent).toBe(72);
  });

  it('라이브 중이거나 공개 예정이면 길이가 null', () => {
    const { items } = collect([
      videoRenderer('live', {
        lengthText: undefined,
        thumbnailOverlays: [{ thumbnailOverlayTimeStatusRenderer: { style: 'LIVE', text: { simpleText: '라이브' } } }],
      }),
      videoRenderer('premiere', { upcomingEventData: { startTime: '1791900000' } }),
    ]);
    expect(items.map((item) => item.durationText)).toEqual([null, null]);
  });

  it('Shorts는 건너뛴다', () => {
    const { items } = collect([
      videoRenderer('s1', { thumbnailOverlays: [{ thumbnailOverlayTimeStatusRenderer: { style: 'SHORTS' } }] }),
      videoRenderer('s2', { navigationEndpoint: { reelWatchEndpoint: { videoId: 's2' } } }),
      { shortsLockupViewModel: { entityId: 'shorts-shelf-item-1' } },
    ]);
    expect(items).toEqual([]);
  });
});

describe('collectFeedItems — lockupViewModel', () => {
  it('일반 영상을 읽는다', () => {
    expect(collect([lockup('a', { progress: 40 })]).items).toEqual([
      {
        id: 'a',
        title: '제목 a',
        channelId: 'UClockup',
        channelTitle: '채널',
        durationText: '1:02:03',
        watchedPercent: 40,
        publishedText: '2시간 전',
        publishedAt: NOW - 2 * HOUR,
      },
    ]);
  });

  it('라이브 중이거나 공개 예정이면 길이가 null', () => {
    const { items } = collect([
      lockup('live', {
        badges: [{ text: '라이브', badgeStyle: 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE' }],
        parts: ['채널', '1,234명 시청 중'],
      }),
      lockup('upcoming', { badges: [{ text: '예정' }], parts: ['채널', '10. 14. 오후 8:00 예정'] }),
      lockup('premiere', { parts: ['채널', '10. 14. 오후 8:00 최초 공개 예정'] }),
    ]);
    expect(items.map((item) => item.durationText)).toEqual([null, null, null]);
    expect(items.map((item) => item.publishedAt)).toEqual([null, null, null]);
  });

  it('영상이 아닌 항목은 건너뛴다', () => {
    const playlist = lockup('PL1');
    playlist.lockupViewModel.contentType = 'LOCKUP_CONTENT_TYPE_PLAYLIST';
    expect(collect([playlist]).items).toEqual([]);
  });
});

describe('collectFeedItems', () => {
  it('피드 순서를 유지하고, 중복을 버리고, 다음 페이지 토큰을 반환한다', () => {
    const { items, token } = collect({
      contents: [
        { richItemRenderer: { content: videoRenderer('a') } },
        { richItemRenderer: { content: lockup('b') } },
        { richItemRenderer: { content: videoRenderer('a') } },
        { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'NEXT' } } } },
      ],
    });
    expect(items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(token).toBe('NEXT');
  });
});

describe('parseRelativeAge', () => {
  it.each([
    ['30초 전', 30_000],
    ['5분 전', 5 * 60_000],
    ['2시간 전', 2 * HOUR],
    ['6일 전', 6 * DAY],
    ['1주 전', 7 * DAY],
    ['3개월 전', 90 * DAY],
    ['1년 전', 365 * DAY],
    ['스트리밍 시간: 4일 전', 4 * DAY],
    ['2 hours ago', 2 * HOUR],
    ['Streamed 1 day ago', DAY],
    ['3 Weeks ago', 21 * DAY],
  ])('%s', (text, expected) => {
    expect(parseRelativeAge(text)).toBe(expected);
  });

  it('상대 시간이 아니면 null', () => {
    expect(parseRelativeAge('조회수 1만회')).toBeNull();
    expect(parseRelativeAge('10. 14. 오후 8:00 예정')).toBeNull();
    expect(parseRelativeAge('')).toBeNull();
  });
});
