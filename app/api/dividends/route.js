import { YAHOO_UA } from "../../lib/yahooCrumb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,15}$/;
const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

// chart 이벤트에서 실제 배당 이력 조회 (crumb 불필요)
async function fetchDivEvents(symbol) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&events=div`;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, { headers: { "User-Agent": YAHOO_UA }, cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const currency = result?.meta?.currency ?? null;
      const divs = result?.events?.dividends ?? {};
      const items = Object.values(divs)
        .filter((d) => d && typeof d.amount === "number" && typeof d.date === "number")
        .map((d) => ({ amount: d.amount, date: d.date }));
      return { currency, items };
    } catch (e) {
      /* 다음 호스트 */
    }
  }
  return null;
}

// 최근 12개월 배당으로 주당 연간배당(TTM) + 지급월 산출
function summarize(symbol, data) {
  if (!data || !data.items.length) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const yearAgo = nowSec - 370 * 24 * 3600; // 약간 여유
  const recent = data.items.filter((d) => d.date >= yearAgo);
  const use = recent.length ? recent : data.items.slice(-4); // 최근 12개월 없으면 마지막 4건
  const perShare = Math.round(use.reduce((s, d) => s + d.amount, 0) * 1e4) / 1e4;
  const monthsSet = new Set(use.map((d) => new Date(d.date * 1000).getUTCMonth() + 1));
  const months = Array.from(monthsSet).sort((a, b) => a - b);
  const isKR = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  return { perShare, months, currency: data.currency || (isKR ? "KRW" : "USD") };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("symbols");
  const symbols = (raw ? raw.split(",") : [])
    .map((s) => s.trim())
    .filter((s) => s && SYMBOL_RE.test(s));
  const uniq = Array.from(new Set(symbols)).slice(0, 120);

  const map = {};
  await mapLimit(uniq, 8, async (sym) => {
    const data = await fetchDivEvents(sym);
    const sum = summarize(sym, data);
    if (sum && sum.perShare > 0 && sum.months.length) map[sym] = sum;
  });

  return Response.json({ ok: true, map }, { headers: { "Cache-Control": "no-store" } });
}
