"use client";

import { useMemo } from "react";
import MonthlyDividendBars from "./MonthlyDividendBars";
import { computeMonthlyDividend } from "../lib/dividends";
import { krw } from "../lib/format";

// 보유 수량 기준 월별 배당(₩ 환산) 합산. dividends: { [yahoo]: {perShare, months, currency} }
export default function DividendChart({ holdings, fxRate, dividends = {} }) {
  const { data, total, covered } = useMemo(
    () => computeMonthlyDividend(holdings, fxRate, dividends, (h) => h.shares),
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
        <MonthlyDividendBars data={data} height={260} />
      )}
    </div>
  );
}
