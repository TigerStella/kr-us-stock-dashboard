"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMarginInfo } from "../lib/financials";
import { usd, krw, pct, pct1, dirClass } from "../lib/format";

// 시장별 하락 순위 계산: 52주 최고점 대비 하락폭 큰 순 TOP 10
function rankByDrawdown(holdings, quotes, market) {
  const out = [];
  const seen = new Set();
  for (const h of holdings) {
    if (h.market !== market) continue;
    if (seen.has(h.ticker)) continue;
    seen.add(h.ticker);
    const q = quotes[h.yahoo];
    if (!q?.ok || typeof q.fiftyTwoWeekHigh !== "number" || !q.fiftyTwoWeekHigh) continue;
    const dd = ((q.price - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100;
    out.push({ ticker: h.ticker, name: h.name, market, price: q.price, dd, dayPct: q.changePercent });
  }
  out.sort((a, b) => a.dd - b.dd);
  return out.slice(0, 10);
}

const TABS = [
  { key: "kr", label: "한국 TOP 10" },
  { key: "us", label: "미국 TOP 10" },
];

function OpCell({ v }) {
  if (typeof v !== "number") return <span className="dd-c-q flat">-</span>;
  return <span className={`dd-c-q ${dirClass(v)}`}>{pct1(v)}</span>;
}

export default function DrawdownPanel({ holdings, quotes }) {
  const [tab, setTab] = useState("kr");

  const krRows = useMemo(() => rankByDrawdown(holdings, quotes, "kr"), [holdings, quotes]);
  const usRows = useMemo(() => rankByDrawdown(holdings, quotes, "us"), [holdings, quotes]);
  const rows = tab === "kr" ? krRows : usRows;

  // 영업이익률 요약 fetch (최근분기·25/12·26E). 표시 종목이 바뀔 때만 조회.
  const [margins, setMargins] = useState({}); // key -> {recentQ, fy2025, fy2026E}
  const tickerKey = rows.map((r) => `${r.market}:${r.ticker}`).join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        rows.map(async (r) => {
          const key = `${r.market}:${r.ticker}`;
          const data = await fetchMarginInfo(r.market, r.ticker);
          return [key, data];
        })
      );
      if (!alive) return;
      setMargins((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey]);

  return (
    <aside className="side-col">
      <div className="dd-panel">
        <div className="dd-title">보유종목 하락 TOP 10</div>
        <div className="dd-sub">52주 최고점 대비 하락폭 기준 · 영업이익률(최근분기 · 25/12 · 26년 예상)</div>

        <div className="dd-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={t.key === tab ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="dd-empty">데이터 수신 대기 중…</div>
        ) : (
          <div className="dd-scroll">
            <div className="dd-table">
              <div className="dd-head">
                <span className="dd-c-name">종목</span>
                <span className="dd-c-price">현재가</span>
                <span className="dd-c-pct">최고점비</span>
                <span className="dd-c-pct">전일비</span>
                <span className="dd-c-q">최근분기</span>
                <span className="dd-c-q">25/12</span>
                <span className="dd-c-q">26E</span>
              </div>
              {rows.map((r, i) => {
                const mg = margins[`${r.market}:${r.ticker}`];
                return (
                  <div className="dd-row" key={r.market + r.ticker}>
                    <span className="dd-c-name">
                      <span className="dd-rank">{i + 1}</span>
                      <span className="dd-names">
                        <span className="dd-nm">{r.name}</span>
                        <span className="dd-tk">({r.ticker})</span>
                      </span>
                    </span>
                    <span className="dd-c-price">{r.market === "kr" ? krw(r.price) : usd(r.price)}</span>
                    <span className={`dd-c-pct ${dirClass(r.dd)}`}>{pct(r.dd)}</span>
                    <span className={`dd-c-pct ${dirClass(r.dayPct)}`}>{pct(r.dayPct)}</span>
                    <OpCell v={mg?.recentQ} />
                    <OpCell v={mg?.fy2025} />
                    <OpCell v={mg?.fy2026E} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
