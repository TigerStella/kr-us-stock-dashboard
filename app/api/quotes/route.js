import { SYMBOLS } from "../../symbols";

// 항상 실시간으로 가져오고 캐시하지 않음
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Yahoo Finance v8 chart 엔드포인트는 키 없이 호출 가능.
// query1이 일시적으로 throttle(404/429)되면 query2로 폴백.
const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

async function fetchYahoo(symbol) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  let lastErr;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("요청 실패");
}

// 카드 하단 미니 그래프용으로 종가 시계열을 최대 N개로 다운샘플
function downsample(arr, max) {
  const clean = arr.filter((c) => typeof c === "number" && Number.isFinite(c));
  if (clean.length <= max) return clean;
  const step = clean.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(clean[Math.floor(i * step)]);
  out.push(clean[clean.length - 1]);
  return out;
}

// 현재가=meta.regularMarketPrice, 전일종가=meta.chartPreviousClose 로 등락 계산.
async function fetchQuote(def) {
  try {
    const json = await fetchYahoo(def.symbol);
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice;
    const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;

    if (typeof price !== "number" || typeof prevClose !== "number") {
      throw new Error("가격 데이터 없음");
    }

    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const spark = downsample(closes, 48);

    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : null;

    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      ok: true,
      price,
      prevClose,
      change,
      changePercent,
      currency: meta?.currency ?? null,
      marketState: meta?.marketState ?? null,
      spark,
    };
  } catch (err) {
    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      ok: false,
      error: String(err?.message ?? err),
    };
  }
}

export async function GET() {
  const quotes = await Promise.all(SYMBOLS.map(fetchQuote));
  return Response.json(
    { updatedAt: new Date().toISOString(), quotes },
    { headers: { "Cache-Control": "no-store" } }
  );
}
