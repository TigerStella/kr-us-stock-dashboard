"use client";

import { useMemo } from "react";
import { usd, krw, shFmt } from "../lib/format";

// 매수일지: 계좌·날짜·종목(티커)·매수단가·매수주식수·매수금액(총액). 최신순.
export default function BuyLogTab({ log, onRemoveEntry, onClear }) {
  const rows = log || [];
  const totals = useMemo(() => {
    let krwSum = 0;
    let usdSum = 0;
    for (const r of rows) {
      if (r.amount == null) continue;
      if (r.market === "kr") krwSum += r.amount;
      else usdSum += r.amount;
    }
    return { krwSum, usdSum };
  }, [rows]);

  const money = (v, market) => (v == null ? "-" : market === "kr" ? krw(v) : usd(v));
  const unit = (r) => (r.amount != null && r.shares ? r.amount / r.shares : null);

  return (
    <div className="buylog">
      <div className="div-head">
        <span className="div-title">매수일지</span>
        <span className="div-total">
          기록 {rows.length}건
          {totals.krwSum ? <> · 한국 <b>{krw(totals.krwSum)}</b></> : null}
          {totals.usdSum ? <> · 미국 <b>{usd(totals.usdSum)}</b></> : null}
        </span>
      </div>
      <div className="div-sub">
        미국/한국 탭에서 "매수내역 붙여넣기 → 매수 추가"로 입력할 때마다 여기에 기록됩니다.
        {rows.length ? <button className="log-clear" onClick={onClear}>전체 삭제</button> : null}
      </div>

      {rows.length === 0 ? (
        <div className="empty-note">아직 기록이 없습니다. 매수내역을 "매수 추가(누적)" 방식으로 적용하면 여기에 쌓입니다.</div>
      ) : (
        <div className="log-scroll">
          <div className="log-table">
            <div className="log-head">
              <span>날짜</span>
              <span>계좌</span>
              <span>종목</span>
              <span className="r">매수단가</span>
              <span className="r">주식수</span>
              <span className="r">매수금액</span>
              <span></span>
            </div>
            {rows.map((r) => (
              <div className="log-row" key={r.id}>
                <span className="lg-date">{r.date}</span>
                <span className="lg-acct">{r.account}</span>
                <span className="lg-name">{r.name} <span className="lg-tk">({r.ticker})</span></span>
                <span className="r">{money(unit(r), r.market)}</span>
                <span className="r">{shFmt(r.shares)}</span>
                <span className="r lg-amt">{money(r.amount, r.market)}</span>
                <button className="cardx" title="삭제" onClick={() => onRemoveEntry(r.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
