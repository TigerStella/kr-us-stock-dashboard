// 매수 문자 / 계좌 현황 텍스트에서 종목·수량을 추출하는 로컬 파서 (순수 함수, 외부 전송 없음).
// 종목·수량만 추출하며 계좌번호·잔고 등 민감정보는 사용하지 않는다.
// known: [{ ticker, name }] — 매칭에 사용할 해당 시장 보유/추가 종목 목록.

const toNum = (s) => parseFloat(String(s).replace(/,/g, ""));
const normalize = (s) => String(s).replace(/\s+/g, "").toUpperCase();

// 미국 티커 오탐 방지용 최소 불용어
const STOP = new Set([
  "KR", "US", "USD", "KRW", "ETF", "NYSE", "NASDAQ", "AI", "TR", "CE", "ADR",
  "BUY", "SELL", "P", "Q", "OK", "NO", "TO", "OF", "THE",
]);

function extractQty(line) {
  const patterns = [
    /(\d[\d,]*(?:\.\d+)?)\s*주/,
    /보유\s*(?:수량)?\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/,
    /수량\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) {
      const v = toNum(m[1]);
      if (Number.isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

function extractIdentifier(line, market, byName) {
  const nline = normalize(line);
  if (market === "kr") {
    // 6자리 코드 또는 영숫자 단축코드(예: 0190G0)
    let m = line.match(/\b(\d{6})\b/);
    if (!m) m = line.match(/\b(\d[0-9A-Z]{5})\b/);
    if (m) {
      const t = m[1];
      const kn = byName.find((k) => k.ticker === t);
      return { ticker: t, name: kn ? kn.name : t };
    }
    const hit = byName.find((k) => k.nname.length >= 2 && nline.includes(k.nname));
    if (hit) return { ticker: hit.ticker, name: hit.name };
    return null;
  }
  // 미국: 종목명(한글/영문) 매칭 우선 → 알려진 티커 → 신규 티커 후보
  const hit = byName.find((k) => k.nname.length >= 2 && nline.includes(k.nname));
  if (hit) return { ticker: hit.ticker, name: hit.name };
  const tokens = line.match(/\b[A-Z]{1,5}\b/g) || [];
  for (const tk of tokens) {
    const kn = byName.find((k) => k.ticker === tk);
    if (kn) return { ticker: tk, name: kn.name };
  }
  for (const tk of tokens) {
    if (!STOP.has(tk)) return { ticker: tk, name: tk };
  }
  return null;
}

// 반환: [{ ticker, name, qty, matched }]  (같은 종목 여러 줄이면 수량 합산)
export function parseHoldingsText(text, market, known) {
  const byName = (known || []).map((k) => ({ ...k, nname: normalize(k.name) }));
  const knownTickers = new Set(byName.map((k) => k.ticker));
  const lines = String(text || "").split(/\r?\n/);
  const out = new Map();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const qty = extractQty(line);
    if (qty == null) continue;
    const id = extractIdentifier(line, market, byName);
    if (!id) continue;
    const prev = out.get(id.ticker);
    if (prev) prev.qty += qty;
    else out.set(id.ticker, { ticker: id.ticker, name: id.name, qty });
  }
  return Array.from(out.values()).map((e) => ({ ...e, matched: knownTickers.has(e.ticker) }));
}
