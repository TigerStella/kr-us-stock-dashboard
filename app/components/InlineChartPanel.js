"use client";

import { useMemo } from "react";
import StockCarousel from "./StockCarousel";
import { usd, krw, pct, signNum, dirClass, arrow } from "../lib/format";

// 상시 노출 차트 패널: 종목 선택 드롭다운 + 캐러셀(가격·지표 / 손익계산서)
export default function InlineChartPanel({ options, selected, onSelect, quotes }) {
  const sel = selected || options[0];
  const q = sel ? quotes[sel.yahoo] : null;
  const ccy = q?.currency;
  // 차트 target은 종목이 바뀔 때만 새로 만든다 → 30초 시세 폴링 시 차트 재렌더 방지
  // (가격 라인은 아래에서 별도로 라이브 갱신)
  const target = useMemo(
    () => (sel ? { symbol: sel.yahoo, market: sel.market, ticker: sel.ticker, name: sel.name, currency: ccy } : null),
    [sel?.yahoo, sel?.market, sel?.ticker, sel?.name, ccy]
  );

  if (!sel) {
    return (
      <div className="chart-panel">
        <div className="cp-title">종목 차트</div>
        <div className="chart-msg">표시할 종목이 없습니다</div>
      </div>
    );
  }
  const isKR = sel.market === "kr";
  const dc = dirClass(q?.change);

  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <div className="cp-title">
          종목 차트 <span className="cp-accent">{sel.name} ({sel.ticker})</span>
        </div>
        <div className="cp-select">
          <label>종목 선택</label>
          <select
            value={sel.yahoo}
            onChange={(e) => {
              const next = options.find((o) => o.yahoo === e.target.value);
              if (next) onSelect(next);
            }}
          >
            <optgroup label="미국">
              {options.filter((o) => o.market === "us").map((o) => (
                <option key={o.yahoo} value={o.yahoo}>{o.name} ({o.ticker})</option>
              ))}
            </optgroup>
            <optgroup label="한국">
              {options.filter((o) => o.market === "kr").map((o) => (
                <option key={o.yahoo} value={o.yahoo}>{o.name} ({o.ticker})</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {q?.ok ? (
        <div className={`cp-quote ${dc}`}>
          <b>{isKR ? krw(q.price) : usd(q.price)}</b> &nbsp; {arrow(q.change)} {signNum(q.change, isKR ? 0 : 2)} ({pct(q.changePercent)})
        </div>
      ) : (
        <div className="cp-quote flat">시세 대기 중…</div>
      )}

      <StockCarousel target={target} />
    </div>
  );
}
