import type { Note, Product } from './parser'

export type GroupMode = 'generic' | 'product' | 'ncm'

export const GROUP_MODES: { id: GroupMode; label: string; hint: string }[] = [
  { id: 'generic', label: 'Nome + NCM', hint: 'Agrupa pelo nome do produto sem o código do modelo' },
  { id: 'product', label: 'Código do produto', hint: 'Um grupo por código/SKU' },
  { id: 'ncm', label: 'Somente NCM', hint: 'Consolida tudo que tem o mesmo NCM' },
]

export interface Group {
  key: string
  baseKey: string // chave sem a alíquota
  label: string
  ncm: string
  rate: number
  units: string[]
  qty: number
  total: number
  icmsBase: number
  icmsValue: number
  ipiValue: number
  codes: string[]
  noteNumbers: string[]
  items: Product[]
  otherRates: number[] // outras alíquotas em que o mesmo produto aparece
}

const uniq = <T,>(a: T[]) => [...new Set(a)]

export function groupProducts(products: Product[], mode: GroupMode): Group[] {
  const map = new Map<string, Group>()
  for (const p of products) {
    let baseKey: string
    let label: string
    if (mode === 'product') {
      baseKey = `${p.code}`
      label = p.name
    } else if (mode === 'ncm') {
      baseKey = p.ncm
      label = `NCM ${formatNcm(p.ncm)}`
    } else {
      baseKey = `${p.genericName.toUpperCase()}|${p.ncm}`
      label = p.genericName
    }
    const key = `${baseKey}|${p.icmsRate}`
    let g = map.get(key)
    if (!g) {
      g = {
        key,
        baseKey,
        label,
        ncm: p.ncm,
        rate: p.icmsRate,
        units: [],
        qty: 0,
        total: 0,
        icmsBase: 0,
        icmsValue: 0,
        ipiValue: 0,
        codes: [],
        noteNumbers: [],
        items: [],
        otherRates: [],
      }
      map.set(key, g)
    }
    g.qty += p.qty
    g.total += p.total
    g.icmsBase += p.icmsBase
    g.icmsValue += p.icmsValue
    g.ipiValue += p.ipiValue
    g.items.push(p)
  }
  const groups = [...map.values()]
  const ratesByBase = new Map<string, number[]>()
  for (const g of groups) {
    g.units = uniq(g.items.map((i) => i.unit))
    g.codes = uniq(g.items.map((i) => i.code))
    g.noteNumbers = uniq(g.items.map((i) => i.noteNumber))
    ratesByBase.set(g.baseKey, [...(ratesByBase.get(g.baseKey) ?? []), g.rate])
  }
  for (const g of groups) g.otherRates = (ratesByBase.get(g.baseKey) ?? []).filter((r) => r !== g.rate)
  return groups.sort((a, b) => a.label.localeCompare(b.label) || a.rate - b.rate)
}

export interface RateSummary {
  rate: number
  qty: number
  lines: number
  total: number
  icmsBase: number
  icmsValue: number
  ipiValue: number
}

export function summarizeByRate(products: Product[]): RateSummary[] {
  const map = new Map<number, RateSummary>()
  for (const p of products) {
    const s =
      map.get(p.icmsRate) ??
      { rate: p.icmsRate, qty: 0, lines: 0, total: 0, icmsBase: 0, icmsValue: 0, ipiValue: 0 }
    s.qty += p.qty
    s.lines += 1
    s.total += p.total
    s.icmsBase += p.icmsBase
    s.icmsValue += p.icmsValue
    s.ipiValue += p.ipiValue
    map.set(p.icmsRate, s)
  }
  return [...map.values()].sort((a, b) => a.rate - b.rate)
}

export function summarizeBy<K extends string | number>(products: Product[], key: (p: Product) => K) {
  const map = new Map<K, { key: K; qty: number; total: number; lines: number; icmsValue: number }>()
  for (const p of products) {
    const k = key(p)
    const s = map.get(k) ?? { key: k, qty: 0, total: 0, lines: 0, icmsValue: 0 }
    s.qty += p.qty
    s.total += p.total
    s.lines += 1
    s.icmsValue += p.icmsValue
    map.set(k, s)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export interface NoteCheck {
  productsOk: boolean | null
  icmsOk: boolean | null
}

export function checkNote(n: Note): NoteCheck {
  const sum = n.products.reduce((s, p) => s + p.total, 0)
  const icms = n.products.reduce((s, p) => s + p.icmsValue, 0)
  return {
    productsOk: n.totals.products == null ? null : Math.abs(sum - n.totals.products) <= 0.05,
    icmsOk: n.totals.icms == null ? null : Math.abs(icms - n.totals.icms) <= 0.05,
  }
}

// ---------- formatação
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const pct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export const fmtBRL = (v: number) => brl.format(v)
export const fmtNum = (v: number) => num.format(v)
export const fmtRate = (v: number) => `${pct.format(v)}%`
export const fmtPct = (v: number) => `${pct.format(v * 100)}%`
export const formatNcm = (n: string) => (n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n)

// ---------- exportação CSV (padrão Excel pt-BR: ";" e vírgula decimal)
const csvNum = (v: number, d = 2) => v.toFixed(d).replace('.', ',')
const csvCell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

function download(name: string, rows: string[][]) {
  const body = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportGroupsCsv(groups: Group[]) {
  download('separacao-por-aliquota.csv', [
    ['Produto', 'NCM', 'Alíquota ICMS', 'Quantidade', 'Unidade', 'Valor total', 'BC ICMS', 'ICMS', 'IPI', 'Códigos', 'Notas'],
    ...groups.map((g) => [
      g.label,
      formatNcm(g.ncm),
      csvNum(g.rate),
      csvNum(g.qty, 4),
      g.units.join(', '),
      csvNum(g.total),
      csvNum(g.icmsBase),
      csvNum(g.icmsValue),
      csvNum(g.ipiValue),
      g.codes.join(', '),
      g.noteNumbers.join(', '),
    ]),
  ])
}

export function exportItemsCsv(notes: Note[]) {
  download('itens-das-notas.csv', [
    ['Nota', 'Série', 'Emissão', 'Emitente', 'Código', 'Descrição', 'NCM', 'CST', 'CFOP', 'Un', 'Qtd', 'V. unit', 'V. total', 'BC ICMS', 'ICMS', 'Alíq. ICMS', 'IPI', 'Alíq. IPI', 'Pedido'],
    ...notes.flatMap((n) =>
      n.products.map((p) => [
        n.number,
        n.series,
        n.issueDate,
        n.issuerName,
        p.code,
        p.name,
        formatNcm(p.ncm),
        p.cst,
        p.cfop,
        p.unit,
        csvNum(p.qty, 4),
        csvNum(p.unitPrice, 4),
        csvNum(p.total),
        csvNum(p.icmsBase),
        csvNum(p.icmsValue),
        csvNum(p.icmsRate),
        csvNum(p.ipiValue),
        csvNum(p.ipiRate),
        p.order,
      ]),
    ),
  ])
}
