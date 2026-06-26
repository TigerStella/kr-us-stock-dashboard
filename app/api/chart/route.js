export const dynamic = "force-dynamic";
export const revalidate = 0;

// 허용 심볼 형식 (티커/지수/환율/한국코드.KS). 외부 입력 방어용 화이트리스트 패턴.
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,15}$/;

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

// 허용 범위 -> Yahoo range/interval 매핑. (daily=일봉이면 MA50 산출)
const RANGES = {
  "1d": { range: "1d", interval: "5m", daily: false },
  "5d": { range: "5d", interval: "30m", daily: false },
  "1mo": { range: "1mo", interval: "1d", daily: true },
  "6mo": { range: "6mo", interval: "1d", daily: true },
  "1y": { range: "1y", interval: "1d", daily: true },
};

const MA_PERIOD = 50;

// 일별 종가 배열로 50일 단순이동평균. 데이터 부족 구간(앞 49개)은 null.
function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

async function fetchYahoo(symbol, cfg) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}`;
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const rangeKey = searchParams.get("range") || "1mo";

  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return Response.json({ ok: false, error: "알 수 없는 심볼" }, { status: 400 });
  }
  const cfg = RANGES[rangeKey] || RANGES["1mo"];

  try {
    const json = await fetchYahoo(symbol, cfg);
    const result = json?.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    // null 값(휴장 구간) 정리: timestamp와 close가 모두 유효한 점만 남김
    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        points.push({ t: timestamps[i], c });
      }
    }

    if (points.length === 0) throw new Error("차트 데이터 없음");

    // 일봉 범위면 50일 이동평균(MA50)을 각 점에 부착 (m: 값 또는 null)
    if (cfg.daily) {
      const ma = sma(points.map((p) => p.c), MA_PERIOD);
      for (let i = 0; i < points.length; i++) points[i].m = ma[i];
    }

    return Response.json(
      {
        ok: true,
        symbol,
        range: rangeKey,
        currency: result?.meta?.currency ?? null,
        maPeriod: cfg.daily ? MA_PERIOD : null,
        points,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return Response.json(
      { ok: false, symbol, error: String(err?.message ?? err) },
      { status: 502 }
    );
  }
}
