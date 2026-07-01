export const dynamic = "force-dynamic";
export const revalidate = 0;

// 허용 심볼 형식 (티커/지수/환율/한국코드.KS). 외부 입력 방어용 화이트리스트 패턴.
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,15}$/;

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

// 허용 범위 -> Yahoo range/interval 매핑. daily=일봉(파생지표 계산용).
// 파생지표(MA/BB/RSI)는 클라이언트에서 OHLC로 계산하므로 서버는 OHLC만 반환.
const RANGES = {
  "1d": { range: "1d", interval: "5m", daily: false },
  "5d": { range: "5d", interval: "30m", daily: false },
  "1mo": { range: "1mo", interval: "1d", daily: true },
  "6mo": { range: "6mo", interval: "1d", daily: true },
  "1y": { range: "1y", interval: "1d", daily: true },
  "2y": { range: "2y", interval: "1d", daily: true },
};

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
    const q = result?.indicators?.quote?.[0] ?? {};
    const opens = q.open ?? [];
    const highs = q.high ?? [];
    const lows = q.low ?? [];
    const closes = q.close ?? [];

    // OHLC 모두 유효한 점만 남김 (휴장/결측 구간 제거)
    const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = num(closes[i]);
      if (c == null) continue;
      // open/high/low 결측 시 close 로 보정 (캔들 렌더 안정성)
      const o = num(opens[i]) ?? c;
      const h = num(highs[i]) ?? Math.max(o, c);
      const l = num(lows[i]) ?? Math.min(o, c);
      points.push({ t: timestamps[i], o, h, l, c });
    }

    if (points.length === 0) throw new Error("차트 데이터 없음");

    return Response.json(
      {
        ok: true,
        symbol,
        range: rangeKey,
        daily: cfg.daily,
        currency: result?.meta?.currency ?? null,
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
