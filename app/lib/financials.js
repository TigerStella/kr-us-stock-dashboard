// 재무 데이터 fetch 레이어 (현재는 mock JSON, 추후 실제 API 소스로 교체).
// async 시그니처를 유지해 호출부 변경 없이 소스만 교체할 수 있게 한다.

import incomeMock from "../data/financials.mock.json";
import quarterlyMock from "../data/quarterly-margins.mock.json";
import dividendMock from "../data/dividends.mock.json";

// 연간 손익계산서. { ok, unit, annual:[{period, revenue, opMargin, netMargin}] }
// market: "us" | "kr" — KR 종목은 6자리 코드로 조회.
export async function fetchIncomeStatement(market, ticker) {
  const data = incomeMock[ticker];
  if (data && Array.isArray(data.annual) && data.annual.length) {
    return { ok: true, unit: data.unit || "", annual: data.annual };
  }
  return { ok: false, unit: "", annual: [] };
}

// 최근 3개 분기 영업이익률(%). [{q, opMargin}, ...] (최신순) 또는 null.
export async function fetchQuarterlyMargins(market, ticker) {
  const arr = quarterlyMock[ticker];
  return Array.isArray(arr) && arr.length ? arr.slice(0, 3) : null;
}

// 배당 정보. { perShare, currency, months:[1~12] } 또는 null.
export async function fetchDividend(market, ticker) {
  const d = dividendMock[ticker];
  if (d && typeof d.perShare === "number" && Array.isArray(d.months) && d.months.length) {
    return { perShare: d.perShare, currency: d.currency || (market === "kr" ? "KRW" : "USD"), months: d.months };
  }
  return null;
}

// 동기 조회판 (이미 import된 mock에서 즉시 계산용 — 합산 그래프에서 사용).
export function getDividendSync(ticker) {
  const d = dividendMock[ticker];
  if (d && typeof d.perShare === "number" && Array.isArray(d.months) && d.months.length) {
    return { perShare: d.perShare, currency: d.currency, months: d.months };
  }
  return null;
}
