"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { krw } from "../lib/format";

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const compactKrw = (v) =>
  v == null ? "-" : Math.abs(v) >= 10000 ? "₩" + (v / 10000).toFixed(0) + "만" : "₩" + Math.round(v).toLocaleString("ko-KR");

// 보유 수량 기준 월별 배당(₩ 환산) 합산. dividends: { [yahoo]: {perShare, months, currency} }
function computeMonthly(holdings, fxRate, dividends) {
  const monthly = new Array(12).fill(0);
  let total = 0;
  let covered = 0;
  for (const h of holdings) {
    const d = dividends[h.yahoo];
    if (!d || !h.shares) continue;
    const annualNative = h.shares * d.perShare;
    const krwAnnual = h.market === "kr" ? annualNative : (fxRate ? annualNative * fxRate : 0);
    if (!krwAnnual) continue;
    const per = krwAnnual / d.months.length;
    for (const m of d.months) {
      if (m >= 1 && m <= 12) monthly[m - 1] += per;
    }
    total += krwAnnual;
    covered++;
  }
  return { data: MONTHS.map((label, i) => ({ month: label, amount: Math.round(monthly[i]) })), total, covered };
}

export default function DividendChart({ holdings, fxRate, dividends = {} }) {
  const { data, total, covered } = useMemo(
    () => computeMonthly(holdings, fxRate, dividends),
    [holdings, fxRate, dividends]
  );
  const hasData = total > 0;

  return (
    <div className="div-section">
      <div className="div-head">
        <span className="div-title">월별 예상 배당 (보유 수량 기준)</span>
        <span className="div-total">연간 합계 <b>{hasData ? krw(total) : "-"}</b></span>
      </div>
      <div className="div-sub">
        최근 1년 실제 배당 이력(Yahoo)이 있는 보유종목 {covered}개를 지급월에 배분해 ₩로 환산·합산했습니다.
      </div>
      {!hasData ? (
        <div className="chart-msg">배당 데이터 없음</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 6, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis width={56} tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={compactKrw} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => [krw(v), "배당"]}
              contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border-bright)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="amount" name="배당" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.amount > 0 ? "#ff6a00" : "#e5e7eb"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
