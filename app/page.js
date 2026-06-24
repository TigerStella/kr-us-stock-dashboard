"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LineChart from "./LineChart";
import Sparkline from "./Sparkline";

const REFRESH_MS = 30000;
const GROUP_LABEL = {
  index: "미국 주요 지수",
  kr: "한국 시총 TOP 5",
  stock: "미국 대표 종목",
  fx: "환율",
};
const GROUP_ORDER = ["index", "kr", "stock", "fx"];
const RANGE_OPTIONS = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "1mo", label: "1개월" },
  { key: "6mo", label: "6개월" },
  { key: "1y", label: "1년" },
];

function fmtPrice(v, group) {
  if (typeof v !== "number") return "-";
  if (group === "fx") return v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (group === "kr") return v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function priceUnit(group) {
  if (group === "kr") return "원";
  if (group === "fx") return "";
  return "";
}
function fmtSign(v, digits = 2) {
  if (typeof v !== "number") return "-";
  const s = v > 0 ? "+" : v < 0 ? "" : "";
  return s + v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function dirClass(change) {
  if (typeof change !== "number" || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}
function arrow(change) {
  if (typeof change !== "number" || change === 0) return "■";
  return change > 0 ? "▲" : "▼";
}

function QuoteCard({ q, onClick }) {
  if (!q.ok) {
    return (
      <div className="card unavailable">
        <span className="tag">{GROUP_LABEL[q.group]}</span>
        <div className="row1">
          <span className="sym">{q.symbol}</span>
        </div>
        <div className="name">{q.name}</div>
        <div className="nodata">
          데이터 없음
          {q.error ? <small>{q.error}</small> : null}
        </div>
      </div>
    );
  }
  const dc = dirClass(q.change);
  const chgDigits = q.group === "kr" ? 0 : 2;
  return (
    <div className="card clickable" onClick={() => onClick?.(q)}>
      <span className="tag">{GROUP_LABEL[q.group]}</span>
      <div className="row1">
        <span className="sym">{q.symbol}</span>
      </div>
      <div className="name">{q.name}</div>
      <div className="price">
        {fmtPrice(q.price, q.group)}
        {priceUnit(q.group) ? <span className="unit"> {priceUnit(q.group)}</span> : null}
      </div>
      <div className={`change ${dc}`}>
        {arrow(q.change)} {fmtSign(q.change, chgDigits)}{" "}
        {typeof q.changePercent === "number" ? `(${fmtSign(q.changePercent)}%)` : ""}
      </div>
      <div className="spark-wrap">
        <Sparkline data={q.spark} positive={q.change >= 0} />
      </div>
    </div>
  );
}

function ChartModal({ quote, onClose }) {
  const [range, setRange] = useState("1mo");
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fetch(`/api/chart?symbol=${encodeURIComponent(quote.symbol)}&range=${range}`)
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
  }, [quote.symbol, range]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div>
            <div className="sym" style={{ fontSize: 12 }}>{quote.symbol}</div>
            <div style={{ fontSize: 18, marginTop: 2 }}>{quote.name}</div>
            <div className={`change ${dirClass(quote.change)}`} style={{ marginTop: 6 }}>
              {fmtPrice(quote.price, quote.group)} &nbsp; {arrow(quote.change)} {fmtSign(quote.change)}{" "}
              {typeof quote.changePercent === "number" ? `(${fmtSign(quote.changePercent)}%)` : ""}
            </div>
          </div>
          <button className="x" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="ranges">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              className={r.key === range ? "active" : ""}
              onClick={() => setRange(r.key)}
            >
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

export default function Page() {
  const [quotes, setQuotes] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | live | error
  const [selected, setSelected] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes", { cache: "no-store" });
      const json = await res.json();
      setQuotes(json.quotes || []);
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

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: quotes.filter((q) => q.group === g),
  })).filter((s) => s.items.length > 0);

  const okCount = quotes.filter((q) => q.ok).length;

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
          {status === "live" && `실시간 · ${okCount}/${quotes.length} 수신`}
          {status === "error" && "갱신 실패 (다음 주기에 재시도)"}
        </span>
        <span className="meta">
          마지막 갱신:{" "}
          {updatedAt
            ? new Date(updatedAt).toLocaleTimeString("ko-KR", { hour12: false }) +
              " (" +
              new Date(updatedAt).toLocaleDateString("ko-KR") +
              ")"
            : "-"}
        </span>
        <span className="meta">· 30초마다 자동 갱신</span>
      </div>

      {grouped.length === 0 ? (
        <div className="chart-msg" style={{ height: 200 }}>
          {status === "error" ? "데이터를 불러오지 못했습니다" : "불러오는 중…"}
        </div>
      ) : (
        grouped.map((sec) => (
          <section key={sec.group}>
            <div className="section-title">{GROUP_LABEL[sec.group]}</div>
            <div className="grid">
              {sec.items.map((q) => (
                <QuoteCard key={q.symbol} q={q} onClick={setSelected} />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="footer-note">
        데이터: Yahoo Finance 공개 엔드포인트 (API 키 불필요) · 가격은 거래소 사정에 따라 지연될 수 있습니다.
        <br />
        가짜 데이터 없음 — 받아오지 못한 항목은 "데이터 없음"으로 표시됩니다. 카드를 클릭하면 가격 추이 차트가 열립니다.
      </div>

      {selected ? <ChartModal quote={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
