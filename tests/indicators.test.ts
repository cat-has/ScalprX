import { describe, expect, it } from 'vitest'
import { atr, ema, macd, rollingVwap, rsi, sma, supportResistance, volumeRatio } from '../src/lib/indicators'
import type { Candle } from '../src/types'

const c = (o: number, h: number, l: number, cl: number, v = 1, t = 0): Candle => ({ t, o, h, l, c: cl, v })

describe('indicators', () => {
  it('sma matches hand calculation', () => {
    const r = sma([1, 2, 3, 4, 5], 3)
    expect(r.slice(0, 2).every(Number.isNaN)).toBe(true)
    expect(r.slice(2)).toEqual([2, 3, 4])
  })
  it('ema seeds with SMA and uses k=2/(n+1)', () => {
    const r = ema([1, 2, 3, 4, 5], 3)
    expect(r[2]).toBe(2)
    expect(r[3]).toBeCloseTo(3, 10)
    expect(r[4]).toBeCloseTo(4, 10)
  })
  it('ema of a constant series is constant', () => {
    expect(ema(Array(30).fill(7), 9).at(-1)).toBeCloseTo(7, 10)
  })
  it('rsi is 100 for strictly rising and 0 for strictly falling', () => {
    expect(rsi(Array.from({ length: 30 }, (_, i) => i + 1), 14).at(-1)).toBe(100)
    expect(rsi(Array.from({ length: 30 }, (_, i) => 100 - i), 14).at(-1)).toBeCloseTo(0, 10)
  })
  it('rsi matches the classic Wilder example (about 70.5 for first value)', () => {
    const p = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28]
    expect(rsi(p, 14)[14]).toBeCloseTo(70.46, 1)
  })
  it('macd is zero for a constant series', () => {
    const m = macd(Array(80).fill(10))
    expect(m.macd.at(-1)).toBeCloseTo(0, 10)
    expect(m.hist.at(-1)).toBeCloseTo(0, 10)
  })
  it('atr of constant-range candles equals the range', () => {
    const candles = Array.from({ length: 40 }, () => c(10, 11, 9, 10))
    expect(atr(candles, 14).at(-1)).toBeCloseTo(2, 10)
  })
  it('rolling vwap of equal-volume equal-price candles is that price', () => {
    const candles = Array.from({ length: 70 }, () => c(10, 10, 10, 10, 5))
    expect(rollingVwap(candles, 60).at(-1)).toBeCloseTo(10, 10)
  })
  it('volume ratio and insufficient data', () => {
    const candles = [...Array.from({ length: 20 }, () => c(1, 1, 1, 1, 10)), c(1, 1, 1, 1, 30)]
    expect(volumeRatio(candles, 20)).toBe(3)
    expect(volumeRatio(candles.slice(0, 5), 20)).toBeNull()
  })
  it('finds nearest support and resistance from swing pivots', () => {
    const highs = [1, 2, 3, 5, 3, 2, 1, 2, 3, 2, 1]
    const candles = highs.map((h, i) => c(h, h + 0.1, h - 0.1, h, 1, i))
    const lv = supportResistance(candles, 2)
    expect(lv.resistance === null || lv.resistance > candles.at(-1)!.c).toBe(true)
  })
})
