import { browser } from '#imports';
import { FETCH_SUBSCRIPTIONS, type YouTubeRequest, type YouTubeResponse } from './messages';
import { channelsItem, lastSyncedAtItem } from './store';
import type { Channel } from './types';

const YOUTUBE_URL = 'https://www.youtube.com/';
const TAB_LOAD_TIMEOUT_MS = 30_000;

/** 구독 채널 목록을 수집해 저장한다. */
export async function syncSubscriptions(): Promise<Channel[]> {
  const channels = await askYouTubeTab<Channel[]>({ type: FETCH_SUBSCRIPTIONS });
  // 수집이 조용히 실패했을 때 기존 목록을 빈 목록으로 덮어쓰지 않는다.
  if (channels.length === 0) throw new Error('구독 채널을 찾지 못했습니다.');
  await channelsItem.setValue(channels);
  await lastSyncedAtItem.setValue(Date.now());
  return channels;
}

/** youtube.com 탭의 콘텐츠 스크립트에 일을 시킨다. 쓸 수 있는 탭이 없으면 임시 탭을 열었다가 닫는다. */
async function askYouTubeTab<T>(request: YouTubeRequest): Promise<T> {
  const response = (await askOpenTabs<T>(request)) ?? (await askTemporaryTab<T>(request));
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

async function askOpenTabs<T>(request: YouTubeRequest): Promise<YouTubeResponse<T> | null> {
  const tabs = await browser.tabs.query({ url: `${YOUTUBE_URL}*` });
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    try {
      const response: YouTubeResponse<T> | undefined = await browser.tabs.sendMessage(tab.id, request);
      if (response) return response;
    } catch {
      // 확장을 로드하기 전에 열린 탭에는 콘텐츠 스크립트가 없다.
    }
  }
  return null;
}

async function askTemporaryTab<T>(request: YouTubeRequest): Promise<YouTubeResponse<T>> {
  const tab = await browser.tabs.create({ url: YOUTUBE_URL, active: false });
  const tabId = tab.id!;
  try {
    await waitForLoad(tabId);
    const response: YouTubeResponse<T> | undefined = await browser.tabs
      .sendMessage(tabId, request)
      .catch(() => undefined);
    if (!response) throw new Error('YouTube 탭과 통신하지 못했습니다. YouTube에 로그인되어 있는지 확인하세요.');
    return response;
  } finally {
    await browser.tabs.remove(tabId).catch(() => {});
  }
}

function waitForLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error('YouTube 탭을 여는 데 시간이 너무 오래 걸립니다.'));
    }, TAB_LOAD_TIMEOUT_MS);
    const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      clearTimeout(timeout);
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    browser.tabs.onUpdated.addListener(listener);
  });
}
