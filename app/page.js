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
// 직접 추가 종목: 종목명은 라이브 시세(meta)에서 채움, 없으면 티커.
function decorateCustom(list, market, quotes) {
  return list.map((h) => {
    const yahoo = yahooSymbol(market, h.ticker);
    return { ...h, market, yahoo, custom: true, name: quotes[yahoo]?.name || h.ticker };
  });
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
function HoldingCard({ holding, quote, fxRate, qtyVal, onQty, onOpen, onRemove }) {
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
          {holding.custom ? <span className="custbadge" title="직접 추가">+</span> : null}
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
        <div className="card-top-right" onClick={(e) => e.stopPropagation()}>
          <div className="qtybox">
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
          {onRemove ? (
            <button className="cardx" title="삭제" onClick={onRemove}>✕</button>
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

// ── 종목 추가 입력 (미국/한국/시뮬레이션 공용) ──
function AddTicker({ market, onAdd, label = "+ 종목 추가" }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const submit = () => {
    const t = val.trim();
    if (t) onAdd(t);
    setVal("");
    setOpen(false);
  };
  if (!open) {
    return (
      <button className="addbtn" onClick={() => setOpen(true)}>{label}</button>
    );
  }
  return (
    <div className="addform">
      <input
        autoFocus
        placeholder={market === "us" ? "티커 (예: AAPL)" : "종목코드 (예: 005930)"}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setOpen(false); setVal(""); }
        }}
      />
      <button className="addform-ok" onClick={submit}>추가</button>
      <button className="addform-cancel" onClick={() => { setOpen(false); setVal(""); }}>취소</button>
    </div>
  );
}

// ── 직접 추가 종목 섹션 (미국/한국 탭) ──
function CustomSection({ market, holdings, quotes, fxRate, qtyMap, setQty, onOpen, onAdd, onRemove }) {
  return (
    <>
      <div className="section-title-row">
        <div className="section-title">직접 추가 종목</div>
        <AddTicker market={market} onAdd={onAdd} />
      </div>
      {holdings.length ? (
        <HoldingGrid
          holdings={holdings}
          quotes={quotes}
          fxRate={fxRate}
          ctx={`custom-${market}`}
          qtyMap={qtyMap}
          setQty={setQty}
          onOpen={onOpen}
          onRemove={onRemove}
        />
      ) : (
        <div className="empty-note">+ 종목 추가 버튼을 눌러 티커를 입력하면 카드가 생성됩니다. (전체 탭에도 반영됩니다)</div>
      )}
    </>
  );
}

// ── 하락 TOP 10 사이드 패널 ──
function DrawdownPanel({ holdings, quotes }) {
  const rows = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const h of holdings) {
      if (seen.has(h.yahoo)) continue;
      seen.add(h.yahoo);
      const q = quotes[h.yahoo];
      if (!q?.ok || typeof q.fiftyTwoWeekHigh !== "number" || !q.fiftyTwoWeekHigh) continue;
      const dd = ((q.price - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100;
      out.push({
        ticker: h.ticker,
        name: h.name,
        market: h.market,
        price: q.price,
        dd,
        dayPct: q.changePercent,
      });
    }
    out.sort((a, b) => a.dd - b.dd);
    return out.slice(0, 10);
  }, [holdings, quotes]);

  return (
    <aside className="side-col">
      <div className="dd-panel">
        <div className="dd-title">보유종목 하락 TOP 10</div>
        <div className="dd-sub">52주 최고점 대비 하락폭 기준</div>
        {rows.length === 0 ? (
          <div className="dd-empty">데이터 수신 대기 중…</div>
        ) : (
          <div className="dd-table">
            <div className="dd-head">
              <span className="dd-c-name">종목</span>
              <span className="dd-c-price">현재가</span>
              <span className="dd-c-pct">최고점비</span>
              <span className="dd-c-pct">전일비</span>
            </div>
            {rows.map((r, i) => (
              <div className="dd-row" key={r.market + r.ticker}>
                <span className="dd-c-name">
                  <span className="dd-rank">{i + 1}</span>
                  <span className="dd-tk">{r.ticker}</span>
                  <span className="dd-nm">{r.name}</span>
                </span>
                <span className="dd-c-price">
                  {r.market === "kr" ? krw(r.price) : usd(r.price)}
                </span>
                <span className={`dd-c-pct ${dirClass(r.dd)}`}>{pct(r.dd)}</span>
                <span className={`dd-c-pct ${dirClass(r.dayPct)}`}>{pct(r.dayPct)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
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

// ── 시뮬레이션 한 행 ──
function SimItemRow({ item, options, quotes, fxRate, onChange, onRemove }) {
  const stocks = options[item.market] || [];
  const sel = stocks.find((s) => s.ticker === item.ticker) || stocks[0];
  const isKR = item.market === "kr";
  const q = sel ? quotes[yahooSymbol(item.market, sel.ticker)] : null;
  const price = q?.ok ? q.price : null;
  const amount = price != null ? item.qty * price : null;

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
          value={item.qty}
          onChange={(e) => {
            let v = parseFloat(e.target.value);
            if (!Number.isFinite(v) || v < 0) v = 0;
            onChange({ qty: v });
          }}
        />
        <button className="cardx" title="삭제" onClick={onRemove}>✕</button>
      </div>
      <div className="sim-item-amt">
        {sel ? <span className="sim-item-nm">{sel.name} · {shFmt(item.qty)}주 × {price != null ? (isKR ? krw(price) : usd(price)) : "-"}</span> : null}
        <span className="sim-item-val">
          {price != null ? (
            <>
              <b>{isKR ? krw(amount) : usd(amount)}</b>
              {!isKR && fxRate ? <span className="krw"> · {krw(amount * fxRate)}</span> : null}
            </>
          ) : (
            <span className="flat">시세 없음</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── 시뮬레이션 탭 ──
function SimTab({ items, options, quotes, fxRate, addItem, updateItem, removeItem }) {
  let totalKrw = 0;
  let any = false;
  for (const it of items) {
    const stocks = options[it.market] || [];
    const sel = stocks.find((s) => s.ticker === it.ticker) || stocks[0];
    if (!sel) continue;
    const q = quotes[yahooSymbol(it.market, sel.ticker)];
    if (q?.ok) {
      const native = it.qty * q.price;
      const k = it.market === "kr" ? native : (fxRate ? native * fxRate : 0);
      totalKrw += k;
      any = true;
    }
  }

  return (
    <div className="sim">
      <div className="grandtotal">
        <span>합계금액</span>
        <b>{any ? krw(totalKrw) : "-"}</b>
        {any && fxRate ? <span className="sub">≈ {usd(totalKrw / fxRate)}</span> : null}
        <span className="sub2">{items.length}개 종목 합산</span>
      </div>

      {items.map((it) => (
        <SimItemRow
          key={it.id}
          item={it}
          options={options}
          quotes={quotes}
          fxRate={fxRate}
          onChange={(patch) => updateItem(it.id, patch)}
          onRemove={() => removeItem(it.id)}
        />
      ))}

      <div className="sim-addrow">
        <button className="addbtn" onClick={addItem}>+ 종목 추가</button>
      </div>

      <div className="footer-note">
        시뮬레이션은 보유 대시보드와 독립된 계산입니다. 시세·환율은 동일 라이브 데이터를 사용합니다. 종목을 추가하면 최상단 합계금액에 합산됩니다. (미국 종목은 $와 ₩ 동시 표시, 한국 종목은 ₩)
      </div>
    </div>
  );
}

function HoldingGrid({ holdings, quotes, fxRate, ctx, qtyMap, setQty, onOpen, onRemove }) {
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
            onRemove={onRemove && h.custom ? () => onRemove(h) : undefined}
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
  const [customHoldings, setCustomHoldings] = useState({ us: [], kr: [] });
  const [simItems, setSimItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const simSeq = useRef(0);
  const timer = useRef(null);

  // 새로고침/재방문 시 복원 (mount 시 1회) — SSR 하이드레이션 미스매치 방지
  useEffect(() => {
    try {
      const ch = localStorage.getItem("ksd:customHoldings");
      if (ch) {
        const parsed = JSON.parse(ch);
        if (parsed && Array.isArray(parsed.us) && Array.isArray(parsed.kr)) setCustomHoldings(parsed);
      }
      const si = localStorage.getItem("ksd:simItems");
      if (si) {
        const parsed = JSON.parse(si);
        if (Array.isArray(parsed)) {
          setSimItems(parsed);
          simSeq.current = parsed.reduce((m, it) => Math.max(m, it.id || 0), 0);
        }
      }
    } catch (e) {
      /* 손상된 저장값 무시 */
    }
    setHydrated(true);
  }, []);

  // 변경 시 저장 (복원 완료 후에만)
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:customHoldings", JSON.stringify(customHoldings)); } catch (e) {}
  }, [customHoldings, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:simItems", JSON.stringify(simItems)); } catch (e) {}
  }, [simItems, hydrated]);

  // 직접 추가 종목의 yahoo 심볼 → quotes API에 extra로 전달
  const extraSymbols = useMemo(() => {
    const s = new Set();
    for (const m of ["us", "kr"]) {
      for (const h of customHoldings[m]) s.add(yahooSymbol(m, h.ticker));
    }
    return Array.from(s);
  }, [customHoldings]);

  const load = useCallback(async () => {
    try {
      const qs = extraSymbols.length ? `?extra=${encodeURIComponent(extraSymbols.join(","))}` : "";
      const res = await fetch(`/api/quotes${qs}`, { cache: "no-store" });
      const json = await res.json();
      setQuotes(json.quotes || {});
      setUpdatedAt(json.updatedAt || new Date().toISOString());
      setStatus("live");
    } catch (e) {
      setStatus("error");
    }
  }, [extraSymbols]);

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

  const customUs = useMemo(() => decorateCustom(customHoldings.us, "us", quotes), [customHoldings.us, quotes]);
  const customKr = useMemo(() => decorateCustom(customHoldings.kr, "kr", quotes), [customHoldings.kr, quotes]);

  // 전체 탭 / 드롭다운 / 하락 TOP에 쓰이는 합산 목록 (보유 + 직접 추가)
  const usAll = useMemo(() => [...usMerged, ...customUs], [usMerged, customUs]);
  const krAll = useMemo(() => [...krMerged, ...customKr], [krMerged, customKr]);
  const allHoldings = useMemo(() => [...usAll, ...krAll], [usAll, krAll]);

  const simOptions = useMemo(() => ({ us: usAll, kr: krAll }), [usAll, krAll]);

  const setQty = (key, v) => setQtyMap((m) => ({ ...m, [key]: v }));
  const openChart = (h) => {
    const q = quotes[h.yahoo];
    if (!q?.ok) return;
    setTarget({ symbol: h.yahoo, name: h.name, price: q.price, change: q.change, changePercent: q.changePercent, currency: q.currency });
  };

  // 직접 추가 / 삭제
  const addCustom = (market, rawTicker) => {
    let t = rawTicker.trim();
    if (!t) return;
    if (market === "us") t = t.toUpperCase();
    const dupCustom = customHoldings[market].some((h) => h.ticker === t);
    const dupHeld = (market === "us" ? usMerged : krMerged).some((h) => h.ticker === t);
    if (dupCustom || dupHeld) return; // 이미 있는 종목이면 무시
    setCustomHoldings((c) => ({ ...c, [market]: [...c[market], { ticker: t, shares: 1 }] }));
  };
  const removeCustom = (h) => {
    setCustomHoldings((c) => ({ ...c, [h.market]: c[h.market].filter((x) => x.ticker !== h.ticker) }));
  };

  // 시뮬레이션 행 추가/수정/삭제
  const addSimItem = () => {
    const market = "us";
    const first = simOptions[market][0]?.ticker ?? "";
    setSimItems((prev) => [...prev, { id: ++simSeq.current, market, ticker: first, qty: 1 }]);
  };
  const updateSimItem = (id, patch) =>
    setSimItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeSimItem = (id) => setSimItems((prev) => prev.filter((it) => it.id !== id));

  const okCount = Object.values(quotes).filter((q) => q?.ok).length;
  const totalCount = Object.keys(quotes).length;

  // 매수금액 합계(선택 수량 기준, 즉시 반영) — 직접 추가 포함
  const allUsBuy = buySum(usAll, "all-us", quotes, qtyMap); // USD
  const allKrBuy = buySum(krAll, "all-kr", quotes, qtyMap); // KRW
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

      <div className="layout">
        <div className="main-col">
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
              <HoldingGrid holdings={usAll} quotes={quotes} fxRate={fxRate} ctx="all-us" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} onRemove={removeCustom} />

              <div className="section-title">한국 주식 · 보유 합산 (동일 종목 통합)</div>
              <HoldingGrid holdings={krAll} quotes={quotes} fxRate={fxRate} ctx="all-kr" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} onRemove={removeCustom} />
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
              <CustomSection
                market="us"
                holdings={customUs}
                quotes={quotes}
                fxRate={fxRate}
                qtyMap={qtyMap}
                setQty={setQty}
                onOpen={openChart}
                onAdd={(t) => addCustom("us", t)}
                onRemove={removeCustom}
              />
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
              <CustomSection
                market="kr"
                holdings={customKr}
                quotes={quotes}
                fxRate={fxRate}
                qtyMap={qtyMap}
                setQty={setQty}
                onOpen={openChart}
                onAdd={(t) => addCustom("kr", t)}
                onRemove={removeCustom}
              />
            </>
          )}

          {tab === "sim" && (
            <SimTab
              items={simItems}
              options={simOptions}
              quotes={quotes}
              fxRate={fxRate}
              addItem={addSimItem}
              updateItem={updateSimItem}
              removeItem={removeSimItem}
            />
          )}

          <div className="footer-note">
            데이터: Yahoo Finance 공개 엔드포인트 (API 키 불필요) · 가격 라이브, 보유 수량은 입력 데이터 기준 · 평가금액 = 선택 수량 × 현재가.
            <br />
            받아오지 못한 항목은 "데이터 없음"으로 표시됩니다. 카드를 클릭하면 가격 추이 차트가 열립니다. (USD↔₩ 환산은 실시간 원·달러 환율 적용)
          </div>
        </div>

        <DrawdownPanel holdings={allHoldings} quotes={quotes} />
      </div>

      {target ? <ChartModal target={target} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
