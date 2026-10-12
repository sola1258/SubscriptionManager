import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFeed, type FeedResult } from '@/lib/feed';
import type { Channel, Video } from '@/lib/types';

const PAGE_SIZE = 60;

interface Props {
  title: string;
  channelIds: string[];
  channelsById: Map<string, Channel>;
  /** 실제 폴더를 볼 때만 전달된다. */
  onRename?: () => void;
  onDelete?: () => void;
}

export default function FeedView({ title, channelIds, channelsById, onRename, onDelete }: Props) {
  const [feed, setFeed] = useState<FeedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const requestId = useRef(0);
  // 배열 참조가 아니라 내용이 바뀔 때만 다시 불러온다.
  const channelKey = channelIds.join(',');

  const load = useCallback(
    async (force: boolean) => {
      const id = (requestId.current += 1);
      setLoading(true);
      try {
        const result = await loadFeed(channelKey ? channelKey.split(',') : [], { force });
        // 그 사이 다른 폴더를 선택했으면 버린다.
        if (id === requestId.current) setFeed(result);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [channelKey],
  );

  useEffect(() => {
    setFeed(null);
    setVisible(PAGE_SIZE);
    load(false);
  }, [load]);

  const videos = feed?.videos ?? [];

  return (
    <>
      <header className="main-header">
        <h2>{title}</h2>
        <span className="muted">채널 {channelIds.length}개</span>
        <span className="spacer" />
        {onRename && <button onClick={onRename}>이름 변경</button>}
        {onDelete && <button onClick={onDelete}>폴더 삭제</button>}
        <button onClick={() => load(true)} disabled={loading}>
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </header>

      {feed && feed.failedChannelIds.length > 0 && (
        <p className="error">
          영상을 불러오지 못한 채널 {feed.failedChannelIds.length}개:{' '}
          {feed.failedChannelIds.map((id) => channelsById.get(id)?.title ?? id).join(', ')}
        </p>
      )}

      {channelIds.length === 0 ? (
        <div className="empty">
          <p>이 폴더에 채널이 없습니다.</p>
          <p>왼쪽의 “채널 관리”에서 채널을 폴더에 넣어주세요.</p>
        </div>
      ) : feed && videos.length === 0 ? (
        <div className="empty">
          <p>표시할 영상이 없습니다.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.slice(0, visible).map((video) => (
            <VideoCard key={video.id} video={video} channel={channelsById.get(video.channelId)} />
          ))}
        </div>
      )}

      {videos.length > visible && (
        <div className="more">
          <button onClick={() => setVisible((count) => count + PAGE_SIZE)}>더 보기</button>
        </div>
      )}
    </>
  );
}

function VideoCard({ video, channel }: { video: Video; channel?: Channel }) {
  return (
    <a className="video" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
      <div className="thumb">
        <img src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`} alt="" loading="lazy" />
        {video.isLive && <span className="badge">라이브</span>}
      </div>
      <div className="video-title">{video.title}</div>
      <div className="muted">
        {channel?.title ?? video.channelId} · {relativeTime(video.publishedAt)}
      </div>
    </a>
  );
}

const relativeFormat = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

function relativeTime(timestamp: number): string {
  const diff = timestamp - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relativeFormat.format(Math.round(diff / ms), unit);
  }
  return '방금';
}
