import { describe, expect, it } from 'vitest';
import { parseFeed } from './rss';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <id>yt:playlist:UULFabc</id>
 <title>Videos</title>
 <published>2021-10-13T07:10:08+00:00</published>
 <entry>
  <id>yt:video:aaa</id>
  <yt:videoId>aaa</yt:videoId>
  <yt:channelId>UCabc</yt:channelId>
  <title>Tom &amp; Jerry &lt;3 &quot;quoted&quot; &#39;single&#39;</title>
  <published>2026-10-10T17:00:12+00:00</published>
  <updated>2026-10-12T09:30:32+00:00</updated>
  <media:group>
   <media:title>ignored</media:title>
  </media:group>
 </entry>
 <entry>
  <yt:videoId>bbb</yt:videoId>
  <title>두 번째 영상</title>
  <published>2026-10-09T00:00:00+00:00</published>
 </entry>
</feed>`;

describe('parseFeed', () => {
  it('항목별 ID, 제목, 게시 시각을 읽는다', () => {
    expect(parseFeed(FEED, 'UCabc')).toEqual([
      {
        id: 'aaa',
        channelId: 'UCabc',
        title: `Tom & Jerry <3 "quoted" 'single'`,
        publishedAt: Date.parse('2026-10-10T17:00:12+00:00'),
      },
      {
        id: 'bbb',
        channelId: 'UCabc',
        title: '두 번째 영상',
        publishedAt: Date.parse('2026-10-09T00:00:00+00:00'),
      },
    ]);
  });

  it('피드 자체의 제목과 게시 시각을 영상으로 읽지 않는다', () => {
    expect(parseFeed('<feed><title>Videos</title><published>2021-10-13T07:10:08+00:00</published></feed>', 'UCabc')).toEqual([]);
  });

  it('ID나 게시 시각이 없는 항목은 버린다', () => {
    expect(parseFeed('<feed><entry><title>x</title></entry></feed>', 'UCabc')).toEqual([]);
  });
});
