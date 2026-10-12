import { initFilterBar } from '@/lib/filterBar';
import { FETCH_SUBSCRIPTIONS, type YouTubeRequest, type YouTubeResponse } from '@/lib/messages';
import { fetchSubscriptions } from '@/lib/youtube/subscriptions';

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  main() {
    browser.runtime.onMessage.addListener(
      (message: YouTubeRequest, _sender, sendResponse: (response: YouTubeResponse<unknown>) => void) => {
        if (message?.type !== FETCH_SUBSCRIPTIONS) return;
        fetchSubscriptions().then(
          (data) => sendResponse({ ok: true, data }),
          (error) => sendResponse({ ok: false, error: String(error?.message ?? error) }),
        );
        return true;
      },
    );
    initFilterBar();
  },
});
