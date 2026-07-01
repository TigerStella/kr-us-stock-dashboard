// 파생 기술지표 계산 (순수 함수 · 외부 의존성 없음 · 테스트 가능)
// 입력 closes 는 숫자 배열(종가). 데이터 부족 구간은 null 로 채워 길이를 보존한다.

// 단순이동평균(SMA). period 미만 구간은 null.
export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      // 비정상 값이 끼면 윈도우를 재시작(보수적으로 null 유지)
      sum = 0;
      continue;
    }
    sum += v;
    if (i >= period) {
      const drop = values[i - period];
      if (typeof drop === "number") sum -= drop;
    }
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// 여러 기간의 이동평균을 한 번에. periods 예: [20, 60, 120]
export function movingAverages(closes, periods) {
  const result = {};
  for (const p of periods) result[p] = sma(closes, p);
  return result;
}

// 모표준편차(population std, ÷N) — 볼린저밴드 표준 정의에 맞춤.
function rollingStd(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let mean = 0;
    let ok = true;
    for (let k = i - period + 1; k <= i; k++) {
      const v = values[k];
      if (typeof v !== "number" || !Number.isFinite(v)) { ok = false; break; }
      mean += v;
    }
    if (!ok) continue;
    mean /= period;
    let varSum = 0;
    for (let k = i - period + 1; k <= i; k++) varSum += (values[k] - mean) ** 2;
    out[i] = Math.sqrt(varSum / period);
  }
  return out;
}

// 볼린저밴드: 중간=period SMA, 상/하한 = 중간 ± mult*std
export function bollingerBands(closes, period = 20, mult = 2) {
  const middle = sma(closes, period);
  const std = rollingStd(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (middle[i] != null && std[i] != null) {
      upper[i] = middle[i] + mult * std[i];
      lower[i] = middle[i] - mult * std[i];
    }
  }
  return { middle, upper, lower };
}

// RSI (Wilder 평활). period 미만 구간은 null → 차트에서 비워둔다.
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  // 초기 평균: 1..period 구간의 변화량
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
