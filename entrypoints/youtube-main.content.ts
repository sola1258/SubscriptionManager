import { DAILY_MAX_AGE_DAYS, DAY_MS, dailyExclusion } from '@/lib/daily';
import {
  CARD_SELECTOR,
  FOLDER_MAX_AGE_DAYS,
  SCANNED_EVENT,
  SECTION_SELECTOR,
  SUBSCRIPTIONS_PATH,
} from '@/lib/pageFilter';
import type { FeedItem } from '@/lib/types';
import { findAll } from '@/lib/youtube/innertube';
import { collectFeedItems } from '@/lib/youtube/subscriptionFeed';

const SCAN_DELAY_MS = 200;
const SHORTS_KEYS = ['shortsLockupViewModel', 'reelItemRenderer', 'reelWatchEndpoint'];

// YouTube가 카드 요소의 data 속성에 넣어두는 원본 데이터는 페이지의 JS 세계에서만 읽을 수 있다.
export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  world: 'MAIN',
  main() {
    // 요소가 다른 영상으로 재사용되면 data가 바뀌므로, 마지막으로 처리한 data를 기억해 둔다.
    const seen = new WeakMap<Element, unknown>();
    let timer: number | undefined;

    function schedule() {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        scan();
      }, SCAN_DELAY_MS);
    }

    function scan() {
      const root = document.documentElement;
      if (location.pathname !== SUBSCRIPTIONS_PATH) {
        delete root.dataset.smPast;
        return;
      }
      const now = Date.now();
      for (const card of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
        const data = dataOf(card);
        if (data === undefined || seen.get(card) === data) continue;
        seen.set(card, data);
        annotateCard(card, data, now);
      }
      for (const section of document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)) {
        const data = dataOf(section);
        if (data === undefined || seen.get(section) === data) continue;
        seen.set(section, data);
        setReason(section, hasShorts(data) ? 'shorts' : null);
      }

      let oldest = -1;
      for (const card of document.querySelectorAll<HTMLElement>(`${CARD_SELECTOR}[data-sm-age]`)) {
        const age = Number(card.dataset.smAge || -1);
        if (age > oldest) oldest = age;
      }
      if (oldest >= FOLDER_MAX_AGE_DAYS) root.dataset.smPast = 'month';
      else if (oldest >= DAILY_MAX_AGE_DAYS) root.dataset.smPast = 'week';
      else delete root.dataset.smPast;

      document.dispatchEvent(new CustomEvent(SCANNED_EVENT));
    }

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('yt-navigate-finish', schedule);
    schedule();
  },
});

function dataOf(element: Element): unknown {
  return (element as { data?: unknown }).data;
}

function annotateCard(card: HTMLElement, data: unknown, now: number) {
  const items = new Map<string, FeedItem>();
  collectFeedItems(data, items, now);
  const item = items.values().next().value;
  if (!item) {
    delete card.dataset.smChannel;
    delete card.dataset.smAge;
    setReason(card, hasShorts(data) ? 'shorts' : null);
    return;
  }
  card.dataset.smChannel = item.channelId ?? '';
  card.dataset.smAge = item.publishedAt === null ? '' : String(Math.floor((now - item.publishedAt) / DAY_MS));
  setReason(card, dailyExclusion(item, now));
}

function setReason(element: HTMLElement, reason: string | null) {
  if (reason) element.dataset.smReason = reason;
  else delete element.dataset.smReason;
}

function hasShorts(data: unknown): boolean {
  return SHORTS_KEYS.some((key) => findAll(data, key).length > 0);
}
