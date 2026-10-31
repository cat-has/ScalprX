import type { Candle, Timeframe } from '../types'
import type { IndicatorConfig, ScannerConfig } from './settings'
import { atr, ema, last, back, macd, rollingVwap, rsi, supportResistance, volumeRatio } from './indicators'

export type Bias = 'bullish' | 'bearish' | 'neutral' | 'insufficient'
export interface Condition { id: string; label: string; met: boolean; detail: string }
export interface SetupSide { conditions: Condition[]; score: number }
export interface Setup {
  pair: string
  timeframe: Timeframe
  bias: Bias
  generatedAt: number
  candleTime: number
  price: number | null
  values: { emaFast: number; emaSlow: number; rsi: number; macd: number; macdSignal: number; macdHist: number; vwap: number | null; volRatio: number | null; atr: number; atrPct: number; support: number | null; resistance: number | null } | null
  trend: 'up' | 'down' | 'flat' | null
  momentum: 'rising' | 'falling' | 'flat' | null
  long: SetupSide | null
  short: SetupSide | null
  entry: number | null
  stop: number | null
  takeProfit: number | null
  rewardRisk: number | null
  spreadPct: number | null
  explanation: string
}

export const MIN_CANDLES = 60

export function evaluateSetup(
  pair: string, timeframe: Timeframe, candles: Candle[], ind: IndicatorConfig, cfg: ScannerConfig, spreadPct: number | null, now = Date.now(),
): Setup {
  const base: Setup = {
    pair, timeframe, bias: 'insufficient', generatedAt: now, candleTime: candles.length ? candles[candles.length - 1].t : 0,
    price: candles.length ? candles[candles.length - 1].c : null, values: null, trend: null, momentum: null, long: null, short: null,
    entry: null, stop: null, takeProfit: null, rewardRisk: null, spreadPct,
    explanation: `Insufficient data: ${candles.length} candles available, at least ${MIN_CANDLES} are required. No setup is generated.`,
  }
  const need = Math.max(MIN_CANDLES, ind.emaSlow + 5, ind.macdSlow + ind.macdSignal + 5, ind.vwapWindow)
  if (candles.length < need) {
    base.explanation = `Insufficient data: ${candles.length} candles available, at least ${need} are required for the configured indicators. No setup is generated.`
    return base
  }
  const closes = candles.map((c) => c.c)
  const eF = ema(closes, ind.emaFast)
  const eS = ema(closes, ind.emaSlow)
  const r = rsi(closes, ind.rsi)
  const m = macd(closes, ind.macdFast, ind.macdSlow, ind.macdSignal)
  const a = atr(candles, ind.atr)
  const vw = rollingVwap(candles, ind.vwapWindow)
  const vr = volumeRatio(candles, ind.volAvg)
  const lv = supportResistance(candles)
  const price = last(closes)
  const A = last(a)
  const vals = {
    emaFast: last(eF), emaSlow: last(eS), rsi: last(r), macd: last(m.macd), macdSignal: last(m.signal), macdHist: last(m.hist),
    vwap: Number.isNaN(last(vw)) ? null : last(vw), volRatio: vr, atr: A, atrPct: (A / price) * 100, support: lv.support, resistance: lv.resistance,
  }
  if ([vals.emaFast, vals.emaSlow, vals.rsi, vals.macdHist, A].some((x) => !Number.isFinite(x))) return { ...base, explanation: 'Insufficient data: one or more indicators could not be computed.' }
  const slopeSlow = last(eS) - back(eS, 3)
  const trend: Setup['trend'] = vals.emaFast > vals.emaSlow && slopeSlow > 0 ? 'up' : vals.emaFast < vals.emaSlow && slopeSlow < 0 ? 'down' : 'flat'
  const histPrev = back(m.hist, 1)
  const momentum: Setup['momentum'] = vals.macdHist > histPrev ? 'rising' : vals.macdHist < histPrev ? 'falling' : 'flat'

  const risk = cfg.slAtr * A
  const mk = (dir: 'long' | 'short'): { side: SetupSide; entry: number; stop: number; tp: number; rr: number } => {
    const long = dir === 'long'
    const stop = long ? price - risk : price + risk
    const tp = long ? price + cfg.tpAtr * A : price - cfg.tpAtr * A
    const rr = cfg.tpAtr / cfg.slAtr
    const level = long ? vals.resistance : vals.support
    const room = level == null ? Infinity : Math.abs(level - price) / risk
    const vwapOk = vals.vwap != null && (long ? price > vals.vwap : price < vals.vwap)
    const volOk = vr != null && vr >= cfg.minVolRatio
    const conds: Condition[] = [
      { id: 'trend', label: long ? `EMA${ind.emaFast} above EMA${ind.emaSlow}, slow EMA rising` : `EMA${ind.emaFast} below EMA${ind.emaSlow}, slow EMA falling`, met: long ? trend === 'up' : trend === 'down', detail: `EMA${ind.emaFast} ${vals.emaFast.toFixed(4)} vs EMA${ind.emaSlow} ${vals.emaSlow.toFixed(4)}` },
      { id: 'rsi', label: long ? `RSI between ${cfg.rsiLongMin} and ${cfg.rsiLongMax}` : `RSI between ${cfg.rsiShortMin} and ${cfg.rsiShortMax}`, met: long ? vals.rsi >= cfg.rsiLongMin && vals.rsi <= cfg.rsiLongMax : vals.rsi >= cfg.rsiShortMin && vals.rsi <= cfg.rsiShortMax, detail: `RSI ${vals.rsi.toFixed(1)}` },
      { id: 'macd', label: long ? 'MACD histogram positive and rising' : 'MACD histogram negative and falling', met: long ? vals.macdHist > 0 && momentum === 'rising' : vals.macdHist < 0 && momentum === 'falling', detail: `Histogram ${vals.macdHist.toPrecision(3)} (${momentum})` },
      { id: 'vwap', label: long ? 'Price above VWAP' : 'Price below VWAP', met: vwapOk, detail: vals.vwap == null ? 'VWAP unavailable' : `VWAP ${vals.vwap.toFixed(4)}` },
      { id: 'volume', label: `Volume at least ${cfg.minVolRatio}x recent average`, met: volOk, detail: vr == null ? 'Volume ratio unavailable' : `${vr.toFixed(2)}x average` },
      { id: 'room', label: `Room to ${long ? 'resistance' : 'support'} of at least ${cfg.minRR}R`, met: room >= cfg.minRR && rr >= cfg.minRR, detail: level == null ? `No nearby ${long ? 'resistance' : 'support'} found; target R:R ${rr.toFixed(2)}` : `Nearest level ${level.toFixed(4)} = ${room.toFixed(2)}R away; target R:R ${rr.toFixed(2)}` },
    ]
    return { side: { conditions: conds, score: conds.filter((c) => c.met).length }, entry: price, stop, tp, rr }
  }
  const L = mk('long')
  const S = mk('short')
  const need2 = cfg.minConditions
  let bias: Bias = 'neutral'
  let pick: ReturnType<typeof mk> | null = null
  if (L.side.score >= need2 && L.side.score > S.side.score) { bias = 'bullish'; pick = L }
  else if (S.side.score >= need2 && S.side.score > L.side.score) { bias = 'bearish'; pick = S }
  const chosen = pick ?? (L.side.score >= S.side.score ? L : S)
  const side = bias === 'bullish' ? 'long' : bias === 'bearish' ? 'short' : null
  const metList = (bias === 'bearish' ? S : L).side.conditions.filter((c) => c.met).map((c) => c.label)
  const explanation =
    bias === 'neutral'
      ? `Neutral: neither side meets ${need2} of 6 conditions (long ${L.side.score}/6, short ${S.side.score}/6). Entry, stop and target below are reference levels for the closer side and are not a setup.`
      : `${bias === 'bullish' ? 'Bullish' : 'Bearish'} ${side} setup: ${pick!.side.score} of 6 conditions met (${metList.join('; ')}). Stop is ${cfg.slAtr}x ATR and target is ${cfg.tpAtr}x ATR from the last close. This is rule-based educational decision support, not a prediction.`
  return {
    ...base, bias, values: vals, trend, momentum, long: L.side, short: S.side, entry: chosen.entry, stop: chosen.stop,
    takeProfit: chosen.tp, rewardRisk: chosen.rr, explanation,
  }
}

export function setupFreshness(s: Setup, now = Date.now()): 'fresh' | 'aging' | 'stale' {
  const age = (now - s.generatedAt) / 1000
  return age < 90 ? 'fresh' : age < 300 ? 'aging' : 'stale'
}
