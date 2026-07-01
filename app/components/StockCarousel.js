"use client";

import { memo, useRef, useState } from "react";
import StockChartSlide from "./StockChartSlide";
import IncomeStatementChart from "./IncomeStatementChart";

const SLIDES = [
  { key: "price", label: "가격·지표" },
  { key: "income", label: "손익계산서" },
];

function StockCarousel({ target }) {
  const [idx, setIdx] = useState(0);
  const touch = useRef({ x: 0, active: false });

  const go = (n) => setIdx((p) => Math.max(0, Math.min(SLIDES.length - 1, n)));

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, active: true };
  };
  const onTouchEnd = (e) => {
    if (!touch.current.active) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    touch.current.active = false;
    if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="carousel">
      <div className="carousel-tabs">
        {SLIDES.map((s, i) => (
          <button key={s.key} className={i === idx ? "active" : ""} onClick={() => go(i)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="carousel-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="carousel-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          <div className="carousel-slide">
            {/* 항상 마운트하면 두 차트가 동시에 패칭됨 → 현재 슬라이드만 렌더해도 되지만,
                전환 애니메이션을 위해 둘 다 마운트. 가격 슬라이드는 항상 필요. */}
            <StockChartSlide symbol={target.symbol} />
          </div>
          <div className="carousel-slide">
            <IncomeStatementChart market={target.market} ticker={target.ticker} name={target.name} />
          </div>
        </div>
      </div>

      <div className="carousel-nav">
        <button className="cnav" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="이전">◀</button>
        <div className="dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              className={`dot${i === idx ? " on" : ""}`}
              onClick={() => go(i)}
              aria-label={`${i + 1}번 슬라이드`}
            />
          ))}
        </div>
        <button className="cnav" onClick={() => go(idx + 1)} disabled={idx === SLIDES.length - 1} aria-label="다음">▶</button>
      </div>
    </div>
  );
}

// target 이 referentially 안정적이면(종목 미변경) 재렌더하지 않음 → 시세 폴링 시 차트 정지
export default memo(StockCarousel);
