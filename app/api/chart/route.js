import { SYMBOL_MAP } from "../../symbols";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

// 허용 범위 -> Yahoo range/interval 매핑
const RANGES = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "30m" },
  "1mo": { range: "1mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1wk" },
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

  if (!symbol || !SYMBOL_MAP[symbol]) {
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

    return Response.json(
      {
        ok: true,
        symbol,
        name: SYMBOL_MAP[symbol].name,
        range: rangeKey,
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
