// 로그인된 youtube.com 세션으로 YouTube 내부(InnerTube) 데이터를 읽는 공통 도구.
// youtube.com 콘텐츠 스크립트에서만 호출할 수 있다.

// YouTube 내부 응답이라 스키마가 없다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface InnertubeConfig {
  loggedIn: boolean;
  context: Json;
  sessionIndex: string;
  delegatedSessionId?: string;
}

/** 페이지 HTML을 받아 첫 페이지 데이터와 연속 요청에 필요한 설정을 꺼낸다. */
export async function openBrowsePage(path: string): Promise<{ config: InnertubeConfig; initialData: Json }> {
  // 로그아웃 상태면 accounts.google.com으로 리다이렉트되어 fetch 자체가 실패한다.
  const res = await fetch(path, { credentials: 'include' }).catch(() => {
    throw new Error('YouTube 페이지를 불러오지 못했습니다. YouTube에 로그인되어 있는지 확인하세요.');
  });
  if (!res.ok) throw new Error(`YouTube 페이지 응답 오류 (${res.status})`);
  const html = await res.text();

  const config = readConfig(html);
  if (!config.loggedIn) throw new Error('YouTube에 로그인되어 있지 않습니다.');

  const initialData = extractJsonAfter(html, /ytInitialData"?\]?\s*=\s*/);
  if (!initialData) throw new Error('YouTube 페이지 데이터를 찾지 못했습니다.');
  return { config, initialData };
}

function readConfig(html: string): InnertubeConfig {
  return {
    loggedIn: /"LOGGED_IN":true/.test(html),
    context: extractJsonAfter(html, /"INNERTUBE_CONTEXT":/),
    sessionIndex: html.match(/"SESSION_INDEX":"(\d+)"/)?.[1] ?? '0',
    delegatedSessionId: html.match(/"DELEGATED_SESSION_ID":"([^"]+)"/)?.[1],
  };
}

export async function browseContinuation(config: InnertubeConfig, continuation: string): Promise<Json> {
  if (!config.context) throw new Error('YouTube 클라이언트 설정을 찾지 못했습니다.');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': location.origin,
    'X-Goog-AuthUser': config.sessionIndex,
    'X-Youtube-Client-Name': '1',
    'X-Youtube-Client-Version': config.context.client?.clientVersion ?? '',
  };
  const authorization = await authorizationHeader();
  if (authorization) headers.Authorization = authorization;
  if (config.delegatedSessionId) headers['X-Goog-PageId'] = config.delegatedSessionId;

  const res = await fetch('/youtubei/v1/browse?prettyPrint=false', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ context: config.context, continuation }),
  });
  if (!res.ok) throw new Error(`YouTube 다음 페이지 응답 오류 (${res.status})`);
  return res.json();
}

const AUTH_SCHEMES: [scheme: string, cookie: string][] = [
  ['SAPISIDHASH', 'SAPISID'],
  ['SAPISID1PHASH', '__Secure-1PAPISID'],
  ['SAPISID3PHASH', '__Secure-3PAPISID'],
];

async function authorizationHeader(): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const parts: string[] = [];
  for (const [scheme, cookie] of AUTH_SCHEMES) {
    const value = document.cookie.match(new RegExp(`(?:^|; )${cookie}=([^;]+)`))?.[1];
    if (!value) continue;
    const input = new TextEncoder().encode(`${timestamp} ${value} ${location.origin}`);
    const digest = await crypto.subtle.digest('SHA-1', input);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    parts.push(`${scheme} ${timestamp}_${hex}`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

/** marker 뒤에 오는 첫 JSON 객체를 중괄호 짝을 맞춰 잘라내 파싱한다. */
export function extractJsonAfter(text: string, marker: RegExp): Json {
  const match = marker.exec(text);
  if (!match) return null;
  const start = text.indexOf('{', match.index + match[0].length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** 트리에서 key에 해당하는 값을 문서 순서대로 모두 찾는다. 찾은 값 안으로는 더 들어가지 않는다. */
export function findAll(root: Json, key: string): Json[] {
  const found: Json[] = [];
  const visit = (node: Json) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [name, value] of Object.entries(node)) {
      if (name === key) found.push(value);
      else visit(value);
    }
  };
  visit(root);
  return found;
}

/** YouTube의 텍스트 객체(simpleText / runs / content)를 문자열로 만든다. */
export function textOf(node: Json): string {
  if (typeof node === 'string') return node;
  return (node?.simpleText ?? node?.runs?.map((run: Json) => run.text).join('') ?? node?.content ?? '').trim();
}
