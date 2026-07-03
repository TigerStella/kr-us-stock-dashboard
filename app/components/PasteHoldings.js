"use client";

import { useState } from "react";
import { parseHoldingsText } from "../lib/parseHoldings";
import { shFmt } from "../lib/format";

// 매수 문자 / 계좌 현황 텍스트를 붙여넣어 종목·수량을 인식하고 적용.
// market: "us"|"kr", known: [{ticker,name}], onApply(entries)
export default function PasteHoldings({ market, known, onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null); // 인식 결과 [{ticker,name,qty,matched,include}]

  const reset = () => { setText(""); setRows(null); };
  const close = () => { setOpen(false); reset(); };

  const recognize = () => {
    const parsed = parseHoldingsText(text, market, known);
    setRows(parsed.map((e) => ({ ...e, include: true })));
  };

  const apply = () => {
    const chosen = (rows || []).filter((r) => r.include && r.qty > 0);
    if (chosen.length) onApply(chosen.map(({ ticker, name, qty }) => ({ ticker, name, qty })));
    close();
  };

  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const placeholder =
    market === "us"
      ? "매수 문자나 계좌 현황을 붙여넣으세요.\n예) 애플 5주 매수 체결\n   NVDA 10주\n   테슬라 3주"
      : "매수 문자나 계좌 현황을 붙여넣으세요.\n예) 삼성전자(005930) 10주 매수\n   SK하이닉스 4주\n   005930 5주";

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
                  텍스트를 붙여넣고 인식하면 종목·수량만 추출합니다. (외부 전송 없음 · 미리보기에서 수정 후 적용)
                </div>
              </div>
              <button className="x" onClick={close}>닫기 ✕</button>
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
                <div className="empty-note">인식된 종목이 없습니다. "N주" 형태(예: 삼성전자 10주)나 종목코드를 포함해 붙여넣어 주세요.</div>
              ) : (
                <div className="paste-table">
                  <div className="paste-head">
                    <span></span>
                    <span>종목</span>
                    <span>수량</span>
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
                      <span className={`pr-badge ${r.matched ? "held" : "new"}`}>{r.matched ? "보유" : "신규"}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="paste-footer">
              <button className="addform-cancel" onClick={close}>취소</button>
              <button className="addform-ok" onClick={apply} disabled={!rows || !rows.some((r) => r.include && r.qty > 0)}>
                선택 적용
              </button>
            </div>
            <div className="footer-note" style={{ marginTop: 10 }}>
              보유 종목은 현재 수량을 덮어쓰고, 신규 종목은 직접 추가 종목으로 등록됩니다. (계좌 탭·전체 탭에 반영)
            </div>
          </div>
        </div>
      )}
    </>
  );
}
