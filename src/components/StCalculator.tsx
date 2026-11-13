import { motion } from 'motion/react'
import { Calculator, Download, RotateCcw } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { fmtBRL, formatNcm } from '../lib/analysis'
import type { Product } from '../lib/parser'
import { DEFAULT_MVA, INTERNAL_RATE, buildStRows, mvaKey, type StRow } from '../lib/st'
import { AnimatedNumber, Card, CardHeader, RateBadge } from './ui'

const MVA_STORE = 'separacao-notas:mva-por-aliquota' // chave: NCM|alíquota

function loadMva(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(MVA_STORE) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

const pct4 = (f: number) => `${(f * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

export function StCalculator({ products, delay }: { products: Product[]; delay?: number }) {
  const [mva, setMva] = useState<Record<string, number>>(loadMva)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      localStorage.setItem(MVA_STORE, JSON.stringify(mva))
    } catch {
      /* sem armazenamento: segue em memória */
    }
  }, [mva])

  const rows = useMemo(() => buildStRows(products, mva), [products, mva])
  const byNcm = useMemo(() => {
    const m = new Map<string, StRow[]>()
    for (const r of rows) m.set(r.ncm, [...(m.get(r.ncm) ?? []), r])
    return [...m.entries()]
  }, [rows])

  const tot = rows.reduce(
    (s, r) => ({
      products: s.products + r.products,
      ipi: s.ipi + r.ipi,
      bc: s.bc + r.bc,
      icmsCredit: s.icmsCredit + r.icmsCredit,
      baseSt: s.baseSt + r.baseSt,
      icmsSt: s.icmsSt + r.icmsSt,
    }),
    { products: 0, ipi: 0, bc: 0, icmsCredit: 0, baseSt: 0, icmsSt: 0 },
  )

  const commit = (key: string) => {
    const raw = drafts[key]
    if (raw == null) return
    const v = Number(raw.replace(/\./g, '').replace(',', '.'))
    setDrafts((d) => {
      const next = { ...d }
      delete next[key]
      return next
    })
    if (Number.isFinite(v) && v >= 0 && v < 1000) setMva((m) => ({ ...m, [key]: v }))
  }

  const mvaText = (key: string) =>
    drafts[key] ?? (mva[key] ?? DEFAULT_MVA).toLocaleString('pt-BR', { maximumFractionDigits: 4 })

  const customized = rows.some((r) => r.mva !== DEFAULT_MVA)

  return (
    <Card delay={delay}>
      <CardHeader
        icon={<Calculator className="size-4" />}
        title="Apuração ICMS-ST"
        subtitle={`Por NCM e alíquota interestadual · alíquota interna ${INTERNAL_RATE}% · edite o MVA de cada NCM em cada alíquota`}
        right={
          <div className="flex gap-2">
            {customized && (
              <button
                onClick={() => setMva({})}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
              >
                <RotateCcw className="size-4" /> MVA padrão
              </button>
            )}
            <button
              onClick={() => exportStCsv(rows)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-2"
            >
              <Download className="size-4" /> CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 px-5 pb-4 sm:grid-cols-4">
        {[
          ['BC (produtos + IPI)', tot.bc],
          ['Base ST', tot.baseSt],
          ['ICMS crédito', tot.icmsCredit],
          ['ICMS-ST a recolher', tot.icmsSt],
        ].map(([l, v], i) => (
          <div
            key={l as string}
            className={`rounded-xl border p-3 ${i === 3 ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2/50'}`}
          >
            <p className={`text-xs ${i === 3 ? 'font-medium text-accent' : 'text-ink-3'}`}>{l}</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              <AnimatedNumber value={v as number} format={fmtBRL} />
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-surface-2/60 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left">NCM</th>
              <th className="px-3 py-2.5 text-left">Alíquota</th>
              <th className="px-3 py-2.5 text-right">Produtos</th>
              <th className="px-3 py-2.5 text-right">IPI</th>
              <th className="px-3 py-2.5 text-right">BC prod + IPI</th>
              <th className="px-3 py-2.5 text-right">ICMS crédito</th>
              <th className="px-3 py-2.5 text-right">MVA</th>
              <th className="px-3 py-2.5 text-right">MVA ajustada</th>
              <th className="px-3 py-2.5 text-right">Acréscimo MVA</th>
              <th className="px-3 py-2.5 text-right">Base ST</th>
              <th className="px-4 py-2.5 text-right">ICMS-ST</th>
            </tr>
          </thead>
          <tbody>
            {byNcm.map(([ncm, list]) => {
              const sub = list.reduce((s, r) => s + r.icmsSt, 0)
              return (
                <Fragment key={ncm}>
                  <tr className="border-t-2 border-line bg-surface-2/30">
                    <td className="px-4 py-2" colSpan={7}>
                      <span className="font-mono text-[13px] font-semibold text-ink">{formatNcm(ncm)}</span>
                    </td>
                    <td colSpan={3} />
                    <td className="px-4 py-2 text-right text-xs whitespace-nowrap text-ink-2 tabular">
                      subtotal <b className="text-ink">{fmtBRL(sub)}</b>
                    </td>
                  </tr>
                  {list.map((r) => (
                    <motion.tr layout key={`${r.ncm}|${r.rate}`} className="border-t border-line">
                      <td className="px-4 py-2.5" />
                      <td className="px-3 py-2.5">
                        <RateBadge rate={r.rate} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-2 tabular">{fmtBRL(r.products)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-2 tabular">{fmtBRL(r.ipi)}</td>
                      <td className="px-3 py-2.5 text-right text-ink tabular">{fmtBRL(r.bc)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-2 tabular">{fmtBRL(r.icmsCredit)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <MvaInput
                          value={mvaText(mvaKey(r.ncm, r.rate))}
                          edited={r.mva !== DEFAULT_MVA}
                          label={`MVA ${formatNcm(r.ncm)} ${r.rate}%`}
                          onChange={(v) => setDrafts((d) => ({ ...d, [mvaKey(r.ncm, r.rate)]: v }))}
                          onCommit={() => commit(mvaKey(r.ncm, r.rate))}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink tabular">{pct4(r.mvaAdjusted)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-2 tabular">{fmtBRL(r.mvaAddition)}</td>
                      <td className="px-3 py-2.5 text-right text-ink tabular">{fmtBRL(r.baseSt)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink tabular">{fmtBRL(r.icmsSt)}</td>
                    </motion.tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-line bg-surface-2/60 font-semibold text-ink">
            <tr>
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-3 py-3 text-right tabular">{fmtBRL(tot.products)}</td>
              <td className="px-3 py-3 text-right tabular">{fmtBRL(tot.ipi)}</td>
              <td className="px-3 py-3 text-right tabular">{fmtBRL(tot.bc)}</td>
              <td className="px-3 py-3 text-right tabular">{fmtBRL(tot.icmsCredit)}</td>
              <td colSpan={3} />
              <td className="px-3 py-3 text-right tabular">{fmtBRL(tot.baseSt)}</td>
              <td className="px-4 py-3 text-right text-accent tabular">{fmtBRL(tot.icmsSt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-ink-3">
        MVA ajustada = (1 + MVA) × (1 − alíq. interestadual) ÷ (1 − {INTERNAL_RATE}%) − 1 · Base ST = (produtos + IPI) ×
        (1 + MVA ajustada) · ICMS-ST = Base ST × {INTERNAL_RATE}% − ICMS crédito
      </p>
    </Card>
  )
}

function exportStCsv(rows: StRow[]) {
  const n = (v: number, d = 2) => v.toFixed(d).replace('.', ',')
  const lines = [
    ['NCM', 'Alíquota', 'Produtos', 'BC prod+IPI', 'ICMS crédito', 'IPI', 'MVA', 'MVA ajustada', 'Acréscimo MVA', 'Base ST', 'ICMS ST'],
    ...rows.map((r) => [
      formatNcm(r.ncm),
      n(r.rate),
      n(r.products),
      n(r.bc),
      n(r.icmsCredit),
      n(r.ipi),
      n(r.mva, 4),
      n(r.mvaAdjusted, 4),
      n(r.mvaAddition),
      n(r.baseSt),
      n(r.icmsSt),
    ]),
    ['Total', '', ...[
      rows.reduce((s, r) => s + r.products, 0),
      rows.reduce((s, r) => s + r.bc, 0),
      rows.reduce((s, r) => s + r.icmsCredit, 0),
      rows.reduce((s, r) => s + r.ipi, 0),
    ].map((v) => n(v)), '', '', '', n(rows.reduce((s, r) => s + r.baseSt, 0)), n(rows.reduce((s, r) => s + r.icmsSt, 0))],
  ]
  const body = '﻿' + lines.map((r) => r.join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'apuracao-icms-st.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function MvaInput({
  value,
  edited,
  label,
  onChange,
  onCommit,
}: {
  value: string
  edited: boolean
  label: string
  onChange: (v: string) => void
  onCommit: () => void
}) {
  return (
    <span className="relative inline-block">
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={`w-24 rounded-lg border py-1 pr-6 pl-2 text-right text-sm font-semibold tabular outline-none focus:border-accent ${
          edited ? 'border-accent/50 bg-accent-soft text-accent' : 'border-line bg-surface text-ink'
        }`}
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-ink-3">%</span>
    </span>
  )
}
