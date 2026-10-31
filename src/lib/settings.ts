import type { Timeframe } from '../types'

export interface IndicatorConfig { emaFast: number; emaSlow: number; rsi: number; macdFast: number; macdSlow: number; macdSignal: number; atr: number; volAvg: number; vwapWindow: number }
export interface ScannerConfig { timeframe: Timeframe; minRR: number; slAtr: number; tpAtr: number; minConditions: number; rsiLongMin: number; rsiLongMax: number; rsiShortMin: number; rsiShortMax: number; minVolRatio: number }
export interface DisciplineRules { dailyLossLimit: number; maxRiskPct: number; maxConsecLosses: number; maxTradesPerDay: number; cooldownMin: number }
export interface Settings {
  theme: 'dark' | 'light' | 'system'
  refreshSec: number
  accountEquity: number
  currency: string
  riskPct: number
  feePct: number
  leverage: number
  maintenanceMarginPct: number
  indicators: IndicatorConfig
  scanner: ScannerConfig
  discipline: DisciplineRules
  browserNotifications: boolean
  onboarded: boolean
  sidebarCollapsed: boolean
  chartPair: string
  chartTimeframe: Timeframe
}
export const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']
export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark', refreshSec: 10, accountEquity: 1000, currency: 'USDT', riskPct: 1, feePct: 0.05, leverage: 1,
  maintenanceMarginPct: 0.5,
  indicators: { emaFast: 9, emaSlow: 21, rsi: 14, macdFast: 12, macdSlow: 26, macdSignal: 9, atr: 14, volAvg: 20, vwapWindow: 60 },
  scanner: { timeframe: '5m', minRR: 1.5, slAtr: 1.5, tpAtr: 2.5, minConditions: 5, rsiLongMin: 50, rsiLongMax: 70, rsiShortMin: 30, rsiShortMax: 50, minVolRatio: 1.0 },
  discipline: { dailyLossLimit: 30, maxRiskPct: 1, maxConsecLosses: 3, maxTradesPerDay: 10, cooldownMin: 30 },
  browserNotifications: false, onboarded: false, sidebarCollapsed: false, chartPair: 'BTCUSDT', chartTimeframe: '5m',
}
export function mergeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>
  return {
    ...DEFAULT_SETTINGS, ...r,
    indicators: { ...DEFAULT_SETTINGS.indicators, ...(r.indicators ?? {}) },
    scanner: { ...DEFAULT_SETTINGS.scanner, ...(r.scanner ?? {}) },
    discipline: { ...DEFAULT_SETTINGS.discipline, ...(r.discipline ?? {}) },
  }
}
