"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LineChart from "./LineChart";
import Sparkline from "./Sparkline";
import { SYMBOLS } from "./symbols";
import {
  MARKETS,
  yahooSymbol,
  mergeMarket,
  brokerHoldings,
} from "./portfolios";

const REFRESH_MS = 30000;
const INDEX_DEFS = SYMBOLS.filter((s) => s.group === "index");
const FX_DEFS = SYMBOLS.filter((s) => s.group === "fx");

// ── 포맷 ──
const usd = (v) =>
  v == null ? "-" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const krw = (v) => (v == null ? "-" : "₩" + Math.round(v).toLocaleString("ko-KR"));
const krwNum = (v) => (v == null ? "-" : v.toLocaleString("ko-KR", { maximumFractionDigits: 0 }));
const num2 = (v) => (v == null ? "-" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (v) => (v == null ? "-" : (v > 0 ? "+" : "") + v.toFixed(2) + "%");
const signNum = (v, d = 2) =>
  v == null ? "-" : (v > 0 ? "+" : "") + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const shFmt = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 5 });

function dirClass(change) {
  if (typeof change !== "number" || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}
function arrow(change) {
  if (typeof change !== "number" || change === 0) return "■";
  return change > 0 ? "▲" : "▼";
}
function fmtByCurrency(v, currency) {
  if (v == null) return "-";
  return currency === "KRW" ? krw(v) : usd(v);
}

function qtyOptions(held) {
  const set = new Set([1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100]);
  if (held > 0) set.add(held);
  return Array.from(set).filter((v) => v > 0).sort((a, b) => a - b);
}

// 보유 목록에 yahoo 심볼/시장 부착
function decorate(list, market) {
  return list.map((h) => ({ ...h, market, yahoo: yahooSymbol(market, h.ticker) }));
}
// 선택 수량(드롭다운) 기준 매수금액 합계 (해당 시장 통화). 수량 변경 시 즉시 반영.
function buySum(holdings, ctx, quotes, qtyMap) {
  let s = 0;
  let any = false;
  for (const h of holdings) {
    const q = quotes[h.yahoo];
    if (q?.ok) {
      const qty = qtyMap[`${ctx}:${h.ticker}`] ?? h.shares;
      s += qty * q.price;
      any = true;
    }
  }
  return any ? s : null;
}

// ── 상단 요약 바 ──
function SummaryBar({ quotes }) {
  const items = [
    ...INDEX_DEFS.map((d) => ({ sym: d.symbol, label: d.name, kind: "index" })),
    ...FX_DEFS.map((d) => ({ sym: d.symbol, label: d.name, kind: "fx" })),
  ];
  return (
    <div className="summary">
      {items.map((it) => {
        const q = quotes[it.sym];
        const dc = dirClass(q?.change);
        return (
          <div className="sumitem" key={it.sym}>
            <span className="sl">{it.label}</span>
            {q?.ok ? (
              <>
                <span className="sv">{it.kind === "fx" ? krwNum(q.price) : num2(q.price)}</span>
                <span className={`sc ${dc}`}>
                  {arrow(q.change)} {pct(q.changePercent)}
                </span>
              </>
            ) : (
              <span className="sv flat">데이터 없음</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 보유 종목 카드 ──
function HoldingCard({ holding, quote, fxRate, qtyVal, onQty, onOpen }) {
  const q = quote;
  const isKR = holding.market === "kr";
  const held = holding.shares;
  const selectedQty = qtyVal ?? held;
  const options = useMemo(() => qtyOptions(held), [held]);
  const [manual, setManual] = useState(false);

  const onQtySelect = (val) => {
    if (val === "custom") {
      setManual(true);
    } else {
      setManual(false);
      onQty(Number(val));
    }
  };
  const onQtyInput = (raw) => {
    let v = parseFloat(raw);
    if (!Number.isFinite(v) || v < 0) v = 0; // 빈값/음수 방어
    onQty(v);
  };

  const price = q?.ok ? q.price : null;
  const buyNative = price != null ? selectedQty * price : null;
  const buyConv = buyNative != null && fxRate ? (isKR ? buyNative / fxRate : buyNative * fxRate) : null;
  const dc = dirClass(q?.change);

  const priceStr = isKR ? krw(price) : usd(price);
  const buyNativeStr = isKR ? krw(buyNative) : usd(buyNative);
  const buyConvStr = isKR ? usd(buyConv) : krw(buyConv);

  return (
    <div className={`card${q?.ok ? " clickable" : " unavailable"}`} onClick={() => q?.ok && onOpen(holding)}>
      <div className="card-top">
        <div className="tk">
          {holding.ticker}
          {holding.uncertain ? <span className="uncert" title="보유 수량 불확실">?</span> : null}
          {holding.note ? <span className="uncert" title={holding.note}>ⓘ</span> : null}
          {holding.sources ? (
            <span className="sources">
              {holding.sources.map((s) => (
                <span className="srcbadge" key={s}>{MARKETS[holding.market].brokerLabel[s] ?? s}</span>
              ))}
            </span>
          ) : null}
        </div>
        <div className="qtybox" onClick={(e) => e.stopPropagation()}>
          <span className="qlabel">보유</span>
          <select value={manual ? "custom" : selectedQty} onChange={(e) => onQtySelect(e.target.value)}>
            {options.map((o) => (
              <option key={o} value={o}>{shFmt(o)}주</option>
            ))}
            <option value="custom">직접입력</option>
          </select>
          {manual ? (
            <input
              className="qtyinput"
              type="number"
              step="any"
              min="0"
              value={selectedQty}
              autoFocus
              onChange={(e) => onQtyInput(e.target.value)}
            />
          ) : null}
        </div>
      </div>

      <div className="name">{holding.name}</div>

      {q?.ok ? (
        <>
          <div className="price">{priceStr}</div>
          <div className={`change ${dc}`}>
            {arrow(q.change)} {signNum(q.change, isKR ? 0 : 2)} ({pct(q.changePercent)})
          </div>
          <div className="buy">
            <span className="buy-q">{shFmt(selectedQty)}주 평가 금액</span>
            <span className="buy-v">
              <b>{buyNativeStr}</b>
              {buyConv != null ? <span className="krw"> · {buyConvStr}</span> : null}
            </span>
          </div>
          <div className="spark-wrap">
            <Sparkline data={q.spark} positive={q.change >= 0} />
          </div>
        </>
      ) : (
        <div className="nodata">
          데이터 없음
          {q?.error ? <small>{q.error}</small> : null}
        </div>
      )}
    </div>
  );
}

// 매수금액 합계 바 (선택 수량 기준, 즉시 반영)
function BuySumBar({ primary, secondary, breakdown }) {
  return (
    <div className="grandtotal">
      <span>평가금액 합계</span>
      <b>{primary}</b>
      {secondary ? <span className="sub">{secondary}</span> : null}
      {breakdown ? <span className="sub2">{breakdown}</span> : null}
    </div>
  );
}

// ── 차트 모달 ──
const RANGE_OPTIONS = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "1mo", label: "1개월" },
  { key: "6mo", label: "6개월" },
  { key: "1y", label: "1년" },
];
function ChartModal({ target, onClose }) {
  const [range, setRange] = useState("6mo");
  const [state, setState] = useState({ loading: true, error: null, data: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fetch(`/api/chart?symbol=${encodeURIComponent(target.symbol)}&range=${range}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) setState({ loading: false, error: j.error || "불러오기 실패", data: null });
        else setState({ loading: false, error: null, data: j });
      })
      .catch((e) => alive && setState({ loading: false, error: String(e), data: null }));
    return () => {
      alive = false;
    };
  }, [target.symbol, range]);

  const dc = dirClass(target.change);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div>
            <div className="sym" style={{ fontSize: 12 }}>{target.symbol}</div>
            <div style={{ fontSize: 18, marginTop: 2 }}>{target.name}</div>
            <div className={`change ${dc}`} style={{ marginTop: 6 }}>
              {fmtByCurrency(target.price, target.currency)} &nbsp; {arrow(target.change)} {signNum(target.change, target.currency === "KRW" ? 0 : 2)} ({pct(target.changePercent)})
            </div>
          </div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>
        <div className="ranges">
          {RANGE_OPTIONS.map((r) => (
            <button key={r.key} className={r.key === range ? "active" : ""} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        {state.loading ? (
          <div className="chart-msg">차트 불러오는 중…</div>
        ) : state.error ? (
          <div className="chart-msg">데이터 없음 · {state.error}</div>
        ) : (
          <LineChart points={state.data.points} currency={state.data.currency} />
        )}
      </div>
    </div>
  );
}

const TABS = [
  { key: "all", label: "전체" },
  { key: "us", label: "미국" },
  { key: "kr", label: "한국" },
  { key: "sim", label: "시뮬레이션" },
];

// ── 시뮬레이션 탭 (보유 대시보드와 독립된 매수금액 계산) ──
function SimTab({ market, setMarket, stocks, ticker, setTicker, qty, setQty, quotes, fxRate }) {
  const sel = stocks.find((s) => s.ticker === ticker) || stocks[0];
  const q = sel ? quotes[sel.yahoo] : null;
  const price = q?.ok ? q.price : null;
  const isKR = market === "kr";
  const amount = price != null ? qty * price : null;

  return (
    <div className="sim">
      <div className="sim-result">
        <span className="sim-result-label">매수금액</span>
        {price != null ? (
          <div className="sim-result-val">
            <b>{isKR ? krw(amount) : usd(amount)}</b>
            {!isKR && fxRate ? <span className="krw"> · {krw(amount * fxRate)}</span> : null}
          </div>
        ) : (
          <div className="sim-result-val flat">시세 없음</div>
        )}
        {sel ? (
          <div className="sim-result-sub">
            {sel.name} · {shFmt(qty)}주 × {price != null ? (isKR ? krw(price) : usd(price)) : "-"}
          </div>
        ) : null}
      </div>

      <div className="sim-row">
        <label>시장</label>
        <div className="sim-toggle">
          <button className={market === "kr" ? "active" : ""} onClick={() => setMarket("kr")}>한국</button>
          <button className={market === "us" ? "active" : ""} onClick={() => setMarket("us")}>미국</button>
        </div>
      </div>

      <div className="sim-row">
        <label>종목</label>
        <select value={sel?.ticker ?? ""} onChange={(e) => setTicker(e.target.value)}>
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker}>{s.name} ({s.ticker})</option>
          ))}
        </select>
      </div>

      <div className="sim-row">
        <label>수량</label>
        <input
          type="number"
          step="any"
          min="0"
          value={qty}
          onChange={(e) => {
            let v = parseFloat(e.target.value);
            if (!Number.isFinite(v) || v < 0) v = 0;
            setQty(v);
          }}
        />
        <span className="sim-unit">주 (소수점 가능)</span>
      </div>

      <div className="footer-note">
        시뮬레이션은 보유 대시보드와 독립된 계산입니다. 시세·환율은 동일 라이브 데이터를 사용합니다. (미국 종목은 $와 ₩ 동시 표시, 한국 종목은 ₩)
      </div>
    </div>
  );
}

function HoldingGrid({ holdings, quotes, fxRate, ctx, qtyMap, setQty, onOpen }) {
  return (
    <div className="grid">
      {holdings.map((h) => {
        const key = `${ctx}:${h.ticker}`;
        return (
          <HoldingCard
            key={key}
            holding={h}
            quote={quotes[h.yahoo]}
            fxRate={fxRate}
            qtyVal={qtyMap[key]}
            onQty={(v) => setQty(key, v)}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}

export default function Page() {
  const [quotes, setQuotes] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("all");
  const [usBroker, setUsBroker] = useState("M");
  const [krBroker, setKrBroker] = useState("M");
  const [qtyMap, setQtyMap] = useState({});
  const [target, setTarget] = useState(null);
  const [simMarket, setSimMarket] = useState("us");
  const [simTicker, setSimTicker] = useState(null);
  const [simQty, setSimQty] = useState(1);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes", { cache: "no-store" });
      const json = await res.json();
      setQuotes(json.quotes || {});
      setUpdatedAt(json.updatedAt || new Date().toISOString());
      setStatus("live");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const fxRate = quotes["KRW=X"]?.ok ? quotes["KRW=X"].price : null;
  const usMerged = useMemo(() => decorate(mergeMarket("us"), "us"), []);
  const krMerged = useMemo(() => decorate(mergeMarket("kr"), "kr"), []);
  const usAccount = useMemo(() => decorate(brokerHoldings("us", usBroker), "us"), [usBroker]);
  const krAccount = useMemo(() => decorate(brokerHoldings("kr", krBroker), "kr"), [krBroker]);
  const simStocks = useMemo(() => decorate(mergeMarket(simMarket), simMarket), [simMarket]);

  const setQty = (key, v) => setQtyMap((m) => ({ ...m, [key]: v }));
  const openChart = (h) => {
    const q = quotes[h.yahoo];
    setTarget({ symbol: h.yahoo, name: h.name, price: q.price, change: q.change, changePercent: q.changePercent, currency: q.currency });
  };

  const okCount = Object.values(quotes).filter((q) => q?.ok).length;
  const totalCount = Object.keys(quotes).length;

  // 매수금액 합계(선택 수량 기준, 즉시 반영)
  const allUsBuy = buySum(usMerged, "all-us", quotes, qtyMap); // USD
  const allKrBuy = buySum(krMerged, "all-kr", quotes, qtyMap); // KRW
  const grandBuyKrw = (allUsBuy != null && fxRate ? allUsBuy * fxRate : 0) + (allKrBuy != null ? allKrBuy : 0);
  const usAcctBuy = buySum(usAccount, `us-${usBroker}`, quotes, qtyMap); // USD
  const krAcctBuy = buySum(krAccount, `kr-${krBroker}`, quotes, qtyMap); // KRW

  return (
    <div className="wrap">
      <div className="topbar">
        <span className="brand">
          한국/미국 주식 대시보드<span className="blink">_</span>
        </span>
        <span className="spacer" />
        <span className="meta">
          <span className={`status-dot ${status}`} />
          {status === "loading" && "불러오는 중…"}
          {status === "live" && `실시간 · ${okCount}/${totalCount} 수신`}
          {status === "error" && "갱신 실패 (다음 주기 재시도)"}
        </span>
        <span className="meta">
          마지막 갱신: {updatedAt ? new Date(updatedAt).toLocaleTimeString("ko-KR", { hour12: false }) : "-"}
        </span>
        <span className="meta">· 30초 자동 갱신</span>
      </div>

      <SummaryBar quotes={quotes} />

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          <BuySumBar
            primary={krw(grandBuyKrw)}
            secondary={fxRate ? `≈ ${usd(grandBuyKrw / fxRate)}` : null}
            breakdown={`미국 ${allUsBuy != null ? usd(allUsBuy) : "-"}${allUsBuy != null && fxRate ? ` (${krw(allUsBuy * fxRate)})` : ""} · 한국 ${allKrBuy != null ? krw(allKrBuy) : "-"}`}
          />

          <div className="section-title">미국 주식 · 보유 합산 (동일 종목 통합)</div>
          <HoldingGrid holdings={usMerged} quotes={quotes} fxRate={fxRate} ctx="all-us" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} />

          <div className="section-title">한국 주식 · 보유 합산 (동일 종목 통합)</div>
          <HoldingGrid holdings={krMerged} quotes={quotes} fxRate={fxRate} ctx="all-kr" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} />
        </>
      )}

      {tab === "us" && (
        <>
          <div className="subtabs">
            {MARKETS.us.brokers.map((b) => (
              <button key={b} className={b === usBroker ? "active" : ""} onClick={() => setUsBroker(b)}>
                {MARKETS.us.brokerLabel[b]}
              </button>
            ))}
          </div>
          <BuySumBar
            primary={usAcctBuy != null ? usd(usAcctBuy) : "-"}
            secondary={usAcctBuy != null && fxRate ? `· ${krw(usAcctBuy * fxRate)}` : null}
          />
          <HoldingGrid holdings={usAccount} quotes={quotes} fxRate={fxRate} ctx={`us-${usBroker}`} qtyMap={qtyMap} setQty={setQty} onOpen={openChart} />
        </>
      )}

      {tab === "kr" && (
        <>
          <div className="subtabs">
            {MARKETS.kr.brokers.map((b) => (
              <button key={b} className={b === krBroker ? "active" : ""} onClick={() => setKrBroker(b)}>
                {MARKETS.kr.brokerLabel[b]}
              </button>
            ))}
          </div>
          <BuySumBar
            primary={krAcctBuy != null ? krw(krAcctBuy) : "-"}
            secondary={krAcctBuy != null && fxRate ? `≈ ${usd(krAcctBuy / fxRate)}` : null}
          />
          <HoldingGrid holdings={krAccount} quotes={quotes} fxRate={fxRate} ctx={`kr-${krBroker}`} qtyMap={qtyMap} setQty={setQty} onOpen={openChart} />
        </>
      )}

      {tab === "sim" && (
        <SimTab
          market={simMarket}
          setMarket={setSimMarket}
          stocks={simStocks}
          ticker={simTicker}
          setTicker={setSimTicker}
          qty={simQty}
          setQty={setSimQty}
          quotes={quotes}
          fxRate={fxRate}
        />
      )}

      <div className="footer-note">
        데이터: Yahoo Finance 공개 엔드포인트 (API 키 불필요) · 가격 라이브, 보유 수량은 입력 데이터 기준 · 평가금액 = 선택 수량 × 현재가.
        <br />
        받아오지 못한 항목은 "데이터 없음"으로 표시됩니다. 카드를 클릭하면 가격 추이 차트가 열립니다. (USD↔₩ 환산은 실시간 원·달러 환율 적용)
      </div>

      {target ? <ChartModal target={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
