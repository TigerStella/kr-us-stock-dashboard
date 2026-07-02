"use client";

import { useMemo, useState } from "react";
import { MARKETS, brokerHoldings, yahooSymbol } from "../portfolios";
import { computeMonthlyDividend } from "../lib/dividends";
import MonthlyDividendBars from "./MonthlyDividendBars";
import { usd, krw, shFmt } from "../lib/format";

const fmtMonths = (months) => months.slice().sort((a, b) => a - b).map((m) => `${m}월`).join(", ");

// 배당 시뮬레이션 한 행 (매수 시뮬과 동일한 종목 목록 공유, 배당 중심 표시)
function SimDivRow({ it, options, dividends, fxRate, onChange, onRemove }) {
  const stocks = options[it.market] || [];
  const sel = stocks.find((s) => s.ticker === it.ticker) || stocks[0];
  const isKR = it.market === "kr";
  const d = sel ? dividends[yahooSymbol(it.market, sel.ticker)] : null;
  const annual = d ? it.qty * d.perShare : null;
  const krwv = annual != null ? (isKR ? annual : (fxRate ? annual * fxRate : null)) : null;

  return (
    <div className="sim-item">
      <div className="sim-item-row">
        <div className="sim-toggle">
          <button className={isKR ? "active" : ""} onClick={() => onChange({ market: "kr", ticker: options.kr[0]?.ticker ?? "" })}>한국</button>
          <button className={!isKR ? "active" : ""} onClick={() => onChange({ market: "us", ticker: options.us[0]?.ticker ?? "" })}>미국</button>
        </div>
        <select value={sel?.ticker ?? ""} onChange={(e) => onChange({ ticker: e.target.value })}>
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker}>{s.name} ({s.ticker})</option>
          ))}
        </select>
        <input
          className="sim-qty"
          type="number"
          step="any"
          min="0"
          value={it.qty}
          onChange={(e) => { let v = parseFloat(e.target.value); if (!Number.isFinite(v) || v < 0) v = 0; onChange({ qty: v }); }}
        />
        <button className="cardx" title="삭제" onClick={onRemove}>✕</button>
      </div>
      <div className="sim-item-div">
        {d ? (
          <>
            <span><span className="di-k">배당월</span><span className="di-v">{fmtMonths(d.months)}</span></span>
            <span><span className="di-k">연 배당</span><span className="di-v">{isKR ? krw(annual) : usd(annual)}{!isKR && krwv != null ? ` · ${krw(krwv)}` : ""}</span></span>
          </>
        ) : (
          <span className="di-none">배당 정보 없음</span>
        )}
      </div>
    </div>
  );
}

// 계좌별 월별 배당 (수량 편집 → 실시간 반영)
function AccountDividends({ dividends, fxRate }) {
  const [market, setMarket] = useState("us");
  const brokers = MARKETS[market].brokers;
  const [account, setAccount] = useState(brokers[0]);
  const acct = brokers.includes(account) ? account : brokers[0];
  const [divQty, setDivQty] = useState({}); // `${market}:${acct}:${ticker}` -> qty

  const holdings = useMemo(
    () => brokerHoldings(market, acct).map((h) => ({ ...h, market, yahoo: yahooSymbol(market, h.ticker) })),
    [market, acct]
  );
  const keyOf = (h) => `${market}:${acct}:${h.ticker}`;
  const getQty = (h) => {
    const v = divQty[keyOf(h)];
    return v == null ? h.shares : v;
  };
  const { data, total, covered } = useMemo(
    () => computeMonthlyDividend(holdings, fxRate, dividends, getQty),
    [holdings, fxRate, dividends, divQty]
  );
  const payers = holdings.filter((h) => dividends[h.yahoo]);

  const switchMarket = (m) => { setMarket(m); setAccount(MARKETS[m].brokers[0]); };

  return (
    <div className="acc-div">
      <div className="section-title">계좌별 월별 배당 (보유 수량 조정 시 자동 반영)</div>

      <div className="sim-toggle" style={{ marginBottom: 8 }}>
        <button className={market === "us" ? "active" : ""} onClick={() => switchMarket("us")}>미국</button>
        <button className={market === "kr" ? "active" : ""} onClick={() => switchMarket("kr")}>한국</button>
      </div>
      <div className="subtabs">
        {brokers.map((b) => (
          <button key={b} className={b === acct ? "active" : ""} onClick={() => setAccount(b)}>
            {MARKETS[market].brokerLabel[b]}
          </button>
        ))}
      </div>

      <div className="div-head" style={{ marginTop: 12 }}>
        <span className="div-title">{MARKETS[market].brokerLabel[acct]} · 월별 배당</span>
        <span className="div-total">연간 합계 <b>{total > 0 ? krw(total) : "-"}</b></span>
      </div>
      {total > 0 ? (
        <MonthlyDividendBars data={data} height={220} />
      ) : (
        <div className="chart-msg">이 계좌에는 배당 데이터가 있는 종목이 없습니다</div>
      )}

      {payers.length > 0 && (
        <div className="acc-qty">
          <div className="acc-qty-head">
            <span>종목</span><span>보유 수량</span><span>배당월</span><span>연 배당(₩)</span>
          </div>
          {payers.map((h) => {
            const d = dividends[h.yahoo];
            const qty = getQty(h);
            const annualNative = qty * d.perShare;
            const krwAnnual = h.market === "kr" ? annualNative : (fxRate ? annualNative * fxRate : null);
            return (
              <div className="acc-qty-row" key={h.ticker}>
                <span className="aq-name">{h.name} <span className="aq-tk">({h.ticker})</span></span>
                <input
                  className="aq-input"
                  type="number"
                  step="any"
                  min="0"
                  value={qty}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value);
                    if (!Number.isFinite(v) || v < 0) v = 0;
                    setDivQty((m) => ({ ...m, [keyOf(h)]: v }));
                  }}
                />
                <span className="aq-months">{fmtMonths(d.months)}</span>
                <span className="aq-amt">{krwAnnual != null ? krw(krwAnnual) : "-"}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="footer-note">배당 지급월에 균등 배분해 ₩로 환산했습니다. 수량을 바꾸면 위 그래프와 합계가 즉시 갱신됩니다. (기본값은 실제 보유 수량)</div>
    </div>
  );
}

export default function DividendTab({ simItems, options, dividends = {}, fxRate, addItem, updateItem, removeItem }) {
  // 배당 시뮬레이션: 매수 시뮬과 동일한 종목(simItems)을 공유
  const simHoldings = useMemo(
    () =>
      simItems
        .map((it) => {
          const stocks = options[it.market] || [];
          const sel = stocks.find((s) => s.ticker === it.ticker) || stocks[0];
          return sel ? { yahoo: yahooSymbol(it.market, sel.ticker), market: it.market, qty: it.qty } : null;
        })
        .filter(Boolean),
    [simItems, options]
  );
  const { data, total } = useMemo(
    () => computeMonthlyDividend(simHoldings, fxRate, dividends, (h) => h.qty),
    [simHoldings, fxRate, dividends]
  );

  return (
    <div className="sim">
      <div className="div-head">
        <span className="div-title">배당 시뮬레이션 · 월별 예상 배당</span>
        <span className="div-total">연간 합계 <b>{total > 0 ? krw(total) : "-"}</b></span>
      </div>
      <div className="div-sub">아래에서 종목·수량을 담으면 월별 예상 배당이 즉시 계산됩니다. (실제 배당 이력 기준)</div>
      {total > 0 ? (
        <MonthlyDividendBars data={data} height={240} />
      ) : (
        <div className="chart-msg">종목을 추가하면 월별 배당이 표시됩니다</div>
      )}

      <div className="sim-list">
        {simItems.length === 0 ? (
          <div className="empty-note">+ 종목 추가 버튼으로 종목을 담아 배당을 시뮬레이션하세요. (매수 시뮬레이션 탭과 종목이 공유됩니다)</div>
        ) : (
          simItems.map((it) => (
            <SimDivRow
              key={it.id}
              it={it}
              options={options}
              dividends={dividends}
              fxRate={fxRate}
              onChange={(patch) => updateItem(it.id, patch)}
              onRemove={() => removeItem(it.id)}
            />
          ))
        )}
      </div>
      <div className="sim-addrow">
        <button className="addbtn" onClick={addItem}>+ 종목 추가</button>
      </div>

      <AccountDividends dividends={dividends} fxRate={fxRate} />
    </div>
  );
}
