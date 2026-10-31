# Trading methodology

Assumes linear instruments (spot or USDT-margined). Inverse contracts are unsupported.

## Indicators
EMA (SMA seed, k=2/(n+1)); RSI (Wilder, 14); MACD (12/26/9); ATR (Wilder, 14); rolling VWAP over 60 candles of typical price; volume ratio (latest / mean of previous 20); swing pivots (3 each side, last 150 candles) for support/resistance.

## Scanner
Long conditions: EMA fast > slow with rising slow EMA; RSI 50-70; MACD histogram > 0 and rising; price > VWAP; volume ratio >= minimum; room to resistance >= minimum R:R. Short mirrors (RSI 30-50). Bullish/bearish requires the configured number of conditions (default 5 of 6) and a lead over the other side. Stop = 1.5 x ATR, target = 2.5 x ATR by default (R:R 1.67). Fewer than 60 candles gives "insufficient data".

## Formulas
Long P&L = (exit - entry) x size; short P&L = (entry - exit) x size. Fees = fee% x notional on each side. Size = equity x risk% / (|entry - stop| + (entry + stop) x fee%). Margin = notional / leverage. Approx. liquidation (long) = entry x (1 - 1/L + m); short = entry x (1 + 1/L - m). R = net P&L / (|entry - stop| x size).

## Example
Equity 10,000, risk 1%, entry 100, stop 95, no fees: risk 100, size 20, notional 2,000. Target 110 gives +200 gross, R:R 1:2.

## Limits
Indicators lag, can whipsaw and give no guarantee. Arithmetic uses IEEE doubles; displayed values are rounded, stored values are not.
