import { browser } from '#imports';
import { OPEN_DASHBOARD } from './messages';
import { CARD_SELECTOR, SCANNED_EVENT, SECTION_SELECTOR, SUBSCRIPTIONS_PATH, type FilterState } from './pageFilter';
import { foldersItem } from './store';
import type { Folder } from './types';

// 구독 페이지 아래쪽에 떠 있는 필터 막대. YouTube의 DOM 구조에 기대지 않으려고 페이지 레이아웃에 끼워 넣지 않는다.

const REASON_LABELS: Record<string, string> = {
  live: '라이브',
  watched: '시청함',
  old: '7일 지남',
  shorts: 'Shorts',
};

const STATIC_CSS = `
html[data-sm-page][data-sm-daily] ytd-rich-item-renderer[data-sm-reason],
html[data-sm-page][data-sm-daily] ytd-rich-section-renderer[data-sm-reason],
html[data-sm-page][data-sm-folder] ytd-rich-section-renderer {
  display: none !important;
}
/* 기간 한도까지 불러왔으면 YouTube가 다음 페이지를 계속 불러오지 않도록 로딩 표시를 숨긴다. */
html[data-sm-page][data-sm-daily][data-sm-past] ytd-rich-grid-renderer ytd-continuation-item-renderer,
/* 폴더 보기는 채널이 맞는 카드를 찾을 때까지 계속 불러오므로 한 달에서 끊는다. */
html[data-sm-page][data-sm-folder][data-sm-past="month"] ytd-rich-grid-renderer ytd-continuation-item-renderer {
  display: none !important;
}
/* 카드를 숨기면 줄 첫 칸에만 주던 여백이 엉뚱한 카드에 남는다. */
html[data-sm-page]:is([data-sm-daily], [data-sm-folder]) ytd-rich-item-renderer[is-in-first-column] {
  margin-left: calc(var(--ytd-rich-grid-item-margin, 16px) / 2) !important;
}
#sm-filter-bar {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 2100;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 32px);
  padding: 8px 12px;
  overflow-x: auto;
  border: 1px solid var(--yt-spec-10-percent-layer, #ccc);
  border-radius: 999px;
  background: var(--yt-spec-base-background, #fff);
  color: var(--yt-spec-text-primary, #0f0f0f);
  box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
  font: 13px/1.4 Roboto, 'Malgun Gothic', sans-serif;
  white-space: nowrap;
}
#sm-filter-bar[hidden] {
  display: none;
}
#sm-filter-bar button {
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--yt-spec-badge-chip-background, rgb(0 0 0 / 6%));
  color: inherit;
  font: inherit;
  cursor: pointer;
}
#sm-filter-bar button[aria-pressed="true"] {
  background: var(--yt-spec-text-primary, #0f0f0f);
  color: var(--yt-spec-base-background, #fff);
}
#sm-filter-bar .sm-separator {
  width: 1px;
  height: 18px;
  background: var(--yt-spec-10-percent-layer, #ccc);
}
#sm-filter-bar .sm-count {
  color: var(--yt-spec-text-secondary, #606060);
}
`;

export async function initFilterBar() {
  // 선택은 저장하지 않는다. 페이지를 새로 열면 항상 데일리로 시작하고, 같은 탭에서 영상을 보고 돌아오는 동안에는 유지된다.
  let state: FilterState = { view: 'daily' };
  let folders = await foldersItem.getValue();

  const staticStyle = document.createElement('style');
  staticStyle.textContent = STATIC_CSS;
  const folderStyle = document.createElement('style');
  document.head.append(staticStyle, folderStyle);

  const bar = document.createElement('div');
  bar.id = 'sm-filter-bar';
  const count = document.createElement('span');
  count.className = 'sm-count';
  document.body.append(bar);

  const isDaily = () => state.view === 'daily';
  const selectedFolder = () => {
    const current = state;
    return current.view === 'folder' ? folders.find((folder) => folder.id === current.folderId) : undefined;
  };
  // 켜져 있는 것을 다시 누르면 꺼져서 YouTube 원래 화면이 된다.
  const select = (next: FilterState, active: boolean) => {
    state = active ? { view: 'off' } : next;
    apply();
  };

  // 확장을 다시 로드하면 이미 열려 있던 페이지의 이 스크립트는 확장과 연결이 끊겨 저장소·메시지를 쓸 수 없다.
  function act(action: () => unknown) {
    if (browser.runtime?.id) {
      action();
      return;
    }
    const notice = document.createElement('span');
    notice.textContent = '확장이 업데이트되었습니다.';
    bar.replaceChildren(notice, button('페이지 새로고침', null, () => location.reload()));
  }

  function apply() {
    const root = document.documentElement;
    const onPage = location.pathname === SUBSCRIPTIONS_PATH;
    const folder = selectedFolder();
    root.toggleAttribute('data-sm-page', onPage);
    root.toggleAttribute('data-sm-daily', isDaily());
    root.toggleAttribute('data-sm-folder', Boolean(folder));
    // 폴더에 없는 채널의 카드를 숨긴다. 채널을 알 수 없는 카드(광고 등)도 함께 숨겨진다.
    folderStyle.textContent = folder
      ? `html[data-sm-page] ytd-rich-item-renderer${folder.channelIds
          .map((id) => `:not([data-sm-channel="${id}"])`)
          .join('')} { display: none !important; }`
      : '';
    bar.hidden = !onPage;
    if (onPage) {
      renderBar();
      renderCount();
    }
  }

  function renderBar() {
    const folder = selectedFolder();
    bar.replaceChildren(
      button('데일리', isDaily(), () => select({ view: 'daily' }, isDaily())),
      ...folders.map((item) => {
        const active = item.id === folder?.id;
        return button(item.name, active, () => select({ view: 'folder', folderId: item.id }, active));
      }),
      separator(),
      count,
      button('폴더 관리', null, () => act(() => browser.runtime.sendMessage({ type: OPEN_DASHBOARD }))),
    );
  }

  function renderCount() {
    const folderIds = selectedFolder()?.channelIds;
    const hidden: Record<string, number> = {};
    let shown = 0;
    const tally = (reason: string | undefined) => {
      if (reason) hidden[reason] = (hidden[reason] ?? 0) + 1;
      else shown += 1;
    };
    for (const card of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
      const { smReason, smChannel } = card.dataset;
      if (folderIds && !folderIds.includes(smChannel ?? '')) tally('folder');
      else tally(isDaily() ? smReason : undefined);
    }
    if (isDaily()) {
      for (const section of document.querySelectorAll<HTMLElement>(`${SECTION_SELECTOR}[data-sm-reason]`)) {
        hidden[section.dataset.smReason!] = (hidden[section.dataset.smReason!] ?? 0) + 1;
      }
    }
    const details = Object.entries(hidden)
      .map(([reason, n]) => `${REASON_LABELS[reason] ?? '다른 폴더'} ${n}`)
      .join(' · ');
    count.textContent = details ? `표시 ${shown} · 숨김: ${details}` : `표시 ${shown}`;
  }

  foldersItem.watch((next) => {
    folders = next;
    apply();
  });
  // YouTube는 페이지를 새로 불러오지 않고 화면만 바꾼다.
  document.addEventListener('yt-navigate-finish', apply);
  document.addEventListener(SCANNED_EVENT, renderCount);
  apply();
}

function button(label: string, pressed: boolean | null, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (pressed !== null) element.setAttribute('aria-pressed', String(pressed));
  element.addEventListener('click', onClick);
  return element;
}

function separator(): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'sm-separator';
  return element;
}
