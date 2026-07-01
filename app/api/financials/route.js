import { yahooAuthedFetch } from "../../lib/yahooCrumb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,15}$/;

const TYPES = [
  "annualTotalRevenue",
  "annualOperatingIncome",
  "annualNetIncome",
  "quarterlyTotalRevenue",
  "quarterlyOperatingIncome",
  "quarterlyNetIncome",
].join(",");

// series 배열을 asOfDate -> raw 값 맵으로
function toMap(series, type) {
  const s = series.find((x) => x?.meta?.type?.[0] === type);
  const out = new Map();
  if (!s || !Array.isArray(s[type])) return out;
  for (const it of s[type]) {
    if (it && it.asOfDate != null && it.reportedValue && typeof it.reportedValue.raw === "number") {
      out.set(it.asOfDate, it.reportedValue.raw);
    }
  }
  return out;
}

const pctOf = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : null);

function periodLabel(dateStr) {
  const [y, m] = dateStr.split("-");
  return `${y}/${m}`;
}
function quarterLabel(dateStr) {
  const [y, m] = dateStr.split("-").map((v) => parseInt(v, 10));
  const q = Math.ceil(m / 3);
  return `${y} ${q}Q`;
}

export async function GET(request) {
  const symbol = new URL(request.url).searchParams.get("symbol");
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return Response.json({ ok: false, error: "알 수 없는 심볼" }, { status: 400 });
  }
  const isKR = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  const unit = isKR ? "억원" : "억달러";
  const currency = isKR ? "KRW" : "USD";
  const DIV = 1e8; // 억 단위

  try {
    const p2 = Math.floor(Date.now() / 1000);
    const p1 = p2 - 6 * 365 * 24 * 3600;
    const res = await yahooAuthedFetch(
      (crumb) =>
        `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
        `?symbol=${encodeURIComponent(symbol)}&type=${TYPES}&period1=${p1}&period2=${p2}&crumb=${encodeURIComponent(crumb)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const series = json?.timeseries?.result ?? [];

    const aRev = toMap(series, "annualTotalRevenue");
    const aOp = toMap(series, "annualOperatingIncome");
    const aNi = toMap(series, "annualNetIncome");
    const qRev = toMap(series, "quarterlyTotalRevenue");
    const qOp = toMap(series, "quarterlyOperatingIncome");

    // 연간: 매출이 있는 기간만, 오름차순 → 최근 4개
    const annual = Array.from(aRev.keys())
      .sort()
      .map((d) => {
        const rev = aRev.get(d);
        const op = aOp.get(d);
        const ni = aNi.get(d);
        if (typeof rev !== "number") return null;
        return {
          period: periodLabel(d),
          revenue: Math.round(rev / DIV),
          opMargin: typeof op === "number" ? pctOf(op, rev) : null,
          netMargin: typeof ni === "number" ? pctOf(ni, rev) : null,
        };
      })
      .filter(Boolean)
      .slice(-4);

    // 분기 영업이익률: 최신순 → 최근 4개
    const quarters = Array.from(qRev.keys())
      .sort()
      .reverse()
      .map((d) => {
        const rev = qRev.get(d);
        const op = qOp.get(d);
        if (typeof rev !== "number" || typeof op !== "number") return null;
        return { q: quarterLabel(d), opMargin: pctOf(op, rev) };
      })
      .filter(Boolean)
      .slice(0, 4);

    const ok = annual.length > 0 || quarters.length > 0;
    return Response.json(
      { ok, symbol, unit, currency, annual, quarters },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return Response.json(
      { ok: false, symbol, error: String(err?.message ?? err), unit, currency, annual: [], quarters: [] },
      { status: 200 } // 클라이언트가 mock 폴백할 수 있게 200으로
    );
  }
}
