"use client";

import { useMemo, useState } from "react";
import { parseHoldingsText } from "../lib/parseHoldings";
import StockSearch from "./StockSearch";
import { usd, krw, shFmt } from "../lib/format";

// ── 매수/매도 입력 폼 ──
function EntryForm({ accounts, known, onSubmit, onClose }) {
  const [market, setMarket] = useState("kr");
  const accs = accounts[market] || [];
  const [broker, setBroker] = useState(accs[0]?.key || "");
  const brokerValid = accs.some((a) => a.key === broker) ? broker : accs[0]?.key || "";
  const [stock, setStock] = useState(null); // {ticker,name}
  const [side, setSide] = useState("buy");
  const [shares, setShares] = useState("");
  const [unit, setUnit] = useState(""); // 1주당 단가

  const shNum = parseFloat(shares);
  const unitNum = parseFloat(unit);
  const total = Number.isFinite(shNum) && shNum > 0 && Number.isFinite(unitNum) && unitNum >= 0 ? shNum * unitNum : null;
  const fmtMoney = (v) => (v == null ? "-" : market === "us" ? usd(v) : krw(v));

  const switchMarket = (m) => { setMarket(m); setBroker(accounts[m]?.[0]?.key || ""); setStock(null); };

  const submit = () => {
    if (!stock || !(shNum > 0)) return;
    onSubmit({ market, broker: brokerValid, ticker: stock.ticker, name: stock.name, side, shares: shNum, amount: total });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div style={{ fontSize: 17, fontWeight: 800 }}>매수 / 매도 입력</div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="ef-grid">
          <label>시장</label>
          <div className="sim-toggle">
            <button className={market === "us" ? "active" : ""} onClick={() => switchMarket("us")}>미국</button>
            <button className={market === "kr" ? "active" : ""} onClick={() => switchMarket("kr")}>한국</button>
          </div>

          <label>계좌</label>
          <select className="ef-select" value={brokerValid} onChange={(e) => setBroker(e.target.value)}>
            {accs.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>

          <label>종목</label>
          <StockSearch options={known[market] || []} value={stock} onChange={setStock} />

          <label>구분</label>
          <div className="sim-toggle">
            <button className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button>
            <button className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button>
          </div>

          <label>수량(주)</label>
          <input className="ef-select" type="number" step="any" min="0" value={shares} placeholder="매수/매도 갯수" onChange={(e) => setShares(e.target.value)} />

          <label>1주당 단가</label>
          <input className="ef-select" type="number" step="any" min="0" value={unit} placeholder={market === "us" ? "1주당 가격($)" : "1주당 가격(원)"} onChange={(e) => setUnit(e.target.value)} />

          <label>합계</label>
          <div className="ef-total">{fmtMoney(total)}<span className="ef-total-sub">{total != null ? ` (${shFmt(shNum)}주 × ${fmtMoney(unitNum)})` : ""}</span></div>
        </div>

        <div className="paste-footer">
          <button className="addform-cancel" onClick={onClose}>취소</button>
          <button className="addform-ok" onClick={submit} disabled={!stock || !(shNum > 0)}>저장</button>
        </div>
        <div className="footer-note" style={{ marginTop: 8 }}>
          저장하면 해당 계좌 보유 수량이 {side === "buy" ? "더해지고" : "차감되고"} 아래 일지에 기록됩니다.
        </div>
      </div>
    </div>
  );
}

// ── 매수현황 붙여넣기 ──
function PasteModal({ accounts, known, onSubmit, onClose }) {
  const [market, setMarket] = useState("kr");
  const accs = accounts[market] || [];
  const [broker, setBroker] = useState(accs[0]?.key || "");
  const brokerValid = accs.some((a) => a.key === broker) ? broker : accs[0]?.key || "";
  const [side, setSide] = useState("buy");
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);

  const switchMarket = (m) => { setMarket(m); setBroker(accounts[m]?.[0]?.key || ""); };
  const recognize = () => setRows(parseHoldingsText(text, market, known[market] || []).map((e) => ({ ...e, include: true })));
  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const apply = () => {
    (rows || []).filter((r) => r.include && r.qty > 0).forEach((r) => {
      onSubmit({ market, broker: brokerValid, ticker: r.ticker, name: r.name, side, shares: r.qty, amount: r.amount ?? null });
    });
    onClose();
  };

  const ph = market === "us"
    ? "종목명, 티커, 매수주식수, 매수금액\n예) 애플, AAPL, 5주, 1200000원"
    : "종목명, 티커, 매수주식수, 매수금액\n예) KODEX 미국반도체, 390390, 3주, 157300원";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div style={{ fontSize: 17, fontWeight: 800 }}>매수현황 붙여넣기</div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="ef-grid">
          <label>시장</label>
          <div className="sim-toggle">
            <button className={market === "us" ? "active" : ""} onClick={() => switchMarket("us")}>미국</button>
            <button className={market === "kr" ? "active" : ""} onClick={() => switchMarket("kr")}>한국</button>
          </div>
          <label>계좌</label>
          <select className="ef-select" value={brokerValid} onChange={(e) => setBroker(e.target.value)}>
            {accs.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <label>구분</label>
          <div className="sim-toggle">
            <button className={side === "buy" ? "active buy" : ""} onClick={() => setSide("buy")}>매수</button>
            <button className={side === "sell" ? "active sell" : ""} onClick={() => setSide("sell")}>매도</button>
          </div>
        </div>

        <textarea className="paste-area" rows={6} placeholder={ph} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="paste-actions">
          <button className="addform-ok" onClick={recognize} disabled={!text.trim()}>인식</button>
          {rows ? <span className="paste-count">{rows.length}개 인식됨</span> : null}
        </div>

        {rows && (rows.length === 0 ? (
          <div className="empty-note">인식된 종목이 없습니다. "종목명, 티커, N주, 금액원" 형식으로 붙여넣어 주세요.</div>
        ) : (
          <div className="paste-table">
            <div className="paste-head"><span></span><span>종목</span><span>수량</span><span>금액</span><span>상태</span></div>
            {rows.map((r, i) => (
              <div className={`paste-row${r.include ? "" : " off"}`} key={r.ticker}>
                <input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} />
                <span className="pr-name">{r.name} <span className="pr-tk">({r.ticker})</span></span>
                <input className="pr-qty" type="number" step="any" min="0" value={r.qty} onChange={(e) => { let v = parseFloat(e.target.value); if (!Number.isFinite(v) || v < 0) v = 0; setRow(i, { qty: v }); }} />
                <input className="pr-amt" type="number" step="any" min="0" placeholder="-" value={r.amount ?? ""} onChange={(e) => setRow(i, { amount: e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0) })} />
                <span className={`pr-badge ${r.matched ? "held" : "new"}`}>{r.matched ? "보유" : "신규"}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="paste-footer">
          <button className="addform-cancel" onClick={onClose}>취소</button>
          <button className="addform-ok" onClick={apply} disabled={!rows || !rows.some((r) => r.include && r.qty > 0)}>
            {side === "buy" ? "매수" : "매도"} 기록 적용
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 매수일지 탭 ──
export default function BuyLogTab({ log, onAddEntry, onRemoveEntry, onClear, accounts, known }) {
  const [form, setForm] = useState(null); // null | "entry" | "paste"
  const rows = log || [];
  const totals = useMemo(() => {
    let kr = 0, us = 0;
    for (const r of rows) {
      if (r.amount == null) continue;
      const sign = r.side === "sell" ? -1 : 1;
      if (r.market === "kr") kr += sign * r.amount; else us += sign * r.amount;
    }
    return { kr, us };
  }, [rows]);
  const money = (v, market) => (v == null ? "-" : market === "kr" ? krw(v) : usd(v));

  return (
    <div className="buylog">
      <div className="div-head">
        <span className="div-title">매수일지</span>
        <span className="div-total">
          {rows.length}건
          {totals.kr ? <> · 한국 <b>{krw(totals.kr)}</b></> : null}
          {totals.us ? <> · 미국 <b>{usd(totals.us)}</b></> : null}
        </span>
      </div>

      <div className="log-toolbar">
        <button className="addbtn" onClick={() => setForm("entry")}>＋ 매수/매도 입력</button>
        <button className="pastebtn" onClick={() => setForm("paste")}>📋 매수현황 붙여넣기</button>
        {rows.length ? <button className="log-clear" onClick={onClear}>전체 삭제</button> : null}
      </div>
      <div className="div-sub">종목·수량·금액을 입력하면 해당 계좌 보유 수량이 매수는 +, 매도는 − 로 자동 반영됩니다.</div>

      {rows.length === 0 ? (
        <div className="empty-note">아직 기록이 없습니다. "＋ 매수/매도 입력" 또는 "매수현황 붙여넣기"로 추가하세요.</div>
      ) : (
        <div className="log-list">
          {rows.map((r) => (
            <div className="log-entry" key={r.id}>
              <div className="le-main">
                <span className="le-name">{r.name} <span className="le-tk">({r.ticker})</span></span>
                <span className={`le-badge ${r.side === "sell" ? "sell" : "buy"}`}>{r.side === "sell" ? "매도" : "매수"}</span>
                <button className="cardx le-x" title="삭제" onClick={() => onRemoveEntry(r.id)}>✕</button>
              </div>
              <div className="le-sub">
                <span className="le-date">{r.date}</span>
                <span className="le-acct">{r.account}</span>
                <span className="le-qty">{shFmt(r.shares)}주{r.amount != null && r.shares ? ` × ${money(r.amount / r.shares, r.market)}` : ""}</span>
                <span className="le-amt">{money(r.amount, r.market)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {form === "entry" && <EntryForm accounts={accounts} known={known} onSubmit={onAddEntry} onClose={() => setForm(null)} />}
      {form === "paste" && <PasteModal accounts={accounts} known={known} onSubmit={onAddEntry} onClose={() => setForm(null)} />}
    </div>
  );
}
