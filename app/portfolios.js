// 사용자 실제 보유 내역. 가격은 라이브 API, 수량은 이 데이터.
// 미국: 티커 그대로 Yahoo 심볼. 한국: 6자리/단축코드 + ".KS".

export const US_PORTFOLIOS = {
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

export const KR_PORTFOLIOS = {
  M: [
    { name: "KODEX 반도체타겟위클리커버드콜", ticker: "0190G0", shares: 50, note: "신규상장(2026.05), 영문숫자 단축코드" },
    { name: "TIGER 200 중공업", ticker: "139230", shares: 110 },
    { name: "RISE 200", ticker: "148020", shares: 45 },
    { name: "TIGER 미국채10년선물", ticker: "305080", shares: 530 },
    { name: "TIGER 골드선물(H)", ticker: "319640", shares: 47 },
    { name: "ACE 미국S&P500", ticker: "360200", shares: 420 },
    { name: "KODEX 미국S&P500", ticker: "379800", shares: 172 },
    { name: "KODEX 미국나스닥100", ticker: "379810", shares: 324 },
    { name: "TIGER 미국테크TOP10 INDXX", ticker: "381170", shares: 426 },
    { name: "KODEX 미국반도체", ticker: "390390", shares: 316 },
    { name: "TIGER 글로벌리튬&2차전지SOLACTIVE(합성)", ticker: "394670", shares: 310 },
    { name: "TIGER 반도체TOP10", ticker: "396500", shares: 75 },
    { name: "ACE 미국배당다우존스", ticker: "402970", shares: 463 },
    { name: "KODEX 인도Nifty50", ticker: "453810", shares: 272 },
    { name: "KODEX 테슬라커버드콜채권혼합액티브", ticker: "475080", shares: 171 },
    { name: "ACE 엔비디아밸류체인액티브", ticker: "483320", shares: 196 },
  ],
  K_ISA: [
    { name: "SK하이닉스", ticker: "000660", shares: 4 },
    { name: "삼성전자우", ticker: "005935", shares: 5 },
    { name: "삼성중공업", ticker: "010140", shares: 4 },
    { name: "KODEX 미국나스닥100", ticker: "379810", shares: 4 },
  ],
  K_신: [
    { name: "SK하이닉스", ticker: "000660", shares: 12 },
    { name: "현대차2우B", ticker: "005387", shares: 15 },
    { name: "삼성전자우", ticker: "005935", shares: 101 },
    { name: "NH투자증권", ticker: "005940", shares: 6 },
    { name: "삼성중공업", ticker: "010140", shares: 11 },
    { name: "한국카본", ticker: "017960", shares: 11 },
    { name: "KODEX 반도체타겟위클리커버드콜", ticker: "0190G0", shares: 250 },
    { name: "KT&G", ticker: "033780", shares: 9 },
    { name: "한화오션", ticker: "042660", shares: 15 },
    { name: "리노공업", ticker: "058470", shares: 75 },
    { name: "하나금융지주", ticker: "086790", shares: 49 },
    { name: "KB금융", ticker: "105560", shares: 22 },
    { name: "TIGER 200 중공업", ticker: "139230", shares: 23 },
    { name: "RISE 200", ticker: "148020", shares: 8 },
    { name: "HD현대", ticker: "267250", shares: 1 },
    { name: "KODEX 미국S&P500", ticker: "379800", shares: 78 },
    { name: "KODEX 미국나스닥100", ticker: "379810", shares: 57 },
    { name: "KODEX 미국반도체", ticker: "390390", shares: 29 },
    { name: "TIGER 반도체TOP10", ticker: "396500", shares: 423 },
    { name: "ACE 미국배당다우존스", ticker: "402970", shares: 305 },
    { name: "KODEX 인도Nifty50", ticker: "453810", shares: 190 },
    { name: "KODEX 테슬라커버드콜채권혼합액티브", ticker: "475080", shares: 175 },
    { name: "KODEX 글로벌비만치료제TOP2 Plus", ticker: "476070", shares: 105 },
    { name: "TIGER 글로벌비만치료제TOP2 Plus", ticker: "476690", shares: 30 },
    { name: "ACE 엔비디아밸류체인액티브", ticker: "483320", shares: 50 },
  ],
};

// 한국 코드는 전부 .KS 로 조회됨 (검증 완료, 신규상장 0190G0 포함)
export function yahooSymbol(market, ticker) {
  return market === "kr" ? `${ticker}.KS` : ticker;
}

export const MARKETS = {
  us: {
    key: "us",
    label: "미국",
    currency: "USD",
    portfolios: US_PORTFOLIOS,
    brokers: ["M", "K", "S"],
    brokerLabel: { M: "M 계좌", K: "K 계좌", S: "S 계좌" },
  },
  kr: {
    key: "kr",
    label: "한국",
    currency: "KRW",
    portfolios: KR_PORTFOLIOS,
    brokers: ["M", "K_ISA", "K_신"],
    brokerLabel: { M: "M 계좌", K_ISA: "K · ISA", K_신: "K · 신탁" },
  },
};

// 동일 티커 합산 (한 리스트 내). name은 첫 항목 기준, 수량 합산.
export function mergeByTicker(list) {
  const map = new Map();
  for (const it of list) {
    const cur = map.get(it.ticker);
    if (cur) {
      cur.shares += it.shares;
      cur.uncertain = cur.uncertain || !!it.uncertain;
      cur.note = cur.note || it.note;
    } else {
      map.set(it.ticker, {
        name: it.name,
        ticker: it.ticker,
        shares: it.shares,
        uncertain: !!it.uncertain,
        note: it.note,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// 한 시장 내 전체 계좌 합산 + 어느 계좌에 있는지(sources)
export function mergeMarket(marketKey) {
  const m = MARKETS[marketKey];
  const all = m.brokers.flatMap((b) => m.portfolios[b]);
  const merged = mergeByTicker(all);
  for (const item of merged) {
    item.sources = m.brokers.filter((b) =>
      m.portfolios[b].some((x) => x.ticker === item.ticker)
    );
  }
  return merged;
}

// 한 계좌 보유 (동일티커 합산)
export function brokerHoldings(marketKey, broker) {
  return mergeByTicker(MARKETS[marketKey].portfolios[broker]);
}

// quotes API가 받아올 전 종목 Yahoo 심볼 (미국 + 한국)
export function allYahooSymbols() {
  const set = new Set();
  for (const [key, m] of Object.entries(MARKETS)) {
    for (const b of m.brokers) {
      for (const it of m.portfolios[b]) set.add(yahooSymbol(key, it.ticker));
    }
  }
  return Array.from(set);
}
