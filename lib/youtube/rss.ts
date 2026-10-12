import type { Video } from '../types';

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml';

/**
 * 채널의 최신 영상을 Shorts 없이 가져온다.
 * 일반 영상(UULF)과 라이브(UULV) 플레이리스트 피드를 합친다. UULF만 쓰면 라이브 다시보기까지 빠진다.
 */
export async function fetchChannelVideos(channelId: string): Promise<Video[]> {
  const suffix = channelId.slice(2);
  const [videos, live] = await Promise.all([
    fetchPlaylist(`UULF${suffix}`, channelId),
    fetchPlaylist(`UULV${suffix}`, channelId),
  ]);
  return [...videos, ...live.map((video) => ({ ...video, isLive: true }))].sort(
    (a, b) => b.publishedAt - a.publishedAt,
  );
}

async function fetchPlaylist(playlistId: string, channelId: string): Promise<Video[]> {
  const res = await fetch(`${FEED_URL}?playlist_id=${playlistId}`, { credentials: 'omit' });
  // 해당 종류의 영상이 하나도 없는 채널은 404가 온다.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`RSS 응답 오류 (${res.status})`);
  return parseFeed(await res.text(), channelId);
}

// 서비스 워커에는 DOMParser가 없어서 정규식으로 파싱한다.
export function parseFeed(xml: string, channelId: string): Video[] {
  return xml
    .split('<entry>')
    .slice(1)
    .map((entry) => ({
      id: tag(entry, 'yt:videoId'),
      channelId,
      title: decodeEntities(tag(entry, 'title')),
      publishedAt: Date.parse(tag(entry, 'published')),
    }))
    .filter((video) => video.id && !Number.isNaN(video.publishedAt));
}

function tag(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? '';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
