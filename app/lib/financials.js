// 재무 데이터 fetch 레이어.
// 1차: 서버 API(/api/financials, /api/dividends) → Yahoo 실데이터
// 2차(폴백): 로컬 mock JSON (API 실패/미커버 종목)
// async 시그니처 유지 → 호출부 변경 없이 소스 교체 가능.

import { yahooSymbol } from "../portfolios";
import incomeMock from "../data/financials.mock.json";
import quarterlyMock from "../data/quarterly-margins.mock.json";
import dividendMock from "../data/dividends.mock.json";

// ── 손익/분기 (심볼 단위 캐시 + in-flight 합침) ──
const finCache = new Map(); // yahoo -> { ts, data }
const finInflight = new Map();
const FIN_TTL = 10 * 60 * 1000;

async function getFinancials(yahoo) {
  const hit = finCache.get(yahoo);
  if (hit && Date.now() - hit.ts < FIN_TTL) return hit.data;
  if (finInflight.has(yahoo)) return finInflight.get(yahoo);
  const p = (async () => {
    try {
      const res = await fetch(`/api/financials?symbol=${encodeURIComponent(yahoo)}`, { cache: "no-store" });
      const j = await res.json();
      finCache.set(yahoo, { ts: Date.now(), data: j });
      return j;
    } catch (e) {
      return { ok: false, annual: [], quarters: [] };
    } finally {
      finInflight.delete(yahoo);
    }
  })();
  finInflight.set(yahoo, p);
  return p;
}

// 연간 손익계산서. { ok, unit, annual:[{period, revenue, opMargin, netMargin}] }
export async function fetchIncomeStatement(market, ticker) {
  const data = await getFinancials(yahooSymbol(market, ticker));
  if (data?.ok && Array.isArray(data.annual) && data.annual.length) {
    return { ok: true, unit: data.unit || "", annual: data.annual, source: "live" };
  }
  // 폴백: mock
  const m = incomeMock[ticker];
  if (m && Array.isArray(m.annual) && m.annual.length) {
    return { ok: true, unit: m.unit || "", annual: m.annual, source: "mock" };
  }
  return { ok: false, unit: "", annual: [] };
}

// 최근 3개 분기 영업이익률(%). [{q, opMargin}, ...] (최신순) 또는 null.
export async function fetchQuarterlyMargins(market, ticker) {
  const data = await getFinancials(yahooSymbol(market, ticker));
  if (data?.ok && Array.isArray(data.quarters) && data.quarters.length) {
    return data.quarters.slice(0, 3);
  }
  const m = quarterlyMock[ticker];
  return Array.isArray(m) && m.length ? m.slice(0, 3) : null;
}

// 하락 TOP10 표시용 영업이익률 요약: { recentQ, recentQLabel, fy2025, fy2026E }
// - recentQ: 최근 분기 영업이익률
// - fy2025: 손익계산서 2025 연간 영업이익률
// - fy2026E: 2026년 실적 분기 평균(YTD), 없으면 최근 분기값 (실데이터 기반 추정)
const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null);
export async function fetchMarginInfo(market, ticker) {
  const data = await getFinancials(yahooSymbol(market, ticker));
  let quarters = data?.ok && Array.isArray(data.quarters) ? data.quarters : null;
  let annual = data?.ok && Array.isArray(data.annual) ? data.annual : null;
  // 폴백(mock)
  if (!quarters || !quarters.length) {
    const m = quarterlyMock[ticker];
    quarters = Array.isArray(m) ? m : [];
  }
  if (!annual || !annual.length) {
    const im = incomeMock[ticker];
    annual = im && Array.isArray(im.annual) ? im.annual : [];
  }
  const recentQ = quarters[0] && typeof quarters[0].opMargin === "number" ? quarters[0].opMargin : null;
  const recentQLabel = quarters[0]?.q ?? null;
  const y2025 = annual.find((a) => (a.period || "").startsWith("2025"));
  const fy2025 = y2025 && typeof y2025.opMargin === "number" ? y2025.opMargin : null;
  const q2026 = quarters.filter((q) => (q.q || "").startsWith("2026") && typeof q.opMargin === "number").map((q) => q.opMargin);
  const fy2026E = q2026.length ? avg(q2026) : recentQ;
  return { recentQ, recentQLabel, fy2025, fy2026E };
}

// ── 배당 (여러 심볼 배치) ──
// yahooSymbols: ["AAPL","005930.KS",...] → { [yahoo]: { perShare, months, currency } }
export async function fetchDividendMap(yahooSymbols) {
  const uniq = Array.from(new Set(yahooSymbols.filter(Boolean)));
  const map = {};
  if (!uniq.length) return map;
  try {
    const res = await fetch(`/api/dividends?symbols=${encodeURIComponent(uniq.join(","))}`, { cache: "no-store" });
    const j = await res.json();
    if (j?.map) Object.assign(map, j.map);
  } catch (e) {
    /* 아래에서 mock 폴백 */
  }
  // 폴백: API에 없는 심볼은 mock(티커 기준)으로 보완
  for (const y of uniq) {
    if (map[y]) continue;
    const ticker = y.replace(/\.(KS|KQ)$/i, "");
    const d = dividendMock[ticker];
    if (d && typeof d.perShare === "number" && Array.isArray(d.months) && d.months.length) {
      map[y] = { perShare: d.perShare, months: d.months, currency: d.currency, source: "mock" };
    }
  }
  return map;
}
