"use client";

import { useRef, useState } from "react";
import { parseHoldingsText } from "../lib/parseHoldings";

// 계좌별 보유종목 캡쳐 업로드 → (완전 로컬 OCR) → 종목·수량 인식 → 카드 일괄 생성.
// 이미지는 브라우저 안에서만 처리되며 외부로 전송되지 않는다(Tesseract.js).
export default function AccountUpload({ market, broker, brokerLabel, known, onApply }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="pastebtn acct-upload-btn" onClick={() => setOpen(true)}>
        📷 보유종목 캡쳐 업로드
      </button>
    );
  }
  return (
    <UploadModal
      market={market}
      broker={broker}
      brokerLabel={brokerLabel}
      known={known}
      onApply={onApply}
      onClose={() => setOpen(false)}
    />
  );
}

function UploadModal({ market, broker, brokerLabel, known, onApply, onClose }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const runOcr = async (files) => {
    if (!files || !files.length) return;
    setBusy(true);
    setProg(0);
    setErr("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("kor+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProg(Math.round(m.progress * 100));
          }
        },
      });
      let acc = "";
      for (const f of Array.from(files)) {
        const { data } = await worker.recognize(f);
        if (data?.text) acc += (acc ? "\n" : "") + data.text;
      }
      await worker.terminate();
      setText((prev) => (prev ? prev + "\n" : "") + acc);
    } catch (e) {
      setErr("이미지 인식에 실패했습니다. 텍스트로 직접 붙여넣어 주세요. (" + (e?.message || e) + ")");
    } finally {
      setBusy(false);
      setProg(0);
    }
  };

  const recognize = () =>
    setRows(parseHoldingsText(text, market, known || []).map((e) => ({ ...e, include: true })));
  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const apply = () => {
    const picked = (rows || []).filter((r) => r.include && r.qty > 0);
    if (picked.length) onApply(market, broker, picked);
    onClose();
  };

  const ph =
    market === "us"
      ? "이미지 업로드 후 인식되거나, 여기에 직접 붙여넣어 편집하세요.\n예) 애플, AAPL, 6주"
      : "이미지 업로드 후 인식되거나, 여기에 직접 붙여넣어 편집하세요.\n예) KODEX 미국반도체, 390390, 53주";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            보유종목 캡쳐 업로드 <span className="acct-tag">{brokerLabel}</span>
          </div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="upload-drop">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => runOcr(e.target.files)}
          />
          <button className="addform-ok" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? `인식 중… ${prog}%` : "🖼 이미지 선택"}
          </button>
          <span className="upload-hint">
            증권앱 보유종목 화면 캡쳐를 올리면 브라우저 안에서만 글자를 읽어냅니다(외부 전송 없음). 여러 장 가능.
          </span>
        </div>
        {busy ? (
          <div className="ocr-bar"><div className="ocr-bar-in" style={{ width: `${prog}%` }} /></div>
        ) : null}
        {err ? <div className="empty-note" style={{ color: "var(--down)" }}>{err}</div> : null}

        <textarea
          className="paste-area"
          rows={6}
          placeholder={ph}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="paste-actions">
          <button className="addform-ok" onClick={recognize} disabled={!text.trim()}>종목 인식</button>
          {rows ? <span className="paste-count">{rows.length}개 인식됨</span> : null}
        </div>

        {rows &&
          (rows.length === 0 ? (
            <div className="empty-note">
              인식된 종목이 없습니다. "종목명, 티커, N주" 형식이 잘 보이도록 편집하거나 다시 캡쳐해 주세요.
            </div>
          ) : (
            <div className="paste-table upl-table">
              <div className="paste-head"><span></span><span>종목</span><span>수량</span><span>상태</span></div>
              {rows.map((r, i) => (
                <div className={`paste-row upl-row${r.include ? "" : " off"}`} key={r.ticker}>
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
          ))}

        <div className="paste-footer">
          <button className="addform-cancel" onClick={onClose}>취소</button>
          <button className="addform-ok" onClick={apply} disabled={!rows || !rows.some((r) => r.include && r.qty > 0)}>
            카드 생성 ({brokerLabel})
          </button>
        </div>
      </div>
    </div>
  );
}
