// 공용 표시 포맷터 (여러 컴포넌트에서 재사용)
export const usd = (v) =>
  v == null ? "-" : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const krw = (v) => (v == null ? "-" : "₩" + Math.round(v).toLocaleString("ko-KR"));
export const krwNum = (v) => (v == null ? "-" : v.toLocaleString("ko-KR", { maximumFractionDigits: 0 }));
export const num2 = (v) =>
  v == null ? "-" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (v) => (v == null ? "-" : (v > 0 ? "+" : "") + v.toFixed(2) + "%");
export const pct1 = (v) => (v == null ? "-" : (v > 0 ? "+" : "") + v.toFixed(1) + "%");
export const signNum = (v, d = 2) =>
  v == null ? "-" : (v > 0 ? "+" : "") + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const shFmt = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 5 });

export function dirClass(change) {
  if (typeof change !== "number" || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}
export function arrow(change) {
  if (typeof change !== "number" || change === 0) return "■";
  return change > 0 ? "▲" : "▼";
}
export const fmtByCurrency = (v, currency) => (v == null ? "-" : currency === "KRW" ? krw(v) : usd(v));
