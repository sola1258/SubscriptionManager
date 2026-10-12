# Subscription Manager

YouTube 구독 페이지를 보기 좋게 걸러주는 Edge 확장프로그램입니다.
볼 만한 영상만 남기는 **데일리 필터**와, 구독 채널을 나눠 보는 **폴더**를 YouTube 구독 페이지 안에서 바로 씁니다.

개인용으로 만든 확장이며 스토어에는 올리지 않았습니다. 직접 빌드해서 개발자 모드로 설치합니다.

## 기능

구독 페이지(`youtube.com/feed/subscriptions`) 아래쪽에 필터 막대가 뜹니다. 한 번에 하나만 켤 수 있고, 켜진 것을 다시 누르면 YouTube 원래 화면으로 돌아갑니다.

### 데일리 (기본값)

구독 채널 전체에서 다음을 숨깁니다.

- 라이브 중, 공개 예정, 끝난 라이브의 다시보기
- Shorts
- 50% 이상 본 영상
- 올라온 지 7일이 지난 영상

YouTube의 "⋯" 메뉴는 그대로라서, 보고 싶지 않은 영상은 평소처럼 "숨기기"로 지우면 됩니다.

### 폴더

폴더를 고르면 그 폴더에 넣은 채널의 영상만 남습니다. 데일리 필터는 적용되지 않습니다.

- 한 채널은 한 폴더에만 넣을 수 있습니다.
- Shorts 선반은 채널별로 거를 수 없어서 숨깁니다.
- 최근 한 달 영상까지만 자동으로 불러옵니다.

### 폴더 관리

필터 막대의 `폴더 관리`를 누르면 관리 화면이 열립니다.

- 구독 채널 목록 동기화
- 폴더 만들기, 이름 변경, 삭제
- 채널을 폴더에 배정, 채널 검색
- 폴더별 최신 영상 보기 (채널별 RSS 기준, Shorts 제외)

## 설치

Node.js가 필요합니다.

```bash
npm install
npm run build
```

1. Edge에서 `edge://extensions`를 엽니다.
2. **개발자 모드**를 켭니다.
3. **압축 풀린 파일 로드**를 눌러 `.output/edge-mv3` 폴더를 선택합니다.
4. YouTube에 로그인한 상태에서 툴바의 확장 아이콘을 누르면 구독 페이지가 열립니다.

코드를 고친 뒤에는 다시 빌드하고, `edge://extensions`에서 확장을 새로고침한 다음 YouTube 탭도 새로고침합니다.

## 개발

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 모드 빌드 (파일이 바뀌면 다시 빌드) |
| `npm run build` | Edge용 빌드 → `.output/edge-mv3` |
| `npm run compile` | 타입 검사 |
| `npm test` | 단위 테스트 |

[WXT](https://wxt.dev) + TypeScript + React, Manifest V3.

```
entrypoints/
  background.ts             아이콘 클릭 처리, 관리 화면 열기
  youtube.content.ts        필터 막대, 구독 목록 수집
  youtube-main.content.ts   YouTube 카드 데이터를 읽어 카드에 표시를 붙임
  dashboard/                폴더 관리 화면
lib/
  daily.ts                  데일리 필터 조건
  filterBar.ts              필터 막대와 숨김 CSS
  folders.ts                폴더 조작
  youtube/                  YouTube 데이터 해석 (구독 목록, 구독 피드, RSS)
assets/icon.svg             아이콘 원본
```

### 동작 방식

YouTube는 구독 페이지의 각 영상 카드 요소에 원본 데이터(길이, 시청 진행률, 게시 문구 등)를 붙여둡니다.
페이지 쪽 스크립트가 이 데이터를 읽어 카드에 `data-sm-*` 속성을 달고, 필터 막대에서 고른 보기에 따라 CSS로 숨깁니다.
필터는 이미 화면에 있는 데이터만 쓰고 영상 목록을 따로 받아오지 않습니다.
(관리 화면의 구독 목록 동기화와 폴더별 최신 영상 보기는 YouTube에 요청을 보냅니다.)

## 알아둘 점

- YouTube의 내부 데이터 구조에 의존합니다. YouTube가 화면 구조를 바꾸면 필터가 동작하지 않을 수 있습니다.
- 게시 시각은 "3일 전" 같은 문구로 추정합니다. YouTube 표시 언어가 한국어나 영어가 아니면 기간 필터가 동작하지 않습니다.
- 폴더와 채널 목록은 브라우저 안(`chrome.storage.local`)에만 저장됩니다. 확장을 제거하면 함께 지워집니다.
- 필요한 권한은 `storage`, `unlimitedStorage`, 그리고 `youtube.com` 접근입니다. 데이터를 외부로 보내지 않습니다.

## 라이선스

[MIT](LICENSE)

YouTube는 Google LLC의 상표이며, 이 프로젝트는 Google이나 YouTube와 관련이 없습니다.
