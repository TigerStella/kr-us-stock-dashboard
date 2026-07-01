// 서버 전용: Yahoo Finance crumb + cookie 획득/캐시.
// quoteSummary / fundamentals-timeseries 등 인증이 필요한 엔드포인트 호출에 사용.
// (chart 엔드포인트는 crumb 불필요)

export const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

let cache = { crumb: null, cookie: null, ts: 0 };
const TTL = 30 * 60 * 1000; // 30분
let inflight = null;

async function fetchCookie() {
  const sources = ["https://fc.yahoo.com", "https://finance.yahoo.com/"];
  for (const url of sources) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": YAHOO_UA }, redirect: "manual" });
      const sc = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
      if (sc && sc.length) return sc.map((c) => c.split(";")[0]).join("; ");
    } catch (e) {
      /* 다음 소스 시도 */
    }
  }
  return "";
}

async function refresh() {
  const cookie = await fetchCookie();
  const r = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": YAHOO_UA, ...(cookie ? { cookie } : {}) },
  });
  const crumb = (await r.text()).trim();
  if (!crumb || crumb.length > 24 || crumb.includes("<")) {
    throw new Error("crumb 획득 실패");
  }
  cache = { crumb, cookie, ts: Date.now() };
  return cache;
}

// 유효한 { crumb, cookie } 반환 (캐시 사용, 동시 요청은 1회로 합침)
export async function getYahooAuth(force = false) {
  const now = Date.now();
  if (!force && cache.crumb && now - cache.ts < TTL) return cache;
  if (inflight) return inflight;
  inflight = refresh().finally(() => { inflight = null; });
  return inflight;
}

// 인증이 필요한 GET 호출. 401/Unauthorized 시 crumb 강제 갱신 후 1회 재시도.
export async function yahooAuthedFetch(buildUrl) {
  let auth = await getYahooAuth();
  let res = await fetch(buildUrl(auth.crumb), {
    headers: { "User-Agent": YAHOO_UA, ...(auth.cookie ? { cookie: auth.cookie } : {}) },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    auth = await getYahooAuth(true);
    res = await fetch(buildUrl(auth.crumb), {
      headers: { "User-Agent": YAHOO_UA, ...(auth.cookie ? { cookie: auth.cookie } : {}) },
      cache: "no-store",
    });
  }
  return res;
}
