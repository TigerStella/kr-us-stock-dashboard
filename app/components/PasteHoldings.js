"use client";

import { useState } from "react";
import { parseHoldingsText } from "../lib/parseHoldings";
import { krw } from "../lib/format";

// 매수내역/현황 텍스트를 붙여넣어 종목·수량·매수금액을 인식하고 적용.
// market: "us"|"kr", known: [{ticker,name}], onApply(entries, mode)
export default function PasteHoldings({ market, known, onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [mode, setMode] = useState("add"); // add(매수추가) | set(현황덮어쓰기)

  const reset = () => { setText(""); setRows(null); };
  const close = () => { setOpen(false); reset(); };

  const recognize = () => {
    const parsed = parseHoldingsText(text, market, known);
    setRows(parsed.map((e) => ({ ...e, include: true })));
  };

  const apply = () => {
    const chosen = (rows || []).filter((r) => r.include && r.qty > 0);
    if (chosen.length) onApply(chosen.map(({ ticker, name, qty, amount }) => ({ ticker, name, qty, amount })), mode);
    close();
  };

  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const placeholder =
    "권장 형식: 종목명, 티커, 매수주식수, 매수금액 (한 줄에 하나)\n" +
    (market === "us"
      ? "예) 애플, AAPL, 5주, 1200000원\n   엔비디아, NVDA, 10주, 2000000원"
      : "예) KODEX 미국반도체, 390390, 3주, 157300원\n   SK하이닉스, 000660, 4주, 200000원") +
    "\n\n(매수 문자·현황 텍스트도 인식하지만 위 형식이 가장 정확합니다)";

  return (
    <>
      <button className="pastebtn" onClick={() => setOpen(true)}>📋 매수내역·현황 붙여넣기</button>

      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{market === "us" ? "미국" : "한국"} · 매수내역/현황 붙여넣기</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  종목·수량·매수금액만 추출합니다. (외부 전송 없음 · 미리보기에서 수정 후 적용)
                </div>
              </div>
              <button className="x" onClick={close}>닫기 ✕</button>
            </div>

            <div className="paste-mode">
              <span className="pm-label">적용 방식</span>
              <div className="sim-toggle">
                <button className={mode === "add" ? "active" : ""} onClick={() => setMode("add")}>매수 추가(누적)</button>
                <button className={mode === "set" ? "active" : ""} onClick={() => setMode("set")}>현황 덮어쓰기</button>
              </div>
            </div>

            <textarea
              className="paste-area"
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
            />

            <div className="paste-actions">
              <button className="addform-ok" onClick={recognize} disabled={!text.trim()}>인식</button>
              {rows ? <span className="paste-count">{rows.length}개 인식됨</span> : null}
            </div>

            {rows && (
              rows.length === 0 ? (
                <div className="empty-note">인식된 종목이 없습니다. "종목명, 티커, N주, 금액원" 형식으로 붙여넣어 주세요.</div>
              ) : (
                <div className="paste-table">
                  <div className="paste-head">
                    <span></span>
                    <span>종목</span>
                    <span>수량</span>
                    <span>매수금액</span>
                    <span>상태</span>
                  </div>
                  {rows.map((r, i) => (
                    <div className={`paste-row${r.include ? "" : " off"}`} key={r.ticker}>
                      <input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} />
                      <span className="pr-name">{r.name} <span className="pr-tk">({r.ticker})</span></span>
                      <input
                        className="pr-qty"
                        type="number"
                        step="any"
                        min="0"
                        value={r.qty}
                        onChange={(e) => { let v = parseFloat(e.target.value); if (!Number.isFinite(v) || v < 0) v = 0; setRow(i, { qty: v }); }}
                      />
                      <input
                        className="pr-amt"
                        type="number"
                        step="any"
                        min="0"
                        placeholder="-"
                        value={r.amount ?? ""}
                        onChange={(e) => { const raw = e.target.value; setRow(i, { amount: raw === "" ? null : Math.max(0, parseFloat(raw) || 0) }); }}
                      />
                      <span className={`pr-badge ${r.matched ? "held" : "new"}`}>{r.matched ? "보유" : "신규"}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="paste-footer">
              <button className="addform-cancel" onClick={close}>취소</button>
              <button className="addform-ok" onClick={apply} disabled={!rows || !rows.some((r) => r.include && r.qty > 0)}>
                {mode === "add" ? "매수 추가 적용" : "현황 적용"}
              </button>
            </div>
            <div className="footer-note" style={{ marginTop: 10 }}>
              {mode === "add"
                ? "매수 추가: 기존 보유 수량에 더하고 '매수일지'에 기록됩니다. 신규 종목은 직접 추가로 등록됩니다."
                : "현황 덮어쓰기: 보유 수량을 입력값으로 교체합니다. (매수일지 미기록)"}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
