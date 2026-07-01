"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 차트 좌우 정렬을 RSI 서브차트와 맞추기 위한 공통 여백/축폭
export const CHART_MARGIN = { top: 6, right: 14, left: 6, bottom: 0 };
export const Y_AXIS_WIDTH = 56;

const fmtPrice = (v) =>
  v == null ? "-" : v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2);

// ── 캔들 1개 (Bar 의 custom shape) ──
// Recharts 가 범위막대(range=[l,h])에 대해 넘겨주는 y(=고가 픽셀), height(=고가~저가 픽셀)
// 로부터 픽셀/가격 비율을 구해 시·종가 위치를 직접 계산한다. (축 스케일에 무관하게 정합)
function Candle(props) {
  const { x, width, y, height, payload } = props;
  if (!payload || payload.o == null || payload.h == null || payload.l == null || payload.c == null) {
    return null;
  }
  const { o, h, l, c } = payload;
  const up = c >= o;
  const color = up ? "var(--up)" : "var(--down)";
  const cx = x + width / 2;
  const candleW = Math.max(width * 0.6, 1.5);

  // 고가==저가(변동 없음)면 픽셀비율 계산 불가 → 가는 가로선만
  if (h === l || height === 0) {
    return <line x1={cx - candleW / 2} x2={cx + candleW / 2} y1={y} y2={y} stroke={color} strokeWidth="1.5" />;
  }
  const ppv = height / (h - l); // pixels per value
  const yOf = (price) => y + (h - price) * ppv;
  const bodyTop = yOf(Math.max(o, c));
  const bodyBottom = yOf(Math.min(o, c));
  const bodyH = Math.max(bodyBottom - bodyTop, 1);

  return (
    <g>
      {/* 위·아래 꼬리 */}
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth="1" />
      {/* 몸통 */}
      <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} />
    </g>
  );
}

function PriceTooltip({ active, payload, currency }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const row = (label, v, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: color || "var(--muted)" }}>{label}</span>
      <span>{fmtPrice(v)}</span>
    </div>
  );
  return (
    <div className="chart-tip">
      <div className="chart-tip-h">{d.label}</div>
      {row("시", d.o)}
      {row("고", d.h)}
      {row("저", d.l)}
      {row("종", d.c)}
      {d.ma20 != null ? row("MA20", d.ma20, "#8B5CF6") : null}
      {d.ma60 != null ? row("MA60", d.ma60, "#3B82F6") : null}
      {d.ma120 != null ? row("MA120", d.ma120, "#06B6D4") : null}
      {d.bbUp != null ? row("BB상", d.bbUp, "#60A5FA") : null}
      {d.bbLow != null ? row("BB하", d.bbLow, "#EF4444") : null}
    </div>
  );
}

const LEGEND = [
  { label: "상승/하락 캔들", swatch: "candle" },
  { label: "MA20", color: "#8B5CF6" },
  { label: "MA60", color: "#3B82F6" },
  { label: "MA120", color: "#06B6D4" },
  { label: "BB중심(20SMA)", color: "#F97316" },
  { label: "BB상한", color: "#60A5FA", dashed: true },
  { label: "BB하한", color: "#EF4444" },
];

export default function PriceChart({ data, currency, yDomain }) {
  return (
    <div>
      <div className="chart-legend">
        {LEGEND.map((it) => (
          <span className="lg-item" key={it.label}>
            {it.swatch === "candle" ? (
              <span className="lg-candle">
                <i style={{ background: "var(--up)" }} />
                <i style={{ background: "var(--down)" }} />
              </span>
            ) : (
              <span
                className="lg-line"
                style={{
                  background: it.dashed
                    ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)`
                    : it.color,
                }}
              />
            )}
            {it.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={false} axisLine={{ stroke: "var(--border)" }} height={2} />
          <YAxis
            width={Y_AXIS_WIDTH}
            domain={yDomain}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={fmtPrice}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<PriceTooltip currency={currency} />} />
          {/* 볼린저밴드 (캔들 뒤에 먼저 그림) */}
          <Line dataKey="bbUp" name="BB상한" stroke="#60A5FA" strokeDasharray="4 3" dot={false} strokeWidth={1.3} connectNulls isAnimationActive={false} />
          <Line dataKey="bbMid" name="BB중심" stroke="#F97316" dot={false} strokeWidth={1.3} connectNulls isAnimationActive={false} />
          <Line dataKey="bbLow" name="BB하한" stroke="#EF4444" dot={false} strokeWidth={1.3} connectNulls isAnimationActive={false} />
          {/* 캔들 */}
          <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} legendType="none" />
          {/* 이동평균 */}
          <Line dataKey="ma20" name="MA20" stroke="#8B5CF6" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          <Line dataKey="ma60" name="MA60" stroke="#3B82F6" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          <Line dataKey="ma120" name="MA120" stroke="#06B6D4" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
