// 사용자 실제 보유 내역 (M·K·S 3개 계좌). 가격은 라이브 API, 수량은 이 데이터.
export const PORTFOLIOS = {
  M: [
    { name: "코히어런트", ticker: "COHR", shares: 10 },
    { name: "일라이 릴리", ticker: "LLY", shares: 1 },
    { name: "리얼티 인컴", ticker: "O", shares: 20 },
    { name: "알파벳 A", ticker: "GOOGL", shares: 1 },
    { name: "알파벳 A", ticker: "GOOGL", shares: 0.04018, fractional: true },
    { name: "INVESCO KBW BANK", ticker: "KBWB", shares: 2 },
    { name: "엔비디아", ticker: "NVDA", shares: 6 },
    { name: "엔비디아", ticker: "NVDA", shares: 0.13688, fractional: true },
    { name: "팔란티어 테크", ticker: "PLTR", shares: 15 },
    { name: "팔란티어 테크", ticker: "PLTR", shares: 0.846443, fractional: true },
  ],
  K: [
    { name: "애플", ticker: "AAPL", shares: 6 },
    { name: "코히어런트", ticker: "COHR", shares: 5 },
    { name: "인텔", ticker: "INTC", shares: 23 },
    { name: "존슨 앤드 존슨", ticker: "JNJ", shares: 8 },
    { name: "코카콜라", ticker: "KO", shares: 13 },
    { name: "메타 플랫폼스", ticker: "META", shares: 3 },
    { name: "마이크로소프트", ticker: "MSFT", shares: 1 },
    { name: "엔비디아", ticker: "NVDA", shares: 100 },
    { name: "노보노디스크 (ADR)", ticker: "NVO", shares: 12 },
    { name: "리얼티 인컴", ticker: "O", shares: 12 },
    { name: "파가야 테크놀로지스", ticker: "PGY", shares: 1 },
    { name: "팔란티어 테크", ticker: "PLTR", shares: 2 },
    { name: "필립 모리스 인터내셔널", ticker: "PM", shares: 3 },
    { name: "퀄컴", ticker: "QCOM", shares: 2 },
    { name: "스타벅스", ticker: "SBUX", shares: 5 },
    { name: "미국 +20년 장기 국채 ETF", ticker: "TLT", shares: 5, uncertain: true },
    { name: "테슬라", ticker: "TSLA", shares: 12 },
    { name: "S&P 500 유틸리티 SPDR", ticker: "XLU", shares: 6, uncertain: true },
    { name: "비자", ticker: "V", shares: 3 },
  ],
  S: [
    { name: "어플라이드 머티어리얼즈", ticker: "AMAT", shares: 1 },
    { name: "브로드컴", ticker: "AVGO", shares: 1 },
    { name: "아메리칸 익스프레스", ticker: "AXP", shares: 3 },
    { name: "알파벳 Class C", ticker: "GOOG", shares: 31 },
    { name: "일라이 릴리", ticker: "LLY", shares: 2 },
    { name: "메타", ticker: "META", shares: 6 },
    { name: "넷플릭스", ticker: "NFLX", shares: 7 },
    { name: "엔비디아", ticker: "NVDA", shares: 38 },
    { name: "파가야 테크놀로지스", ticker: "PGY", shares: 2 },
    { name: "팔란티어 테크놀로지스", ticker: "PLTR", shares: 28 },
    { name: "뉴스케일 파워", ticker: "SMR", shares: 58 },
    { name: "테슬라", ticker: "TSLA", shares: 5 },
    { name: "유나이티드헬스 그룹", ticker: "UNH", shares: 3 },
  ],
};

export const BROKERS = ["M", "K", "S"];
export const BROKER_LABEL = { M: "M 계좌", K: "K 계좌", S: "S 계좌" };

// 동일 티커 합산 (한 리스트 내). name은 첫 항목 기준, 수량 합산.
export function mergeByTicker(list) {
  const map = new Map();
  for (const it of list) {
    const cur = map.get(it.ticker);
    if (cur) {
      cur.shares += it.shares;
      cur.uncertain = cur.uncertain || !!it.uncertain;
    } else {
      map.set(it.ticker, {
        name: it.name,
        ticker: it.ticker,
        shares: it.shares,
        uncertain: !!it.uncertain,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// 전체 합산: 모든 계좌를 통합해 티커별 합산 + 어느 계좌에 있는지(sources) 표시.
export function mergedAll() {
  const all = [...PORTFOLIOS.M, ...PORTFOLIOS.K, ...PORTFOLIOS.S];
  const merged = mergeByTicker(all);
  for (const m of merged) {
    m.sources = BROKERS.filter((b) =>
      PORTFOLIOS[b].some((x) => x.ticker === m.ticker)
    );
  }
  return merged;
}

// 전 계좌의 유니크 티커 목록
export function allTickers() {
  const set = new Set();
  for (const b of BROKERS) for (const it of PORTFOLIOS[b]) set.add(it.ticker);
  return Array.from(set);
}
