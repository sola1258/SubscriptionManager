// 구독 페이지 필터에서 두 콘텐츠 스크립트가 공유하는 약속.
//
// 페이지 쪽 스크립트(MAIN world)는 YouTube가 카드 요소에 붙여둔 데이터를 읽어 카드에 속성을 단다.
//   data-sm-channel  채널 ID
//   data-sm-age      게시 후 지난 일수 (모르면 빈 문자열)
//   data-sm-reason   데일리 필터가 숨길 이유 (live | old | watched | shorts). 보여줄 카드에는 없다.
// 그리고 <html>에 data-sm-past(week | month)로 피드를 어디까지 불러왔는지 표시한다.
//
// 확장 쪽 스크립트(isolated world)는 필터 막대에서 고른 보기에 따라 <html>에 data-sm-page / data-sm-daily / data-sm-folder를
// 켜고 끄며, 실제로 숨기는 일은 CSS가 한다.

export const SUBSCRIPTIONS_PATH = '/feed/subscriptions';

/** 페이지 쪽 스크립트가 카드 속성을 갱신할 때마다 document에 발생시키는 이벤트 */
export const SCANNED_EVENT = 'sm:scanned';

/** 지금 보이는 페이지의 영상 카드 */
export const CARD_SELECTOR = 'ytd-browse:not([hidden]) ytd-rich-item-renderer';

/** Shorts 선반 같은 묶음 */
export const SECTION_SELECTOR = 'ytd-browse:not([hidden]) ytd-rich-section-renderer';

/** 폴더 보기에서 자동으로 불러오는 기간 한도 */
export const FOLDER_MAX_AGE_DAYS = 30;

/**
 * 필터 막대에서 고른 보기. 한 번에 하나만 켜진다.
 * - daily: 구독 채널 전체에 데일리 필터를 건다.
 * - folder: 그 폴더의 채널만 남기고, 그 외에는 YouTube가 보여주는 그대로 둔다.
 * - off: 아무것도 숨기지 않는다.
 */
export type FilterState = { view: 'daily' } | { view: 'off' } | { view: 'folder'; folderId: string };
