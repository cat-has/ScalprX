import type { Candle } from '../types'

/** All series functions return arrays aligned to the input; warm-up positions are NaN. */
const nan = (n: number) => new Array<number>(n).fill(NaN)

export function sma(values: number[], period: number): number[] {
  const out = nan(values.length)
  if (period <= 0) return out
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

/** EMA seeded with the SMA of the first `period` values; k = 2/(period+1). */
export function ema(values: number[], period: number): number[] {
  const out = nan(values.length)
  if (period <= 0 || values.length < period) return out
  const k = 2 / (period + 1)
  let prev = 0
  for (let i = 0; i < period; i++) prev += values[i]
  prev /= period
  out[period - 1] = prev
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/** Wilder RSI. */
export function rsi(values: number[], period = 14): number[] {
  const out = nan(values.length)
  if (values.length <= period) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  gain /= period
  loss /= period
  const calc = () => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss))
  out[period] = calc()
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    gain = (gain * (period - 1) + (d > 0 ? d : 0)) / period
    loss = (loss * (period - 1) + (d < 0 ? -d : 0)) / period
    out[i] = calc()
  }
  return out
}

export interface MacdResult { macd: number[]; signal: number[]; hist: number[] }
export function macd(values: number[], fast = 12, slow = 26, signalP = 9): MacdResult {
  const ef = ema(values, fast)
  const es = ema(values, slow)
  const line = values.map((_, i) => (Number.isNaN(ef[i]) || Number.isNaN(es[i]) ? NaN : ef[i] - es[i]))
  const first = line.findIndex((x) => !Number.isNaN(x))
  const signal = nan(values.length)
  if (first >= 0) {
    const sig = ema(line.slice(first), signalP)
    sig.forEach((v, i) => (signal[first + i] = v))
  }
  const hist = line.map((m, i) => (Number.isNaN(m) || Number.isNaN(signal[i]) ? NaN : m - signal[i]))
  return { macd: line, signal, hist }
}

/** Wilder ATR. */
export function atr(candles: Candle[], period = 14): number[] {
  const out = nan(candles.length)
  if (candles.length <= period) return out
  const tr = candles.map((c, i) =>
    i === 0 ? c.h - c.l : Math.max(c.h - c.l, Math.abs(c.h - candles[i - 1].c), Math.abs(c.l - candles[i - 1].c)),
  )
  let prev = 0
  for (let i = 1; i <= period; i++) prev += tr[i]
  prev /= period
  out[period] = prev
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period
    out[i] = prev
  }
  return out
}

/** Rolling VWAP over the last `window` candles using typical price (h+l+c)/3. */
export function rollingVwap(candles: Candle[], window = 60): number[] {
  const out = nan(candles.length)
  for (let i = window - 1; i < candles.length; i++) {
    let pv = 0
    let v = 0
    for (let j = i - window + 1; j <= i; j++) {
      const tp = (candles[j].h + candles[j].l + candles[j].c) / 3
      pv += tp * candles[j].v
      v += candles[j].v
    }
    out[i] = v > 0 ? pv / v : NaN
  }
  return out
}

/** Latest candle volume divided by the average of the previous `period` candles. */
export function volumeRatio(candles: Candle[], period = 20): number | null {
  if (candles.length < period + 1) return null
  const prior = candles.slice(-period - 1, -1)
  const avg = prior.reduce((s, c) => s + c.v, 0) / period
  if (avg <= 0) return null
  return candles[candles.length - 1].v / avg
}

export interface Levels { support: number | null; resistance: number | null }
/** Fractal swing pivots (n candles each side). Nearest level below/above the last close. */
export function supportResistance(candles: Candle[], n = 3, lookback = 150): Levels {
  const slice = candles.slice(-lookback)
  const highs: number[] = []
  const lows: number[] = []
  for (let i = n; i < slice.length - n; i++) {
    let isH = true
    let isL = true
    for (let j = 1; j <= n; j++) {
      if (slice[i].h <= slice[i - j].h || slice[i].h <= slice[i + j].h) isH = false
      if (slice[i].l >= slice[i - j].l || slice[i].l >= slice[i + j].l) isL = false
    }
    if (isH) highs.push(slice[i].h)
    if (isL) lows.push(slice[i].l)
  }
  const lastClose = slice.length ? slice[slice.length - 1].c : NaN
  const resistances = highs.filter((h) => h > lastClose).sort((a, b) => a - b)
  const supports = lows.filter((l) => l < lastClose).sort((a, b) => b - a)
  return { support: supports[0] ?? null, resistance: resistances[0] ?? null }
}

export const last = (a: number[]): number => (a.length ? a[a.length - 1] : NaN)
export const back = (a: number[], n: number): number => a[a.length - 1 - n] ?? NaN
