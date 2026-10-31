import { useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, LineStyle, createChart, type IChartApi, type IPriceLine, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { Candle, Timeframe } from '../../types'
import type { IndicatorConfig } from '../../lib/settings'
import { ema, macd, rsi } from '../../lib/indicators'
import { fmtPrice } from '../../lib/format'

export interface RefLines { entry?: number | null; stop?: number | null; takeProfit?: number | null }
interface Props { timeframe?: Timeframe; candles: Candle[]; loading: boolean; error: string | null; ind: IndicatorConfig; lines?: RefLines; showRsi: boolean; showMacd: boolean; resetKey: string; theme: string; height?: 'sm' | 'lg' }
interface Inst { chart: IChartApi; candle: ISeriesApi<'Candlestick'>; vol: ISeriesApi<'Histogram'>; eF: ISeriesApi<'Line'>; eS: ISeriesApi<'Line'>; rsi?: ISeriesApi<'Line'>; mL?: ISeriesApi<'Line'>; mS?: ISeriesApi<'Line'>; mH?: ISeriesApi<'Histogram'> }
const TF_SECONDS: Record<Timeframe, number> = { '1m': 60, '3m': 180, '5m': 300, '15m': 900, '1h': 3600 }
export const timeframeToSeconds = (tf: Timeframe): number => TF_SECONDS[tf] ?? 60
/** Seconds left until the current candle closes (candles are aligned to UTC epoch multiples of the interval). */
export function secondsToClose(intervalSec: number, nowMs = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return intervalSec - (nowSec % intervalSec)
}
export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
const BADGE = '#14b8a6'
const cssv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const ts = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp
function toLine(c: Candle[], vals: number[]) { return c.map((x, i) => ({ time: ts(x.t), value: vals[i] })).filter((p) => Number.isFinite(p.value)) }

export function PriceChart({ timeframe, candles, loading, error, ind, lines, showRsi, showMacd, resetKey, theme, height = 'lg' }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const [inst, setInst] = useState<Inst | null>(null)
  const [legend, setLegend] = useState<string | null>(null)
  const fitted = useRef('')
  const seenKey = useRef('')
  const staleRef = useRef<Candle[] | null>(null)
  const priceLines = useRef<IPriceLine[]>([])
  const badgeRef = useRef<HTMLDivElement>(null)
  const priceTxt = useRef<HTMLDivElement>(null)
  const cdTxt = useRef<HTMLDivElement>(null)
  const candlesRef = useRef<Candle[]>([])
  const layoutRef = useRef<(() => void) | null>(null)
  // resetKey is "PAIR|TF" in every caller, so the timeframe can be derived when the prop is omitted.
  const tf = (timeframe ?? (resetKey.split('|')[1] as Timeframe)) as Timeframe
  const intervalSec = timeframeToSeconds(tf)

  useEffect(() => {
    if (!el.current) return
    const up = cssv('--up'), down = cssv('--down'), text = cssv('--muted'), grid = cssv('--border'), accent = cssv('--accent'), warn = cssv('--warn')
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: cssv('--surface') }, textColor: text, fontFamily: cssv('--font'), panes: { separatorColor: grid } },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      localization: { priceFormatter: (p: number) => fmtPrice(p) },
    })
    const candle = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down, priceLineVisible: true, priceLineColor: BADGE, lastValueVisible: false }, 0)
    candle.priceScale().applyOptions({ autoScale: true, scaleMargins: { top: 0.06, bottom: 0.24 } })
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false }, 0)
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    const eF = chart.addSeries(LineSeries, { color: accent, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `EMA${ind.emaFast}` }, 0)
    const eS = chart.addSeries(LineSeries, { color: warn, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `EMA${ind.emaSlow}` }, 0)
    let pane = 1
    const i: Inst = { chart, candle, vol, eF, eS }
    if (showRsi) {
      i.rsi = chart.addSeries(LineSeries, { color: accent, lineWidth: 1, title: `RSI${ind.rsi}`, priceLineVisible: false }, pane)
      i.rsi.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      i.rsi.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      pane++
    }
    if (showMacd) {
      i.mH = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane)
      i.mL = chart.addSeries(LineSeries, { color: accent, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'MACD' }, pane)
      i.mS = chart.addSeries(LineSeries, { color: warn, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: 'Signal' }, pane)
    }
    const panes = chart.panes()
    if (panes.length > 1) { panes[0].setStretchFactor(3); for (let k = 1; k < panes.length; k++) panes[k].setStretchFactor(1) }
    chart.subscribeCrosshairMove((p) => {
      const d = p.seriesData.get(candle) as { open: number; high: number; low: number; close: number } | undefined
      setLegend(d ? `O ${fmtPrice(d.open)}  H ${fmtPrice(d.high)}  L ${fmtPrice(d.low)}  C ${fmtPrice(d.close)}` : null)
    })
    fitted.current = ''
    seenKey.current = ''
    setInst(i)
    return () => { chart.remove(); setInst(null); priceLines.current = [] }
  }, [theme, showRsi, showMacd, ind.emaFast, ind.emaSlow, ind.rsi])

  const calc = useMemo(() => {
    const closes = candles.map((c) => c.c)
    return { eF: ema(closes, ind.emaFast), eS: ema(closes, ind.emaSlow), rsi: rsi(closes, ind.rsi), m: macd(closes, ind.macdFast, ind.macdSlow, ind.macdSignal) }
  }, [candles, ind.emaFast, ind.emaSlow, ind.rsi, ind.macdFast, ind.macdSlow, ind.macdSignal])

  useEffect(() => {
    if (!inst) return
    const clearAll = () => {
      inst.candle.setData([]); inst.vol.setData([]); inst.eF.setData([]); inst.eS.setData([])
      inst.rsi?.setData([]); inst.mL?.setData([]); inst.mS?.setData([]); inst.mH?.setData([])
    }
    // Pair/timeframe changed: drop every series and re-enable auto-scaling so the axis can adapt to the new asset.
    if (seenKey.current !== resetKey) {
      seenKey.current = resetKey
      staleRef.current = candles // whatever is present at this moment still belongs to the previous pair
      fitted.current = ''
      clearAll()
      inst.chart.priceScale('right').applyOptions({ autoScale: true })
      inst.candle.priceScale().applyOptions({ autoScale: true })
    }
    // Ignore the leftover candles of the previous pair; wait for the new dataset.
    if (!candles.length || candles === staleRef.current) return
    const up = cssv('--up'), down = cssv('--down')
    inst.candle.setData(candles.map((c) => ({ time: ts(c.t), open: c.o, high: c.h, low: c.l, close: c.c })))
    inst.vol.setData(candles.map((c) => ({ time: ts(c.t), value: c.v, color: c.c >= c.o ? `${up}55` : `${down}55` })))
    inst.eF.setData(toLine(candles, calc.eF))
    inst.eS.setData(toLine(candles, calc.eS))
    inst.rsi?.setData(toLine(candles, calc.rsi))
    inst.mL?.setData(toLine(candles, calc.m.macd))
    inst.mS?.setData(toLine(candles, calc.m.signal))
    inst.mH?.setData(candles.map((c, k) => ({ time: ts(c.t), value: calc.m.hist[k] })).filter((p) => Number.isFinite(p.value)).map((p) => ({ ...p, color: p.value >= 0 ? `${up}99` : `${down}99` })))
    if (fitted.current !== resetKey) {
      inst.chart.priceScale('right').applyOptions({ autoScale: true })
      inst.chart.timeScale().fitContent()
      inst.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candles.length - 120), to: candles.length + 5 })
      fitted.current = resetKey
    }
  }, [inst, candles, calc, resetKey])

  // Live candle countdown badge: pinned to the price scale, updated imperatively (no React re-render per second).
  useEffect(() => {
    if (!inst) return
    const el = badgeRef.current
    const host = el?.parentElement
    if (!el || !host) return
    let lastPrice = '', lastCd = '', lastShow = ''
    const layout = () => {
      const cs = candlesRef.current
      const last = cs[cs.length - 1]
      const y = last ? inst.candle.priceToCoordinate(last.c) : null
      if (!last || y == null) { if (lastShow !== 'none') { el.style.display = 'none'; lastShow = 'none' } return }
      const maxTop = Math.max(0, host.clientHeight - inst.chart.timeScale().height() - 46)
      const top = Math.min(maxTop, Math.max(0, Math.round(y) - 11))
      const w = Math.max(inst.chart.priceScale('right').width(), 62)
      if (lastShow !== 'block') { el.style.display = 'block'; lastShow = 'block' }
      el.style.width = `${w}px`
      el.style.transform = `translateY(${top}px)`
      const price = fmtPrice(last.c)
      if (price !== lastPrice && priceTxt.current) { priceTxt.current.textContent = price; lastPrice = price }
      // Candle data older than two intervals means the feed is stale: do not pretend the timer is meaningful.
      const fresh = Date.now() - last.t < intervalSec * 2000
      const cd = fresh ? formatCountdown(secondsToClose(intervalSec)) : '--:--'
      if (cd !== lastCd && cdTxt.current) { cdTxt.current.textContent = cd; lastCd = cd }
    }
    layoutRef.current = layout
    inst.chart.timeScale().subscribeVisibleLogicalRangeChange(layout)
    const ro = new ResizeObserver(layout)
    ro.observe(host)
    let timer: ReturnType<typeof setTimeout>
    const loop = () => { layout(); timer = setTimeout(loop, 1000 - (Date.now() % 1000) + 5) } // tick on the second boundary
    loop()
    return () => { clearTimeout(timer); ro.disconnect(); inst.chart.timeScale().unsubscribeVisibleLogicalRangeChange(layout); layoutRef.current = null }
  }, [inst, intervalSec])

  useEffect(() => {
    candlesRef.current = candles
    const id = requestAnimationFrame(() => layoutRef.current?.())
    return () => cancelAnimationFrame(id)
  }, [inst, candles, resetKey])

  useEffect(() => {
    if (!inst) return
    priceLines.current.forEach((l) => inst.candle.removePriceLine(l))
    priceLines.current = []
    const add = (price: number | null | undefined, color: string, title: string) => {
      if (price != null && Number.isFinite(price) && price > 0) priceLines.current.push(inst.candle.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title }))
    }
    add(lines?.entry, cssv('--accent'), 'Entry'); add(lines?.stop, cssv('--down'), 'Stop'); add(lines?.takeProfit, cssv('--up'), 'Target')
  }, [inst, lines?.entry, lines?.stop, lines?.takeProfit])

  return (
    <div className={`chartbox ${height === 'sm' ? 'sm' : ''}`}>
      <div className="chart-el" ref={el} role="img" aria-label="Candlestick chart with volume and indicator overlays" />
      <div ref={badgeRef} aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, display: 'none', zIndex: 3, pointerEvents: 'none', textAlign: 'center', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', willChange: 'transform' }}>
        <div ref={priceTxt} style={{ background: BADGE, color: '#031a17', fontWeight: 700, fontSize: 12, lineHeight: '22px', height: 22, borderRadius: '4px 4px 0 0', whiteSpace: 'nowrap' }} />
        <div ref={cdTxt} style={{ background: 'var(--surface2)', color: BADGE, border: `1px solid ${BADGE}`, borderTop: 0, fontWeight: 600, fontSize: 11.5, lineHeight: '19px', height: 21, borderRadius: '0 0 4px 4px', boxSizing: 'border-box' }} />
      </div>
      {legend && <div className="legend">{legend}</div>}
      {loading && !candles.length && <div className="chart-msg"><div><div className="skeleton" style={{ width: 160, margin: '0 auto 8px' }} />Loading candles from the exchange...</div></div>}
      {!loading && !candles.length && <div className="chart-msg"><div><strong>No chart data</strong><p>{error ?? 'Candles are unavailable for this pair and timeframe.'}</p><p className="faint">ScalprX never shows made-up candles. Retry when your connection or the exchange API is available.</p></div></div>}
      {error && candles.length > 0 && <div className="legend" style={{ top: 'auto', bottom: 34, color: 'var(--warn)' }}>Update failed: {error} Showing last real candles.</div>}
    </div>
  )
}
