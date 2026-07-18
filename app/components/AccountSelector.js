"use client";

import { krw, usd } from "../lib/format";

// 전체 탭 최상단: 계좌별 체크박스 + 선택 계좌 평가금액 합계.
// 체크를 끄면 그 계좌는 합계에서 즉시 제외된다.
const MARKET_GROUPS = [
  { key: "kr", label: "한국" },
  { key: "us", label: "미국" },
];

export default function AccountSelector({
  accounts,
  values,
  isSelected,
  onToggle,
  onToggleAll,
  totalKrw,
  fxRate,
  selectedCount,
  totalCount,
}) {
  return (
    <div className="acctsel">
      <div className="acctsel-head">
        <div className="acctsel-total">
          <span className="acctsel-total-label">선택 계좌 합계 · {selectedCount}/{totalCount}</span>
          <span className="acctsel-total-krw">{krw(totalKrw)}</span>
          {fxRate ? <span className="acctsel-total-usd">≈ {usd(totalKrw / fxRate)}</span> : null}
        </div>
        <div className="acctsel-allbtns">
          <button type="button" onClick={() => onToggleAll(true)}>전체선택</button>
          <button type="button" onClick={() => onToggleAll(false)}>전체해제</button>
        </div>
      </div>

      {MARKET_GROUPS.map((g) => {
        const items = accounts.filter((a) => a.market === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className="acctsel-group">
            <div className="acctsel-group-title">{g.label}</div>
            {items.map((a) => {
              const v = values[a.id];
              const sel = isSelected(a.id);
              const valStr = v && v.krw != null ? krw(v.krw) : v && v.ok === false ? "시세대기" : "-";
              return (
                <label key={a.id} className={`acctsel-row ${sel ? "on" : ""}`}>
                  <input type="checkbox" checked={sel} onChange={() => onToggle(a.id)} />
                  <span className="acctsel-name">{a.shortLabel}</span>
                  <span className="acctsel-val">
                    {valStr}
                    {a.market === "us" && v && v.native != null ? (
                      <span className="acctsel-native"> ({usd(v.native)})</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
