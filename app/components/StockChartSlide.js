"use client";

import { useEffect, useMemo, useState } from "react";
import PriceChart from "./PriceChart";
import RsiChart from "./RsiChart";
import { movingAverages, bollingerBands, rsi } from "../lib/indicators";

const RANGES = [
  { key: "6mo", label: "6개월" },
  { key: "1y", label: "1년" },
  { key: "2y", label: "2년" },
];

function fmtLabel(ts) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear().toString().slice(2)}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function StockChartSlide({ symbol }) {
  const [range, setRange] = useState("1y");
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) setState({ loading: false, error: j.error || "불러오기 실패", data: null });
        else setState({ loading: false, error: null, data: j });
      })
      .catch((e) => alive && setState({ loading: false, error: String(e), data: null }));
    return () => {
      alive = false;
    };
  }, [symbol, range]);

  const points = state.data?.points;

  // 파생지표는 클라이언트에서 계산 + 메모이즈
  const series = useMemo(() => {
    if (!points || points.length === 0) return null;
    const closes = points.map((p) => p.c);
    const ma = movingAverages(closes, [20, 60, 120]);
    const bb = bollingerBands(closes, 20, 2);
    const rsiArr = rsi(closes, 14);
    return points.map((p, i) => ({
      label: fmtLabel(p.t),
      o: p.o,
      h: p.h,
      l: p.l,
      c: p.c,
      range: [p.l, p.h],
      ma20: ma[20][i],
      ma60: ma[60][i],
      ma120: ma[120][i],
      bbMid: bb.middle[i],
      bbUp: bb.upper[i],
      bbLow: bb.lower[i],
      rsi: rsiArr[i],
    }));
  }, [points]);

  // y축 도메인: 캔들 저/고 + 볼린저밴드까지 포함 (밴드 잘림 방지)
  const yDomain = useMemo(() => {
    if (!series) return ["auto", "auto"];
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of series) {
      if (d.l != null) lo = Math.min(lo, d.l);
      if (d.h != null) hi = Math.max(hi, d.h);
      if (d.bbLow != null) lo = Math.min(lo, d.bbLow);
      if (d.bbUp != null) hi = Math.max(hi, d.bbUp);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return ["auto", "auto"];
    const pad = (hi - lo) * 0.04 || 1;
    return [lo - pad, hi + pad];
  }, [series]);

  return (
    <div className="slide">
      <div className="slide-head">
        <span className="slide-title">가격 · 이동평균 · 볼린저밴드 · RSI</span>
        <div className="ranges">
          {RANGES.map((r) => (
            <button key={r.key} className={r.key === range ? "active" : ""} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state.loading ? (
        <div className="chart-msg">차트 불러오는 중…</div>
      ) : state.error ? (
        <div className="chart-msg">데이터 없음 · {state.error}</div>
      ) : !series || series.length < 2 ? (
        <div className="chart-msg">표시할 데이터가 부족합니다</div>
      ) : (
        <>
          <PriceChart data={series} currency={state.data.currency} yDomain={yDomain} />
          <RsiChart data={series} />
        </>
      )}
    </div>
  );
}
