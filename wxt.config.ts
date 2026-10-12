import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  // assets/icon.svg 하나에서 크기별 PNG 아이콘을 만든다.
  autoIcons: { baseIconPath: 'assets/icon.svg' },
  // YouTube 로그인 세션이 필요하므로 새 프로필로 브라우저를 띄우지 않고, 평소 쓰는 Edge에 직접 로드한다.
  webExt: { disabled: true },
  manifest: {
    name: 'Subscription Manager',
    description: 'YouTube 구독 채널을 폴더로 나눠 폴더별 최신 영상을 봅니다.',
    permissions: ['storage', 'unlimitedStorage'],
    host_permissions: ['https://www.youtube.com/*'],
    action: { default_title: 'Subscription Manager 열기' },
  },
});
