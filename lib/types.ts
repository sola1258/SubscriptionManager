export interface Channel {
  /** UC로 시작하는 채널 ID */
  id: string;
  title: string;
  thumbnail: string;
  /** @로 시작하는 핸들. 주제 채널 등에는 없다. */
  handle?: string;
}

export interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  /** epoch ms */
  publishedAt: number;
  isLive?: boolean;
}

/** YouTube 구독 피드에서 읽은 영상 한 개 */
export interface FeedItem {
  id: string;
  title: string;
  channelId?: string;
  channelTitle: string;
  /** "12:34" 형식. 라이브 중이거나 공개 예정이면 null. */
  durationText: string | null;
  /** 0~100 */
  watchedPercent: number;
  /** YouTube가 보여주는 문구 그대로 ("3일 전") */
  publishedText: string;
  /** publishedText로 추정한 epoch ms. 문구를 해석하지 못하면 null. */
  publishedAt: number | null;
}

export interface CachedFeed {
  fetchedAt: number;
  videos: Video[];
}
