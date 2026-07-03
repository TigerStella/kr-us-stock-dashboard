// 매수 문자 / 계좌 현황 / 구조화 입력에서 종목·수량·매수금액을 추출하는 로컬 파서.
// 순수 함수, 외부 전송 없음. 종목·수량·금액만 추출(계좌번호·잔고 등 미사용).
// 권장 입력: "종목명, 티커, 매수주식수, 매수금액"  예) KODEX 미국반도체, 390390, 3주, 157300원
// known: [{ ticker, name }] — 매칭용 해당 시장 보유/추가 종목 목록.

const toNum = (s) => parseFloat(String(s).replace(/[^\d.]/g, ""));
const normalize = (s) => String(s).replace(/\s+/g, "").toUpperCase();

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

// 이름으로 알려진 종목의 실제 티커 해석 (양방향 부분일치)
function resolveByName(name, byName) {
  const nn = normalize(name);
  if (nn.length < 2) return null;
  return (
    byName.find((k) => k.nname === nn) ||
    byName.find((k) => k.nname.length >= 3 && (nn.includes(k.nname) || k.nname.includes(nn)))
  );
}

// 콤마 구분 구조화 입력 파싱: 종목명, 티커, 수량, 금액
function parseStructured(line, market, byName) {
  const parts = line.split(/\s*[,，]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const name0 = parts[0];
  const rest = parts.slice(1);

  let sharesPart = rest.find((p) => /주/.test(p)) || null;
  let amountPart = rest.find((p) => /원/.test(p)) || null;
  let tickerPart =
    rest.find((p) => p !== sharesPart && p !== amountPart && (/^\d{6}$/.test(p) || /^\d[0-9A-Z]{5}$/i.test(p) || /^[A-Za-z]{1,5}$/.test(p))) || null;

  // 단위 표기가 없으면 남은 숫자들로 위치 추정 (작은 값=수량, 큰 값=금액)
  if (sharesPart == null || amountPart == null) {
    const nums = rest
      .filter((p) => p !== tickerPart)
      .map((p) => ({ p, v: toNum(p) }))
      .filter((x) => Number.isFinite(x.v) && x.v > 0);
    if (sharesPart == null && amountPart == null && nums.length >= 2) {
      const sorted = [...nums].sort((a, b) => a.v - b.v);
      sharesPart = sorted[0].p;
      amountPart = sorted[sorted.length - 1].p;
    } else if (sharesPart == null && nums.length) {
      sharesPart = (nums.find((x) => x.p !== amountPart) || nums[0]).p;
    } else if (amountPart == null && nums.length) {
      amountPart = nums[nums.length - 1].p;
    }
  }

  const shares = sharesPart != null ? toNum(sharesPart) : null;
  const amount = amountPart != null ? toNum(amountPart) : null;
  if (!shares || shares <= 0) return null;

  // 티커 해석: (1) 입력 티커가 알려진 코드 → 사용, (2) 종목명 매칭, (3) 입력 티커 그대로
  let resolved = tickerPart ? byName.find((k) => k.ticker === (market === "us" ? tickerPart.toUpperCase() : tickerPart)) : null;
  if (!resolved) resolved = resolveByName(name0, byName);
  let ticker;
  let name;
  if (resolved) {
    ticker = resolved.ticker;
    name = resolved.name;
  } else if (tickerPart) {
    ticker = market === "us" ? tickerPart.toUpperCase() : tickerPart;
    name = name0;
  } else {
    return null; // 티커도 매칭도 없으면 구조화로 인정 안 함
  }
  return { ticker, name, qty: shares, amount: Number.isFinite(amount) ? amount : null };
}

// 반환: [{ ticker, name, qty, amount, matched }]  (같은 종목 여러 줄이면 수량·금액 합산)
export function parseHoldingsText(text, market, known) {
  const byName = (known || []).map((k) => ({ ...k, nname: normalize(k.name) }));
  const knownTickers = new Set(byName.map((k) => k.ticker));
  const lines = String(text || "").split(/\r?\n/);
  const out = new Map();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let e = parseStructured(line, market, byName);
    if (!e) {
      const qty = extractQty(line);
      if (qty == null) continue;
      const id = extractIdentifier(line, market, byName);
      if (!id) continue;
      e = { ticker: id.ticker, name: id.name, qty, amount: null };
    }

    const prev = out.get(e.ticker);
    if (prev) {
      prev.qty += e.qty;
      if (e.amount != null) prev.amount = (prev.amount || 0) + e.amount;
    } else {
      out.set(e.ticker, { ticker: e.ticker, name: e.name, qty: e.qty, amount: e.amount });
    }
  }
  return Array.from(out.values()).map((e) => ({ ...e, matched: knownTickers.has(e.ticker) }));
}
