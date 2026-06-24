// 대시보드에 표시할 심볼 정의 (단일 소스).
// group: 'index' | 'kr' | 'stock' | 'fx'
export const SYMBOLS = [
  // 미국 주요 지수
  { symbol: "^GSPC", name: "S&P 500", group: "index" },
  { symbol: "^IXIC", name: "나스닥 종합", group: "index" },
  { symbol: "^DJI", name: "다우 존스", group: "index" },

  // 한국 시가총액 상위 TOP 5 (KOSPI)
  { symbol: "005930.KS", name: "삼성전자", group: "kr" },
  { symbol: "000660.KS", name: "SK하이닉스", group: "kr" },
  { symbol: "373220.KS", name: "LG에너지솔루션", group: "kr" },
  { symbol: "207940.KS", name: "삼성바이오로직스", group: "kr" },
  { symbol: "005380.KS", name: "현대차", group: "kr" },

  // 미국 대표 종목
  { symbol: "AAPL", name: "애플", group: "stock" },
  { symbol: "MSFT", name: "마이크로소프트", group: "stock" },
  { symbol: "NVDA", name: "엔비디아", group: "stock" },
  { symbol: "AMZN", name: "아마존", group: "stock" },
  { symbol: "GOOGL", name: "알파벳", group: "stock" },
  { symbol: "META", name: "메타", group: "stock" },
  { symbol: "TSLA", name: "테슬라", group: "stock" },

  // 환율
  { symbol: "KRW=X", name: "원·달러 환율", group: "fx" },
];

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map((s) => [s.symbol, s]));
