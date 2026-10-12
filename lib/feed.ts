import { feedCacheItem } from './store';
import type { CachedFeed, Video } from './types';
import { fetchChannelVideos } from './youtube/rss';

const FEED_TTL_MS = 30 * 60 * 1000;
const CONCURRENCY = 6;

export interface FeedResult {
  /** 최신순 */
  videos: Video[];
  failedChannelIds: string[];
}

/** 채널들의 영상을 최신순으로 합친다. 캐시가 유효한 채널은 다시 받지 않는다. */
export async function loadFeed(channelIds: string[], { force = false } = {}): Promise<FeedResult> {
  const cache = await feedCacheItem.getValue();
  const now = Date.now();
  const stale = channelIds.filter((id) => force || !cache[id] || now - cache[id].fetchedAt > FEED_TTL_MS);

  const fetched: Record<string, CachedFeed> = {};
  const failedChannelIds: string[] = [];
  await mapLimit(stale, CONCURRENCY, async (id) => {
    try {
      fetched[id] = { fetchedAt: Date.now(), videos: await fetchChannelVideos(id) };
    } catch {
      failedChannelIds.push(id);
    }
  });

  if (Object.keys(fetched).length > 0) {
    // 받는 동안 다른 폴더가 캐시를 갱신했을 수 있으므로 다시 읽어서 합친다.
    await feedCacheItem.setValue({ ...(await feedCacheItem.getValue()), ...fetched });
  }

  // 실패한 채널은 이전 캐시가 있으면 그것을 보여준다.
  const merged = { ...cache, ...fetched };
  const videos = channelIds
    .flatMap((id) => merged[id]?.videos ?? [])
    .sort((a, b) => b.publishedAt - a.publishedAt);
  return { videos, failedChannelIds };
}

async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  // 작업자들이 하나의 이터레이터를 나눠 쓰므로 각 항목은 한 번씩만 처리된다.
  const queue = items.values();
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (const item of queue) await task(item);
  });
  await Promise.all(workers);
}
