import { describe, expect, it } from 'vitest';
import type { Channel } from '../types';
import { extractJsonAfter } from './innertube';
import { collectChannels } from './subscriptions';

function renderer(id: string, title: string, baseUrl?: string) {
  return {
    channelRenderer: {
      channelId: id,
      title: { simpleText: title },
      thumbnail: { thumbnails: [{ url: '//yt3.example/small' }, { url: '//yt3.example/large' }] },
      navigationEndpoint: { browseEndpoint: { canonicalBaseUrl: baseUrl } },
    },
  };
}

describe('collectChannels', () => {
  it('깊이에 상관없이 채널을 순서대로 모으고 다음 페이지 토큰을 반환한다', () => {
    const data = {
      contents: {
        tabs: [
          {
            sections: [
              { items: [renderer('UC1', ' 첫째 ', '/@first'), renderer('UC2', '둘째', '/@%EB%91%98%EC%A7%B8')] },
              { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'NEXT' } } } },
            ],
          },
        ],
      },
    };
    const channels = new Map<string, Channel>();

    expect(collectChannels(data, channels)).toBe('NEXT');
    expect([...channels.values()]).toEqual([
      { id: 'UC1', title: '첫째', thumbnail: 'https://yt3.example/large', handle: '@first' },
      { id: 'UC2', title: '둘째', thumbnail: 'https://yt3.example/large', handle: '@둘째' },
    ]);
  });

  it('핸들이 없는 채널과 중복 채널을 처리한다', () => {
    const channels = new Map<string, Channel>();

    expect(collectChannels([renderer('UC1', '주제 채널'), renderer('UC1', '중복')], channels)).toBeNull();
    expect([...channels.values()]).toEqual([
      { id: 'UC1', title: '주제 채널', thumbnail: 'https://yt3.example/large', handle: undefined },
    ]);
  });
});

describe('extractJsonAfter', () => {
  it('marker 뒤의 객체만 잘라낸다', () => {
    const html = '<script>var ytInitialData = {"a":{"b":1}};</script><script>var other = {"c":2};</script>';
    expect(extractJsonAfter(html, /ytInitialData"?\]?\s*=\s*/)).toEqual({ a: { b: 1 } });
  });

  it('문자열 안의 중괄호와 이스케이프된 따옴표에 속지 않는다', () => {
    const html = 'x "INNERTUBE_CONTEXT":{"text":"} \\" {","n":{"k":"v"}},"after":{}';
    expect(extractJsonAfter(html, /"INNERTUBE_CONTEXT":/)).toEqual({ text: '} " {', n: { k: 'v' } });
  });

  it('marker가 없거나 객체가 닫히지 않으면 null', () => {
    expect(extractJsonAfter('nothing here', /ytInitialData\s*=\s*/)).toBeNull();
    expect(extractJsonAfter('ytInitialData = {"a":', /ytInitialData\s*=\s*/)).toBeNull();
  });
});
