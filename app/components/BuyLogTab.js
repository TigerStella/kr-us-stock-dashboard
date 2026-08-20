"use client";

import { useMemo, useState } from "react";
import { parseHoldingsText } from "../lib/parseHoldings";
import StockSearch from "./StockSearch";
import { usd, krw, shFmt } from "../lib/format";

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── 매수/매도 입력·수정 폼 ──
function EntryForm({ accounts, known, initial, onSubmit, onClose }) {
  const editing = !!initial;
  const [market, setMarket] = useState(initial?.market || "kr");
  const accs = accounts[market] || [];
  const [broker, setBroker] = useState(initial?.broker || accs[0]?.key || "");
  const brokerValid = accs.some((a) => a.key === broker) ? broker : accs[0]?.key || "";
  const [stock, setStock] = useState(initial ? { ticker: initial.ticker, name: initial.name } : null);
  const [side, setSide] = useState(initial?.side || "buy");
  const [shares, setShares] = useState(initial?.shares != null ? String(initial.shares) : "");
  const [unit, setUnit] = useState(initial?.amount != null && initial?.shares ? String(initial.amount / initial.shares) : "");
  const [date, setDate] = useState(initial?.date || todayStr());

  const shNum = parseFloat(shares);
  const unitNum = parseFloat(unit);
  const total = Number.isFinite(shNum) && shNum > 0 && Number.isFinite(unitNum) && unitNum >= 0 ? shNum * unitNum : null;
  const fmtMoney = (v) => (v == null ? "-" : market === "us" ? usd(v) : krw(v));

  const switchMarket = (m) => { setMarket(m); setBroker(accounts[m]?.[0]?.key || ""); setStock(null); };

  const submit = () => {
    if (!stock || !(shNum > 0)) return;
    const account = accs.find((a) => a.key === brokerValid)?.label || brokerValid;
    onSubmit({ market, broker: brokerValid, account, ticker: stock.ticker, name: stock.name, side, shares: shNum, amount: total, date });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div style={{ fontSize: 17, fontWeight: 800 }}>{editing ? "매수 / 매도 수정" : "매수 / 매도 입력"}</div>
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

          <label>날짜</label>
          <input className="ef-select" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label>합계</label>
          <div className="ef-total">{fmtMoney(total)}<span className="ef-total-sub">{total != null ? ` (${shFmt(shNum)}주 × ${fmtMoney(unitNum)})` : ""}</span></div>
        </div>

        <div className="paste-footer">
          <button className="addform-cancel" onClick={onClose}>취소</button>
          <button className="addform-ok" onClick={submit} disabled={!stock || !(shNum > 0)}>{editing ? "수정 저장" : "저장"}</button>
        </div>
        <div className="footer-note" style={{ marginTop: 8 }}>
          {editing
            ? "수정은 일지 기록만 갱신합니다(보유 수량은 재조정하지 않음)."
            : `저장하면 해당 계좌 보유 수량이 ${side === "buy" ? "더해지고" : "차감되고"} 아래 일지에 기록됩니다.`}
        </div>
      </div>
    </div>
  );
}

// ── 통장간 이체 입력·수정 폼 ──
function TransferForm({ accounts, initial, onSubmit, onClose }) {
  const editing = !!initial;
  const opts = accounts || [];
  const [fromId, setFromId] = useState(initial?.fromId || opts[0]?.id || "");
  const [toId, setToId] = useState(initial?.toId || opts[1]?.id || opts[0]?.id || "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency || "KRW");
  const [date, setDate] = useState(initial?.date || todayStr());
  const [memo, setMemo] = useState(initial?.memo || "");

  const amt = parseFloat(amount);
  const same = fromId && fromId === toId;
  const valid = fromId && toId && !same && amt > 0;
  const fmtMoney = (v) => (v == null ? "-" : currency === "USD" ? usd(v) : krw(v));

  const submit = () => {
    if (!valid) return;
    const fromLabel = opts.find((o) => o.id === fromId)?.label || fromId;
    const toLabel = opts.find((o) => o.id === toId)?.label || toId;
    onSubmit({ fromId, fromLabel, toId, toLabel, amount: amt, currency, date, memo: memo.trim() });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div style={{ fontSize: 17, fontWeight: 800 }}>{editing ? "통장 이체 수정" : "통장간 이체 입력"}</div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="ef-grid">
          <label>출금 통장</label>
          <select className="ef-select" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <label>입금 통장</label>
          <select className="ef-select" value={toId} onChange={(e) => setToId(e.target.value)}>
            {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <label>통화</label>
          <div className="sim-toggle">
            <button className={currency === "KRW" ? "active" : ""} onClick={() => setCurrency("KRW")}>원(₩)</button>
            <button className={currency === "USD" ? "active" : ""} onClick={() => setCurrency("USD")}>달러($)</button>
          </div>

          <label>금액</label>
          <input className="ef-select" type="number" step="any" min="0" value={amount} placeholder={currency === "USD" ? "이체 금액($)" : "이체 금액(원)"} onChange={(e) => setAmount(e.target.value)} />

          <label>날짜</label>
          <input className="ef-select" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label>메모</label>
          <input className="ef-select" type="text" value={memo} placeholder="(선택) 이체 사유" onChange={(e) => setMemo(e.target.value)} />

          <label>요약</label>
          <div className="ef-total">
            {fmtMoney(Number.isFinite(amt) && amt > 0 ? amt : null)}
            <span className="ef-total-sub">
              {fromId && toId ? ` ${opts.find((o) => o.id === fromId)?.label} → ${opts.find((o) => o.id === toId)?.label}` : ""}
            </span>
          </div>
        </div>

        {same ? <div className="empty-note" style={{ marginTop: 8 }}>출금·입금 통장이 같습니다. 서로 다른 통장을 선택하세요.</div> : null}

        <div className="paste-footer">
          <button className="addform-cancel" onClick={onClose}>취소</button>
          <button className="addform-ok" onClick={submit} disabled={!valid}>{editing ? "수정 저장" : "이체 기록"}</button>
        </div>
        <div className="footer-note" style={{ marginTop: 8 }}>
          통장간 현금 이동 기록입니다. 보유 종목 수량에는 영향을 주지 않습니다.
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
export default function BuyLogTab({ log, onAddEntry, onUpdateEntry, onAddTransfer, onRemoveEntry, onClear, accounts, transferAccounts, known }) {
  const [form, setForm] = useState(null); // null | { kind: "entry"|"paste"|"transfer", entry? }
  const rows = log || [];
  const totals = useMemo(() => {
    let kr = 0, us = 0;
    for (const r of rows) {
      if (r.type === "transfer" || r.amount == null) continue;
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
        <button className="addbtn" onClick={() => setForm({ kind: "entry" })}>＋ 매수/매도 입력</button>
        <button className="transbtn" onClick={() => setForm({ kind: "transfer" })}>🔁 통장 이체</button>
        <button className="pastebtn" onClick={() => setForm({ kind: "paste" })}>📋 매수현황 붙여넣기</button>
        {rows.length ? <button className="log-clear" onClick={onClear}>전체 삭제</button> : null}
      </div>
      <div className="div-sub">종목·수량·금액을 입력하면 해당 계좌 보유 수량이 매수는 +, 매도는 − 로 자동 반영됩니다. 통장 이체는 현금 이동만 기록됩니다.</div>

      {rows.length === 0 ? (
        <div className="empty-note">아직 기록이 없습니다. "＋ 매수/매도 입력", "🔁 통장 이체" 또는 "매수현황 붙여넣기"로 추가하세요.</div>
      ) : (
        <div className="log-list">
          {rows.map((r) => (
            r.type === "transfer" ? (
              <div className="log-entry transfer" key={r.id}>
                <div className="le-main">
                  <span className="le-name">💸 통장 이체</span>
                  <span className="le-badge transfer">이체</span>
                  <button className="cardx le-edit" title="수정" onClick={() => setForm({ kind: "transfer", entry: r })}>✎</button>
                  <button className="cardx le-x" title="삭제" onClick={() => onRemoveEntry(r.id)}>✕</button>
                </div>
                <div className="le-sub">
                  <span className="le-date">{r.date}</span>
                  <span className="le-transfer">{r.fromLabel} <span className="le-arrow">→</span> {r.toLabel}</span>
                  <span className="le-amt">{money(r.amount, r.currency === "USD" ? "us" : "kr")}</span>
                </div>
                {r.memo ? <div className="le-memo">{r.memo}</div> : null}
              </div>
            ) : (
              <div className="log-entry" key={r.id}>
                <div className="le-main">
                  <span className="le-name">{r.name} <span className="le-tk">({r.ticker})</span></span>
                  <span className={`le-badge ${r.side === "sell" ? "sell" : "buy"}`}>{r.side === "sell" ? "매도" : "매수"}</span>
                  <button className="cardx le-edit" title="수정" onClick={() => setForm({ kind: "entry", entry: r })}>✎</button>
                  <button className="cardx le-x" title="삭제" onClick={() => onRemoveEntry(r.id)}>✕</button>
                </div>
                <div className="le-sub">
                  <span className="le-date">{r.date}</span>
                  <span className="le-acct">{r.account}</span>
                  <span className="le-qty">{shFmt(r.shares)}주{r.amount != null && r.shares ? ` × ${money(r.amount / r.shares, r.market)}` : ""}</span>
                  <span className="le-amt">{money(r.amount, r.market)}</span>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {form?.kind === "entry" && (
        <EntryForm
          accounts={accounts}
          known={known}
          initial={form.entry || null}
          onSubmit={form.entry ? (p) => onUpdateEntry(form.entry.id, p) : onAddEntry}
          onClose={() => setForm(null)}
        />
      )}
      {form?.kind === "transfer" && (
        <TransferForm
          accounts={transferAccounts}
          initial={form.entry || null}
          onSubmit={form.entry ? (p) => onUpdateEntry(form.entry.id, { type: "transfer", ...p }) : onAddTransfer}
          onClose={() => setForm(null)}
        />
      )}
      {form?.kind === "paste" && <PasteModal accounts={accounts} known={known} onSubmit={onAddEntry} onClose={() => setForm(null)} />}
    </div>
  );
}
