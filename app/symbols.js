// 상단 요약 바에 쓰는 시장 지표. (보유 종목은 portfolios.js에서 관리)
// group: 'index' | 'fx'
export const SYMBOLS = [
  { symbol: "^GSPC", name: "S&P 500", group: "index" },
  { symbol: "^IXIC", name: "나스닥", group: "index" },
  { symbol: "^DJI", name: "다우", group: "index" },
  { symbol: "^KS11", name: "코스피", group: "index" },
  { symbol: "KRW=X", name: "달러/원", group: "fx" },
  { symbol: "GBPKRW=X", name: "파운드/원", group: "fx" },
  { symbol: "EURKRW=X", name: "유로/원", group: "fx" },
];

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.symbol, s]));
