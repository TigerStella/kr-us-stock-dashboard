// 배당 계산 공용 로직 (보유/시뮬 공통).
// items: [{ yahoo, market, ...}] , getQty(item)->수량, dividends: { [yahoo]: {perShare, months, currency} }
// 월별(₩ 환산) 배당을 지급월에 배분해 합산.

export const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export function computeMonthlyDividend(items, fxRate, dividends, getQty) {
  const monthly = new Array(12).fill(0);
  let total = 0;
  let covered = 0;
  for (const it of items) {
    const d = dividends[it.yahoo];
    const qty = getQty ? getQty(it) : it.shares;
    if (!d || !qty) continue;
    const annualNative = qty * d.perShare;
    const krwAnnual = it.market === "kr" ? annualNative : (fxRate ? annualNative * fxRate : 0);
    if (!krwAnnual) continue;
    const per = krwAnnual / d.months.length;
    for (const m of d.months) {
      if (m >= 1 && m <= 12) monthly[m - 1] += per;
    }
    total += krwAnnual;
    covered++;
  }
  return {
    data: MONTH_LABELS.map((label, i) => ({ month: label, amount: Math.round(monthly[i]) })),
    total,
    covered,
  };
}
