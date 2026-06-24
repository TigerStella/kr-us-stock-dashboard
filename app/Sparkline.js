"use client";

import { useId } from "react";

// 카드 하단에 들어가는 미니 가격 추이 그래프 (당일 5분봉 기준)
export default function Sparkline({ data, positive }) {
  const gid = useId().replace(/:/g, "");

  if (!data || data.length < 2) {
    return <div className="spark-empty">추이 데이터 없음</div>;
  }

  const W = 240;
  const H = 44;
  const P = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const x = (i) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (v) => P + (1 - (v - min) / span) * (H - 2 * P);

  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area =
    `${line} L${x(data.length - 1).toFixed(1)},${(H - P).toFixed(1)} ` +
    `L${x(0).toFixed(1)},${(H - P).toFixed(1)} Z`;

  const stroke = positive ? "var(--up)" : "var(--down)";

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="당일 가격 추이"
    >
      <defs>
        <linearGradient id={`sg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
