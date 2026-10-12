import type { Channel } from '../types';
import { browseContinuation, openBrowsePage, textOf, type Json } from './innertube';

// 구독 채널 목록을 수집한다. /feed/channels의 첫 페이지를 읽고, 나머지는 browse 연속 요청으로 받는다.

const MAX_PAGES = 100;

export async function fetchSubscriptions(): Promise<Channel[]> {
  const { config, initialData } = await openBrowsePage('/feed/channels');

  const channels = new Map<string, Channel>();
  let token = collectChannels(initialData, channels);
  let pages = 1;

  while (token && pages < MAX_PAGES) {
    const data = await browseContinuation(config, token);
    const before = channels.size;
    token = collectChannels(data, channels);
    pages += 1;
    if (channels.size === before) break;
  }

  return [...channels.values()];
}

/**
 * 트리 전체에서 channelRenderer를 찾아 channels에 추가하고, 다음 페이지 토큰이 있으면 반환한다.
 * 응답 구조가 자주 바뀌므로 경로를 고정하지 않는다.
 */
export function collectChannels(root: Json, channels: Map<string, Channel>): string | null {
  let token: string | null = null;
  const stack: Json[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push(node[i]);
      continue;
    }
    if (node.channelRenderer?.channelId) {
      const channel = toChannel(node.channelRenderer);
      if (!channels.has(channel.id)) channels.set(channel.id, channel);
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

function toChannel(renderer: Json): Channel {
  const thumbnails: { url: string }[] = renderer.thumbnail?.thumbnails ?? [];
  const thumbnail = thumbnails[thumbnails.length - 1]?.url ?? '';
  const baseUrl: string = renderer.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ?? '';
  return {
    id: renderer.channelId,
    title: textOf(renderer.title),
    thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
    handle: baseUrl.startsWith('/@') ? decodeHandle(baseUrl.slice(1)) : undefined,
  };
}

// 한글·일본어 핸들은 퍼센트 인코딩되어 온다.
function decodeHandle(handle: string): string {
  try {
    return decodeURIComponent(handle);
  } catch {
    return handle;
  }
}
