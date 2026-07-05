"use client";

import { useMemo, useRef, useState } from "react";

// 주식앱처럼 검색 가능한 종목 선택. options: [{ticker,name}], value:{ticker,name}, onChange({ticker,name})
export default function StockSearch({ options, value, onChange, placeholder = "종목명 또는 티커 검색" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const norm = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
  const results = useMemo(() => {
    const nq = norm(q);
    if (!nq) return options.slice(0, 30);
    return options
      .filter((o) => norm(o.name).includes(nq) || norm(o.ticker).includes(nq))
      .slice(0, 30);
  }, [q, options]);

  const pick = (o) => { onChange(o); setQ(""); setOpen(false); };
  const useTyped = () => {
    const t = q.trim();
    if (!t) return;
    const up = t.toUpperCase();
    const hit = options.find((o) => o.ticker.toUpperCase() === up || norm(o.name) === norm(t));
    onChange(hit || { ticker: up, name: t });
    setQ("");
    setOpen(false);
  };

  return (
    <div className="stocksearch" ref={wrapRef}>
      <div className="ss-value" onClick={() => setOpen((v) => !v)}>
        {value ? (
          <span className="ss-picked">{value.name} <span className="ss-tk">({value.ticker})</span></span>
        ) : (
          <span className="ss-ph">종목 선택</span>
        )}
        <span className="ss-caret">▾</span>
      </div>
      {open && (
        <div className="ss-pop">
          <input
            className="ss-input"
            autoFocus
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") useTyped(); if (e.key === "Escape") setOpen(false); }}
          />
          <div className="ss-list">
            {results.length === 0 ? (
              <div className="ss-empty" onClick={useTyped}>"{q}" 새 종목으로 사용</div>
            ) : (
              results.map((o) => (
                <div className="ss-item" key={o.ticker} onClick={() => pick(o)}>
                  <span className="ss-item-nm">{o.name}</span>
                  <span className="ss-item-tk">{o.ticker}</span>
                </div>
              ))
            )}
            {q.trim() && results.length > 0 ? (
              <div className="ss-item ss-use" onClick={useTyped}>＋ "{q}" 직접 입력으로 사용</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
