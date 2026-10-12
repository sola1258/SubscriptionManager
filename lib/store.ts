import { storage } from '#imports';
import { dedupeChannels } from './folders';
import type { CachedFeed, Channel, Folder } from './types';


export const channelsItem = storage.defineItem<Channel[]>('local:channels', { fallback: [] });

export const foldersItem = storage.defineItem<Folder[]>('local:folders', {
  fallback: [],
  version: 2,
  migrations: {
    // v1에서는 한 채널이 여러 폴더에 들어갈 수 있었다.
    2: (folders: Folder[] | null) => dedupeChannels(folders ?? []),
  },
});

/** 채널 ID별 영상 캐시 */
export const feedCacheItem = storage.defineItem<Record<string, CachedFeed>>('local:feedCache', {
  fallback: {},
});

export const lastSyncedAtItem = storage.defineItem<number | null>('local:lastSyncedAt', {
  fallback: null,
});
