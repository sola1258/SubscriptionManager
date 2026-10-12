import { OPEN_DASHBOARD } from '@/lib/messages';

const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';

export default defineBackground(() => {
  // 아이콘을 누르면 구독 페이지로 간다. 이미 열려 있으면 그 탭을 앞으로 가져온다.
  browser.action.onClicked.addListener(async () => {
    const [tab] = await browser.tabs.query({ url: `${SUBSCRIPTIONS_URL}*` });
    if (tab?.id === undefined) {
      await browser.tabs.create({ url: SUBSCRIPTIONS_URL });
      return;
    }
    await browser.tabs.update(tab.id, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
  });

  // 콘텐츠 스크립트는 확장 페이지를 직접 열 수 없다.
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === OPEN_DASHBOARD) {
      browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
    }
  });
});
