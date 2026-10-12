import { describe, expect, it } from 'vitest';
import { dailyExclusion } from './daily';
import type { FeedItem } from './types';

const NOW = Date.parse('2026-10-12T12:00:00Z');
const DAY = 24 * 3600_000;

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'a',
    title: 'a',
    channelTitle: '채널',
    durationText: '10:00',
    watchedPercent: 0,
    publishedText: '1일 전',
    publishedAt: NOW - DAY,
    ...overrides,
  };
}

describe('dailyExclusion', () => {
  it('조건에 맞는 영상은 보여준다', () => {
    expect(dailyExclusion(item(), NOW)).toBeNull();
    expect(dailyExclusion(item({ watchedPercent: 49 }), NOW)).toBeNull();
  });

  it('라이브 중·공개 예정을 숨긴다', () => {
    expect(dailyExclusion(item({ durationText: null, publishedAt: null }), NOW)).toBe('live');
  });

  it('끝난 라이브의 다시보기를 숨긴다', () => {
    expect(dailyExclusion(item({ durationText: '3:12:45', publishedText: '스트리밍 시간: 2일 전' }), NOW)).toBe('live');
    expect(dailyExclusion(item({ durationText: '3:12:45', publishedText: 'Streamed 2 days ago' }), NOW)).toBe('live');
  });

  it('절반 이상 본 영상을 숨긴다', () => {
    expect(dailyExclusion(item({ watchedPercent: 50 }), NOW)).toBe('watched');
    expect(dailyExclusion(item({ watchedPercent: 100 }), NOW)).toBe('watched');
  });

  it('7일이 지난 영상을 숨기고, 6일 된 영상은 보여준다', () => {
    expect(dailyExclusion(item({ publishedAt: NOW - 6 * DAY }), NOW)).toBeNull();
    expect(dailyExclusion(item({ publishedAt: NOW - 7 * DAY }), NOW)).toBe('old');
  });

  it('게시 시각을 모르는 영상은 보여준다', () => {
    expect(dailyExclusion(item({ publishedAt: null }), NOW)).toBeNull();
  });
});
