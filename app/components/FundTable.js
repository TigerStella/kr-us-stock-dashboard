"use client";

import { krw, pct } from "../lib/format";

// 비상장 펀드 계좌 표시. 실시간가가 없어 매수·평가 금액만 표로 보여준다.
// 상승(수익) = 레드, 하락(손실) = 블루 — 한국 증권 관례.
const cls = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");

export default function FundTable({ account }) {
  const funds = account.funds || [];
  const totalBuy = funds.reduce((s, f) => s + (f.buy || 0), 0);
  const totalValue = funds.reduce((s, f) => s + (f.value || 0), 0);
  const totalProfit = totalValue - totalBuy;
  const totalRate = totalBuy ? (totalProfit / totalBuy) * 100 : null;

  return (
    <div className="fund-wrap">
      <div className="fund-sum">
        <div className="fund-sum-cell">
          <span className="fund-sum-label">평가금액</span>
          <span className="fund-sum-main">{krw(totalValue)}</span>
        </div>
        <div className="fund-sum-cell">
          <span className="fund-sum-label">매수금액</span>
          <span className="fund-sum-sub">{krw(totalBuy)}</span>
        </div>
        <div className="fund-sum-cell">
          <span className="fund-sum-label">평가손익</span>
          <span className={`fund-sum-main ${cls(totalProfit)}`}>{krw(totalProfit)}</span>
        </div>
        <div className="fund-sum-cell">
          <span className="fund-sum-label">수익률</span>
          <span className={`fund-sum-main ${cls(totalProfit)}`}>{pct(totalRate)}</span>
        </div>
      </div>

      <div className="fund-table-scroll">
        <table className="fund-table">
          <thead>
            <tr>
              <th className="fl">펀드명</th>
              <th className="fr">매수금액</th>
              <th className="fr">평가금액</th>
              <th className="fr">평가손익</th>
              <th className="fr">수익률</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f, i) => {
              const profit = (f.value || 0) - (f.buy || 0);
              const rate = f.buy ? (profit / f.buy) * 100 : null;
              return (
                <tr key={i}>
                  <td className="fl fund-name">{f.name}</td>
                  <td className="fr">{krw(f.buy)}</td>
                  <td className="fr strong">{krw(f.value)}</td>
                  <td className={`fr ${cls(profit)}`}>{krw(profit)}</td>
                  <td className={`fr ${cls(profit)}`}>{pct(rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="fund-note">
        ⓘ {account.note || "비상장 펀드 계좌 — 실시간 가격이 없어 스크린샷 기준 금액으로 표시됩니다(수동 갱신)."}
      </div>
    </div>
  );
}
