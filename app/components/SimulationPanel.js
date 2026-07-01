"use client";

import { yahooSymbol } from "../portfolios";
import { usd, krw, pct, signNum, shFmt, dirClass, arrow } from "../lib/format";

const fmtMonths = (months) => months.slice().sort((a, b) => a - b).map((m) => `${m}월`).join(", ");

// 한 종목 행의 시세/평가/일등락 계산
function calcItem(it, options, quotes) {
  const stocks = options[it.market] || [];
  const sel = stocks.find((s) => s.ticker === it.ticker) || stocks[0];
  if (!sel) return { sel: null };
  const q = quotes[yahooSymbol(it.market, sel.ticker)];
  if (!q?.ok) return { sel, q: null };
  const value = it.qty * q.price; // 평가금액(네이티브)
  const dayChange = it.qty * (q.change ?? 0); // 당일 등락액(네이티브)
  return { sel, q, value, dayChange };
}

function SummaryCard({ kind, label, valueKrw, valueNative, nativeCcy, dayKrw, prevKrw }) {
  const dc = dirClass(dayKrw);
  const pctVal = prevKrw ? (dayKrw / prevKrw) * 100 : null;
  return (
    <div className={`fin-card ${kind}`}>
      <div className="fin-label">{label}</div>
      <div className="fin-value">{valueKrw == null ? "-" : krw(valueKrw)}</div>
      {valueNative != null && nativeCcy === "USD" ? (
        <div className="fin-sub">{usd(valueNative)}</div>
      ) : null}
      {valueKrw != null ? (
        <div className={`fin-change ${dc}`}>
          {arrow(dayKrw)} {dayKrw == null ? "-" : (dayKrw > 0 ? "+" : dayKrw < 0 ? "-" : "") + krw(Math.abs(dayKrw))}
          {pctVal != null ? <span className="fin-pct">({pct(pctVal)})</span> : null}
        </div>
      ) : (
        <div className="fin-change flat">시세 대기</div>
      )}
    </div>
  );
}

function SimRow({ it, options, quotes, fxRate, dividends, onChange, onRemove }) {
  const { sel, q, value, dayChange } = calcItem(it, options, quotes);
  const isKR = it.market === "kr";
  const stocks = options[it.market] || [];
  const dc = dirClass(q?.change);

  // 배당: 주당 배당 × 수량 (연간, 실데이터), 배당월
  const div = sel ? dividends[yahooSymbol(it.market, sel.ticker)] : null;
  const divAnnual = div ? it.qty * div.perShare : null;
  const divKrw = divAnnual != null ? (isKR ? divAnnual : (fxRate ? divAnnual * fxRate : null)) : null;

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
          onChange={(e) => {
            let v = parseFloat(e.target.value);
            if (!Number.isFinite(v) || v < 0) v = 0;
            onChange({ qty: v });
          }}
        />
        <button className="cardx" title="삭제" onClick={onRemove}>✕</button>
      </div>
      <div className="sim-item-amt">
        <span className="sim-item-nm">
          {sel ? `${sel.name} · ${shFmt(it.qty)}주` : "종목 없음"}
          {q ? <span className={`sim-item-day ${dc}`}> · {arrow(q.change)} {pct(q.changePercent)}</span> : null}
        </span>
        <span className="sim-item-val">
          {value != null ? (
            <>
              <b>{isKR ? krw(value) : usd(value)}</b>
              {!isKR && fxRate ? <span className="krw"> · {krw(value * fxRate)}</span> : null}
            </>
          ) : (
            <span className="flat">시세 없음</span>
          )}
        </span>
      </div>
      <div className="sim-item-div">
        {div ? (
          <>
            <span><span className="di-k">배당월</span><span className="di-v">{fmtMonths(div.months)}</span></span>
            <span>
              <span className="di-k">배당금(연)</span>
              <span className="di-v">
                {isKR ? krw(divAnnual) : usd(divAnnual)}
                {!isKR && divKrw != null ? ` · ${krw(divKrw)}` : ""}
              </span>
            </span>
          </>
        ) : (
          <span className="di-none">배당 정보 없음</span>
        )}
      </div>
    </div>
  );
}

export default function SimulationPanel({ items, options, quotes, fxRate, dividends = {}, addItem, updateItem, removeItem }) {
  // 시장별 집계
  let usVal = 0, usDay = 0, usAny = false; // USD
  let krVal = 0, krDay = 0, krAny = false; // KRW
  for (const it of items) {
    const { value, dayChange } = calcItem(it, options, quotes);
    if (value == null) continue;
    if (it.market === "us") { usVal += value; usDay += dayChange; usAny = true; }
    else { krVal += value; krDay += dayChange; krAny = true; }
  }
  const usValKrw = fxRate ? usVal * fxRate : null;
  const usDayKrw = fxRate ? usDay * fxRate : null;
  const totalKrw = (usValKrw ?? 0) + krVal;
  const totalDayKrw = (usDayKrw ?? 0) + krDay;
  const anyTotal = usAny || krAny;

  return (
    <div className="sim">
      <div className="fin-grid">
        <SummaryCard
          kind="total"
          label="전체 자산 총합 (Total)"
          valueKrw={anyTotal ? totalKrw : null}
          dayKrw={anyTotal ? totalDayKrw : null}
          prevKrw={totalKrw - totalDayKrw}
        />
        <SummaryCard
          kind="us"
          label="미국 주식 합계"
          valueKrw={usAny ? usValKrw : null}
          valueNative={usAny ? usVal : null}
          nativeCcy="USD"
          dayKrw={usAny ? usDayKrw : null}
          prevKrw={usValKrw != null ? usValKrw - (usDayKrw ?? 0) : null}
        />
        <SummaryCard
          kind="kr"
          label="한국 주식 합계"
          valueKrw={krAny ? krVal : null}
          dayKrw={krAny ? krDay : null}
          prevKrw={krVal - krDay}
        />
      </div>

      <div className="sim-list">
        {items.length === 0 ? (
          <div className="empty-note">+ 종목 추가 버튼으로 종목을 담으면 위 합계에 자동 반영됩니다.</div>
        ) : (
          items.map((it) => (
            <SimRow
              key={it.id}
              it={it}
              options={options}
              quotes={quotes}
              fxRate={fxRate}
              dividends={dividends}
              onChange={(patch) => updateItem(it.id, patch)}
              onRemove={() => removeItem(it.id)}
            />
          ))
        )}
      </div>

      <div className="sim-addrow">
        <button className="addbtn" onClick={addItem}>+ 종목 추가</button>
      </div>

      <div className="footer-note">
        시뮬레이션은 보유 대시보드와 독립된 계산입니다. 시세·환율은 동일 라이브 데이터를 사용합니다. 미국 주식은 ₩ 환산 후 합산되어 Total에 포함됩니다. 등락은 당일 기준입니다.
      </div>
    </div>
  );
}
