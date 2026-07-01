"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_MARGIN, Y_AXIS_WIDTH } from "./PriceChart";

function RsiTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.rsi == null) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-h">{d.label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "#7C3AED" }}>RSI(14)</span>
        <span>{d.rsi.toFixed(1)}</span>
      </div>
    </div>
  );
}

// data: PriceChart 와 동일한 배열(같은 x). rsi 필드 사용. 14 미만 구간은 null → 자동 공백.
export default function RsiChart({ data }) {
  return (
    <div>
      <div className="subchart-label">RSI (14)</div>
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data} margin={CHART_MARGIN} syncId="stock">
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            width={Y_AXIS_WIDTH}
            domain={[0, 100]}
            ticks={[0, 30, 50, 70, 100]}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={70} stroke="var(--down)" strokeDasharray="4 3" />
          <ReferenceLine y={50} stroke="var(--muted)" strokeDasharray="1 4" />
          <ReferenceLine y={30} stroke="var(--up)" strokeDasharray="4 3" />
          <Tooltip content={<RsiTooltip />} />
          <Line dataKey="rsi" name="RSI(14)" stroke="#7C3AED" dot={false} strokeWidth={1.6} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
