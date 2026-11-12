// A cor segue a alíquota (entidade), nunca a posição — filtros não repintam nada.
const FIXED: Record<number, number> = { 4: 1, 12: 2, 7: 3, 18: 4, 17: 5, 19: 6, 20: 7, 22: 8 }

export function rateSlot(rate: number): number | null {
  return FIXED[rate] ?? null
}

export function rateColor(rate: number): string {
  const s = rateSlot(rate)
  return s ? `var(--series-${s})` : 'var(--series-other)'
}
