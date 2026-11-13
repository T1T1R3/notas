// Apuração de ICMS-ST (mesma lógica da planilha "APURAÇÃO ICMS ST LUBRICAR.xlsx").
//   MVA ajustada = (1 + MVA) × (1 − alíq. interestadual) ÷ (1 − alíq. interna) − 1   (arredondada a 4 casas)
//   BC          = Produtos + IPI
//   Base ST     = BC × (1 + MVA ajustada)
//   ICMS ST     = Base ST × alíq. interna − ICMS de crédito (destacado na nota)

import type { Product } from './parser'

export const INTERNAL_RATE = 18 // alíquota interna de MG (%)
export const DEFAULT_MVA = 71.78 // MVA original (%)

export interface StRow {
  ncm: string
  rate: number // alíquota interestadual (%)
  products: number
  ipi: number
  icmsCredit: number
  bc: number
  mva: number // %
  mvaAdjusted: number // fator, ex.: 1.0111
  mvaAddition: number // BC × MVA ajustada
  baseSt: number
  icmsSt: number
}

export function adjustedMva(mvaPct: number, interstatePct: number, internalPct = INTERNAL_RATE) {
  const v = ((1 + mvaPct / 100) * (1 - interstatePct / 100)) / (1 - internalPct / 100) - 1
  return Math.round(v * 10000) / 10000
}

export function computeStRow(
  input: { ncm: string; rate: number; products: number; ipi: number; icmsCredit: number },
  mvaPct: number,
  internalPct = INTERNAL_RATE,
): StRow {
  const bc = input.products + input.ipi
  const mvaAdjusted = adjustedMva(mvaPct, input.rate, internalPct)
  const mvaAddition = bc * mvaAdjusted
  const baseSt = bc + mvaAddition
  return {
    ...input,
    bc,
    mva: mvaPct,
    mvaAdjusted,
    mvaAddition,
    baseSt,
    icmsSt: baseSt * (internalPct / 100) - input.icmsCredit,
  }
}

export function buildStRows(products: Product[], mvaByNcm: Record<string, number>): StRow[] {
  const map = new Map<string, { ncm: string; rate: number; products: number; ipi: number; icmsCredit: number }>()
  for (const p of products) {
    const key = `${p.ncm}|${p.icmsRate}`
    const r = map.get(key) ?? { ncm: p.ncm, rate: p.icmsRate, products: 0, ipi: 0, icmsCredit: 0 }
    r.products += p.total
    r.ipi += p.ipiValue
    r.icmsCredit += p.icmsValue
    map.set(key, r)
  }
  return [...map.values()]
    .sort((a, b) => b.ncm.localeCompare(a.ncm) || a.rate - b.rate)
    .map((r) => computeStRow(r, mvaByNcm[r.ncm] ?? DEFAULT_MVA))
}
