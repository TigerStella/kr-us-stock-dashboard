"use client";

// 외부 라이브러리 없이 그리는 SVG 라인 차트 (가격 추이용)
export default function LineChart({ points, currency }) {
  const W = 700;
  const H = 240;
  const PAD = { top: 16, right: 14, bottom: 24, left: 56 };

  if (!points || points.length < 2) {
    return <div className="chart-msg">표시할 데이터가 부족합니다</div>;
  }

  const values = points.map((p) => p.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i) => PAD.left + (i / (points.length - 1)) * innerW;
  const y = (v) => PAD.top + (1 - (v - min) / span) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ");
  const area =
    `M${x(0).toFixed(1)},${y(points[0].c).toFixed(1)} ` +
    points.map((p, i) => `L${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ") +
    ` L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const rising = last >= first;
  const stroke = rising ? "var(--up)" : "var(--down)";

  // 50일 이동평균선 (값이 있는 구간만)
  const maPts = points
    .map((p, i) => ({ i, m: p.m }))
    .filter((p) => typeof p.m === "number" && Number.isFinite(p.m));
  const maLine =
    maPts.length >= 2
      ? maPts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.m).toFixed(1)}`).join(" ")
      : null;

  // y축 눈금 5단계
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * span);
  const fmt = (v) =>
    v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toFixed(2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="가격 추이 차트">
      {ticks.map((tv, i) => {
        const yy = y(tv);
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.left - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {fmt(tv)}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {maLine ? (
        <path d={maLine} fill="none" stroke="#c14a63" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      <circle cx={x(points.length - 1)} cy={y(last)} r="3.5" fill={stroke} />
      {maLine ? (
        <text x={PAD.left + 4} y={PAD.top + 8} fontSize="11" fill="#c14a63" fontWeight="700">
          ━ MA50
        </text>
      ) : null}
      {currency ? (
        <text x={W - PAD.right} y={PAD.top - 2} textAnchor="end" fontSize="11" fill="var(--muted)">
          {currency}
        </text>
      ) : null}
    </svg>
  );
}
