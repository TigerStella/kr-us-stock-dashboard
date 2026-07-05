"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sparkline from "./Sparkline";
import { SYMBOLS } from "./symbols";
import {
  MARKETS,
  yahooSymbol,
  mergeMarket,
  brokerHoldings,
} from "./portfolios";
import InlineChartPanel from "./components/InlineChartPanel";
import SimulationPanel from "./components/SimulationPanel";
import DrawdownPanel from "./components/DrawdownPanel";
import DividendChart from "./components/DividendChart";
import DividendTab from "./components/DividendTab";
import SortableGrid from "./components/SortableGrid";
import BuyLogTab from "./components/BuyLogTab";
import { fetchDividendMap } from "./lib/financials";
import {
  usd,
  krw,
  krwNum,
  num2,
  pct,
  signNum,
  shFmt,
  dirClass,
  arrow,
} from "./lib/format";

const REFRESH_MS = 30000;
const INDEX_DEFS = SYMBOLS.filter((s) => s.group === "index");
const FX_DEFS = SYMBOLS.filter((s) => s.group === "fx");

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

const fmtDivMonths = (months) => months.slice().sort((a, b) => a - b).map((m) => `${m}`).join("·") + "월";

// ── 보유 종목 카드 ──
function HoldingCard({ holding, quote, fxRate, qtyVal, onQty, onOpen, onRemove, dividend }) {
  const q = quote;
  const isKR = holding.market === "kr";
  const held = holding.shares;
  const selectedQty = qtyVal ?? held;
  const baseOptions = useMemo(() => qtyOptions(held), [held]);
  // 현재 선택 수량이 프리셋에 없으면(붙여넣기·누적 등) 옵션에 포함해 표시
  const options = useMemo(() => {
    const set = new Set(baseOptions);
    if (typeof selectedQty === "number" && selectedQty > 0) set.add(selectedQty);
    return Array.from(set).sort((a, b) => a - b);
  }, [baseOptions, selectedQty]);
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
          {dividend ? (
            <div className="card-div">
              <span className="cd-k">배당 {fmtDivMonths(dividend.months)}</span>
              <span className="cd-v">
                {(() => { const a = selectedQty * dividend.perShare; return isKR ? krw(a) : usd(a); })()}
                <span className="cd-y">/년</span>
              </span>
            </div>
          ) : null}
          <div className="spark-wrap">
            <Sparkline data={q.spark} positive={q.change >= 0} />
          </div>
          <div className="card-hint">클릭 → 차트 · 꾹 눌러 이동 · ← 밀어 삭제</div>
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

// ── 종목 추가 입력 (미국/한국 공용) ──
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
    return <button className="addbtn" onClick={() => setOpen(true)}>{label}</button>;
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
function CustomSection({ market, holdings, quotes, fxRate, qtyMap, setQty, onOpen, onAdd, onRemove, dividends, cardOrder, onReorder, onSwipeDelete }) {
  return (
    <>
      <div className="section-title-row">
        <div className="section-title">직접 추가 종목</div>
        <div className="section-actions">
          <AddTicker market={market} onAdd={onAdd} />
        </div>
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
          dividends={dividends}
          cardOrder={cardOrder}
          onReorder={onReorder}
          onSwipeDelete={onSwipeDelete}
        />
      ) : (
        <div className="empty-note">+ 종목 추가 버튼을 눌러 티커를 입력하면 카드가 생성됩니다. (전체 탭에도 반영됩니다)</div>
      )}
    </>
  );
}

// 저장된 순서(order: ticker 배열)로 정렬. 순서에 없는 항목은 원래 순서로 뒤에.
function applyOrder(list, order) {
  if (!order || !order.length) return list;
  const idx = new Map(order.map((t, i) => [t, i]));
  return list
    .map((h, i) => ({ h, i }))
    .sort((a, b) => {
      const ia = idx.has(a.h.ticker) ? idx.get(a.h.ticker) : Infinity;
      const ib = idx.has(b.h.ticker) ? idx.get(b.h.ticker) : Infinity;
      return ia !== ib ? ia - ib : a.i - b.i;
    })
    .map((x) => x.h);
}

function HoldingGrid({ holdings, quotes, fxRate, ctx, qtyMap, setQty, onOpen, onRemove, dividends, cardOrder, onReorder, onSwipeDelete, hidden }) {
  const visible = hidden ? holdings.filter((h) => !hidden.has(h.ticker)) : holdings;
  const order = cardOrder ? cardOrder[ctx] : null;
  const ordered = applyOrder(visible, order);

  const renderItem = (h) => {
    const key = `${ctx}:${h.ticker}`;
    return (
      <HoldingCard
        holding={h}
        quote={quotes[h.yahoo]}
        fxRate={fxRate}
        qtyVal={qtyMap[key]}
        onQty={(v) => setQty(key, v)}
        onOpen={onOpen}
        onRemove={onRemove && h.custom ? () => onRemove(h) : undefined}
        dividend={dividends ? dividends[h.yahoo] : null}
      />
    );
  };

  if (!onReorder) {
    return <div className="grid">{ordered.map((h) => <div key={`${ctx}:${h.ticker}`}>{renderItem(h)}</div>)}</div>;
  }
  return (
    <SortableGrid
      items={ordered}
      onReorder={(tickers) => onReorder(ctx, tickers)}
      onSwipeDelete={onSwipeDelete}
      renderItem={renderItem}
    />
  );
}

const TABS = [
  { key: "all", label: "전체" },
  { key: "us", label: "미국" },
  { key: "kr", label: "한국" },
  { key: "sim", label: "시뮬레이션" },
  { key: "div", label: "배당" },
  { key: "log", label: "매수일지" },
];

const ALL_SUBS = [
  { key: "all", label: "전체" },
  { key: "us", label: "미국" },
  { key: "kr", label: "한국" },
];

export default function Page() {
  const [quotes, setQuotes] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("all");
  const [allSub, setAllSub] = useState("all");
  const [usBroker, setUsBroker] = useState("M");
  const [krBroker, setKrBroker] = useState("M");
  const [qtyMap, setQtyMap] = useState({});
  const [selectedChartYahoo, setSelectedChartYahoo] = useState(null);
  const [customHoldings, setCustomHoldings] = useState({ us: [], kr: [] });
  const [simItems, setSimItems] = useState([]);
  const [cardOrder, setCardOrder] = useState({}); // ctx -> [ticker]
  const [hidden, setHidden] = useState({ us: [], kr: [] }); // 스와이프 삭제(숨김)
  const [buyLog, setBuyLog] = useState([]); // 매수일지
  const [hydrated, setHydrated] = useState(false);
  const simSeq = useRef(0);
  const logSeq = useRef(0);
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
      const co = localStorage.getItem("ksd:cardOrder");
      if (co) { const p = JSON.parse(co); if (p && typeof p === "object") setCardOrder(p); }
      const hd = localStorage.getItem("ksd:hidden");
      if (hd) { const p = JSON.parse(hd); if (p && Array.isArray(p.us) && Array.isArray(p.kr)) setHidden(p); }
      const bl = localStorage.getItem("ksd:buyLog");
      if (bl) {
        const p = JSON.parse(bl);
        if (Array.isArray(p)) { setBuyLog(p); logSeq.current = p.reduce((m, it) => Math.max(m, it.id || 0), 0); }
      }
      const qm = localStorage.getItem("ksd:qtyMap");
      if (qm) { const p = JSON.parse(qm); if (p && typeof p === "object") setQtyMap(p); }
    } catch (e) {
      /* 손상된 저장값 무시 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:customHoldings", JSON.stringify(customHoldings)); } catch (e) {}
  }, [customHoldings, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:simItems", JSON.stringify(simItems)); } catch (e) {}
  }, [simItems, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:cardOrder", JSON.stringify(cardOrder)); } catch (e) {}
  }, [cardOrder, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:hidden", JSON.stringify(hidden)); } catch (e) {}
  }, [hidden, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:buyLog", JSON.stringify(buyLog)); } catch (e) {}
  }, [buyLog, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("ksd:qtyMap", JSON.stringify(qtyMap)); } catch (e) {}
  }, [qtyMap, hydrated]);

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

  // 배당 실데이터 (Yahoo) — 보유 종목이 바뀔 때만 조회
  const [dividendMap, setDividendMap] = useState({});
  const dividendKey = useMemo(
    () => allHoldings.map((h) => h.yahoo).sort().join(","),
    [allHoldings]
  );
  useEffect(() => {
    let alive = true;
    const syms = allHoldings.map((h) => h.yahoo);
    if (!syms.length) return;
    fetchDividendMap(syms).then((m) => alive && setDividendMap(m)).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dividendKey]);

  const setQty = (key, v) => setQtyMap((m) => ({ ...m, [key]: v }));

  // 인라인 차트에서 보여줄 선택 종목 (yahoo 심볼 기준으로 보유목록에서 해석)
  const chartSel = useMemo(() => {
    if (selectedChartYahoo) {
      const found = allHoldings.find((h) => h.yahoo === selectedChartYahoo);
      if (found) return found;
    }
    return allHoldings[0] || null;
  }, [selectedChartYahoo, allHoldings]);
  const openChart = (h) => setSelectedChartYahoo(h.yahoo);

  // 직접 추가 / 삭제
  const addCustom = (market, rawTicker, shares = 1) => {
    let t = rawTicker.trim();
    if (!t) return;
    if (market === "us") t = t.toUpperCase();
    const dupCustom = customHoldings[market].some((h) => h.ticker === t);
    const dupHeld = (market === "us" ? usMerged : krMerged).some((h) => h.ticker === t);
    if (dupCustom || dupHeld) return; // 이미 있는 종목이면 무시
    setCustomHoldings((c) => ({ ...c, [market]: [...c[market], { ticker: t, shares: shares > 0 ? shares : 1 }] }));
  };
  const removeCustom = (h) => {
    setCustomHoldings((c) => ({ ...c, [h.market]: c[h.market].filter((x) => x.ticker !== h.ticker) }));
  };

  // 카드 순서 이동 / 스와이프 삭제(숨김)
  const reorderCards = (ctx, tickers) => setCardOrder((o) => ({ ...o, [ctx]: tickers }));
  const swipeDelete = (h) => {
    if (h.custom) { removeCustom(h); return; }
    setHidden((hd) => ({ ...hd, [h.market]: hd[h.market].includes(h.ticker) ? hd[h.market] : [...hd[h.market], h.ticker] }));
  };
  const restoreHidden = (market) => setHidden((hd) => ({ ...hd, [market]: [] }));
  const hiddenSet = useMemo(() => ({ us: new Set(hidden.us), kr: new Set(hidden.kr) }), [hidden]);

  // 매수일지 삭제/초기화
  const removeLog = (id) => setBuyLog((l) => l.filter((x) => x.id !== id));
  const clearLog = () => setBuyLog([]);

  // 매수일지 계좌·종목 목록 (입력 폼용)
  const logAccounts = useMemo(() => ({
    us: MARKETS.us.brokers.map((b) => ({ key: b, label: MARKETS.us.brokerLabel[b] })),
    kr: MARKETS.kr.brokers.map((b) => ({ key: b, label: MARKETS.kr.brokerLabel[b] })),
  }), []);
  const logKnown = useMemo(() => ({
    us: usAll.map((h) => ({ ticker: h.ticker, name: h.name })),
    kr: krAll.map((h) => ({ ticker: h.ticker, name: h.name })),
  }), [usAll, krAll]);

  // 매수/매도 1건 반영: 해당 계좌 수량 +(매수)/−(매도), 매수일지 기록
  const addLogEntry = ({ market, broker, ticker, name, side, shares, amount }) => {
    const t = market === "us" ? String(ticker).toUpperCase() : String(ticker);
    const delta = side === "sell" ? -shares : shares;
    const mergedList = market === "us" ? usMerged : krMerged;
    const acctHoldings = brokerHoldings(market, broker); // 선택 계좌 보유
    const inAcct = acctHoldings.find((h) => h.ticker === t);
    const inMerged = mergedList.find((h) => h.ticker === t);
    const inCustom = customHoldings[market].find((h) => h.ticker === t);
    const clamp = (v) => Math.max(0, v);
    const accCtx = `${market}-${broker}:${t}`;
    const allCtx = `all-${market}:${t}`;

    if (inAcct) {
      setQty(accCtx, clamp((qtyMap[accCtx] ?? inAcct.shares) + delta));
      setQty(allCtx, clamp((qtyMap[allCtx] ?? (inMerged?.shares ?? 0)) + delta));
    } else if (inMerged) {
      setQty(allCtx, clamp((qtyMap[allCtx] ?? inMerged.shares) + delta)); // 다른 계좌 보유 → 전체만 반영
    } else if (inCustom) {
      const cCtx = `custom-${market}:${t}`;
      setQty(cCtx, clamp((qtyMap[cCtx] ?? inCustom.shares) + delta));
      setQty(allCtx, clamp((qtyMap[allCtx] ?? inCustom.shares) + delta));
    } else if (delta > 0) {
      addCustom(market, t, delta); // 신규 매수 → 직접 추가
    }

    const resolvedName = (inAcct || inMerged || inCustom)?.name || name || t;
    setBuyLog((prev) => [
      { id: ++logSeq.current, date: new Date().toISOString().slice(0, 10), market, broker, account: MARKETS[market].brokerLabel[broker] ?? broker, ticker: t, name: resolvedName, side, shares, amount: amount ?? null },
      ...prev,
    ]);
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
          <InlineChartPanel
            options={allHoldings}
            selected={chartSel}
            onSelect={(h) => setSelectedChartYahoo(h.yahoo)}
            quotes={quotes}
          />

          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={t.key === tab ? "active" : ""} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "all" && (
            <>
              <div className="subtabs">
                {ALL_SUBS.map((s) => (
                  <button key={s.key} className={s.key === allSub ? "active" : ""} onClick={() => setAllSub(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>

              {allSub === "all" && (
                <BuySumBar
                  primary={krw(grandBuyKrw)}
                  secondary={fxRate ? `≈ ${usd(grandBuyKrw / fxRate)}` : null}
                  breakdown={`미국 ${allUsBuy != null ? usd(allUsBuy) : "-"}${allUsBuy != null && fxRate ? ` (${krw(allUsBuy * fxRate)})` : ""} · 한국 ${allKrBuy != null ? krw(allKrBuy) : "-"}`}
                />
              )}
              {allSub === "us" && (
                <BuySumBar
                  primary={allUsBuy != null ? usd(allUsBuy) : "-"}
                  secondary={allUsBuy != null && fxRate ? `· ${krw(allUsBuy * fxRate)}` : null}
                  breakdown="모든 계좌의 미국 주식 통합"
                />
              )}
              {allSub === "kr" && (
                <BuySumBar
                  primary={allKrBuy != null ? krw(allKrBuy) : "-"}
                  secondary={allKrBuy != null && fxRate ? `≈ ${usd(allKrBuy / fxRate)}` : null}
                  breakdown="모든 계좌의 한국 주식 통합"
                />
              )}

              {(allSub === "all" || allSub === "us") && (
                <>
                  <div className="section-title">미국 주식 · 전 계좌 통합</div>
                  <HoldingGrid holdings={usAll} quotes={quotes} fxRate={fxRate} ctx="all-us" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} onRemove={removeCustom} dividends={dividendMap} cardOrder={cardOrder} onReorder={reorderCards} onSwipeDelete={swipeDelete} hidden={hiddenSet.us} />
                  {hidden.us.length ? <button className="restore-hidden" onClick={() => restoreHidden("us")}>숨긴 미국 종목 {hidden.us.length}개 복원</button> : null}
                </>
              )}
              {(allSub === "all" || allSub === "kr") && (
                <>
                  <div className="section-title">한국 주식 · 전 계좌 통합</div>
                  <HoldingGrid holdings={krAll} quotes={quotes} fxRate={fxRate} ctx="all-kr" qtyMap={qtyMap} setQty={setQty} onOpen={openChart} onRemove={removeCustom} dividends={dividendMap} cardOrder={cardOrder} onReorder={reorderCards} onSwipeDelete={swipeDelete} hidden={hiddenSet.kr} />
                  {hidden.kr.length ? <button className="restore-hidden" onClick={() => restoreHidden("kr")}>숨긴 한국 종목 {hidden.kr.length}개 복원</button> : null}
                </>
              )}
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
              <HoldingGrid holdings={usAccount} quotes={quotes} fxRate={fxRate} ctx={`us-${usBroker}`} qtyMap={qtyMap} setQty={setQty} onOpen={openChart} dividends={dividendMap} cardOrder={cardOrder} onReorder={reorderCards} onSwipeDelete={swipeDelete} hidden={hiddenSet.us} />
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
                dividends={dividendMap}
                cardOrder={cardOrder}
                onReorder={reorderCards}
                onSwipeDelete={swipeDelete}
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
              <HoldingGrid holdings={krAccount} quotes={quotes} fxRate={fxRate} ctx={`kr-${krBroker}`} qtyMap={qtyMap} setQty={setQty} onOpen={openChart} dividends={dividendMap} cardOrder={cardOrder} onReorder={reorderCards} onSwipeDelete={swipeDelete} hidden={hiddenSet.kr} />
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
                dividends={dividendMap}
                cardOrder={cardOrder}
                onReorder={reorderCards}
                onSwipeDelete={swipeDelete}
              />
            </>
          )}

          {tab === "sim" && (
            <SimulationPanel
              items={simItems}
              options={simOptions}
              quotes={quotes}
              fxRate={fxRate}
              dividends={dividendMap}
              addItem={addSimItem}
              updateItem={updateSimItem}
              removeItem={removeSimItem}
            />
          )}

          {tab === "div" && (
            <DividendTab
              simItems={simItems}
              options={simOptions}
              dividends={dividendMap}
              fxRate={fxRate}
              addItem={addSimItem}
              updateItem={updateSimItem}
              removeItem={removeSimItem}
            />
          )}

          {tab === "log" && (
            <BuyLogTab
              log={buyLog}
              onAddEntry={addLogEntry}
              onRemoveEntry={removeLog}
              onClear={clearLog}
              accounts={logAccounts}
              known={logKnown}
            />
          )}

          {tab !== "div" && tab !== "log" && (
            <DividendChart holdings={allHoldings} fxRate={fxRate} dividends={dividendMap} />
          )}

          <div className="footer-note">
            데이터: Yahoo Finance 공개 엔드포인트 (API 키 불필요) · 가격 라이브, 보유 수량은 입력 데이터 기준 · 평가금액 = 선택 수량 × 현재가.
            <br />
            카드를 클릭하면 상단 차트가 해당 종목으로 전환됩니다 (캔들·이동평균·볼린저밴드·RSI·손익계산서). 손익·배당·영업이익률은 Yahoo 실데이터(일부 미커버 종목은 자동 폴백). (USD↔₩ 환산은 실시간 원·달러 환율 적용)
          </div>
        </div>

        <DrawdownPanel holdings={allHoldings} quotes={quotes} />
      </div>
    </div>
  );
}
