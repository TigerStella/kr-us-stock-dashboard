"use client";

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

const compactKrw = (v) =>
  v == null ? "-" : Math.abs(v) >= 10000 ? "₩" + (v / 10000).toFixed(0) + "만" : "₩" + Math.round(v).toLocaleString("ko-KR");

// data: [{month, amount}] (12개), height 기본 240
export default function MonthlyDividendBars({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
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
  );
}
