/** Trading sessions by UTC hour (approximate). */
export function sessionOf(ms: number): 'Asia' | 'Europe' | 'US' | 'Off-hours' {
  const h = new Date(ms).getUTCHours()
  if (h >= 13 && h < 21) return 'US'
  if (h >= 7 && h < 13) return 'Europe'
  if (h >= 0 && h < 7) return 'Asia'
  return 'Off-hours'
}
