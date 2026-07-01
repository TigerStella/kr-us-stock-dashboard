"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchIncomeStatement } from "../lib/financials";

const compact = (v) =>
  v == null ? "-" : Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + "만" : Math.round(v).toLocaleString("ko-KR");

export default function IncomeStatementChart({ market, ticker, name }) {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null });
    fetchIncomeStatement(market, ticker)
      .then((res) => alive && setState({ loading: false, data: res }))
      .catch(() => alive && setState({ loading: false, data: { ok: false, annual: [] } }));
    return () => {
      alive = false;
    };
  }, [market, ticker]);

  const rows = useMemo(() => state.data?.annual ?? [], [state.data]);
  const unit = state.data?.unit ?? "";

  return (
    <div className="slide">
      <div className="slide-head">
        <span className="slide-title">손익계산서 · 연간</span>
        {unit ? <span className="slide-unit">매출 단위: {unit}</span> : null}
      </div>

      {state.loading ? (
        <div className="chart-msg">불러오는 중…</div>
      ) : !state.data?.ok || rows.length === 0 ? (
        <div className="chart-msg">손익 데이터 없음 · {name}</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={rows} margin={{ top: 16, right: 12, left: 6, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis
              yAxisId="rev"
              width={52}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={compact}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              width={44}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, n) =>
                n === "매출액" ? `${compact(value)} ${unit}` : `${value}%`
              }
              contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border-bright)", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="rev" dataKey="revenue" name="매출액" fill="#93C5A6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="pct" dataKey="opMargin" name="영업이익률" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line yAxisId="pct" dataKey="netMargin" name="순이익률" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
