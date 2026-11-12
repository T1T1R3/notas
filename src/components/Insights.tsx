import { motion } from 'motion/react'
import { BarChart3, Globe2, Grid3x3 } from 'lucide-react'
import { useState } from 'react'
import type { Group } from '../lib/analysis'
import { fmtBRL, fmtNum, fmtPct, fmtRate, formatNcm, summarizeBy } from '../lib/analysis'
import { rateColor } from '../lib/colors'
import { ORIGIN_LABELS, type Product } from '../lib/parser'
import { Card, CardHeader, RateBadge } from './ui'

/** Barras horizontais de quantidade por grupo, coloridas pela alíquota. */
export function QuantityChart({ groups, delay }: { groups: Group[]; delay?: number }) {
  const [hover, setHover] = useState<string | null>(null)
  const top = [...groups].sort((a, b) => b.qty - a.qty).slice(0, 10)
  const max = Math.max(...top.map((g) => g.qty), 1)
  const rates = [...new Set(top.map((g) => g.rate))].sort((a, b) => a - b)

  return (
    <Card delay={delay}>
      <CardHeader
        icon={<BarChart3 className="size-4" />}
        title="Quantidade por produto"
        subtitle={groups.length > 10 ? 'Os 10 grupos com maior quantidade' : 'Unidades por grupo e alíquota'}
        right={
          rates.length > 1 && (
            <div className="flex gap-3 text-xs text-ink-2">
              {rates.map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: rateColor(r) }} />
                  {fmtRate(r)}
                </span>
              ))}
            </div>
          )
        }
      />
      <div className="space-y-2.5 px-5 pb-5">
        {top.map((g, i) => (
          <div
            key={g.key}
            onMouseEnter={() => setHover(g.key)}
            onMouseLeave={() => setHover(null)}
            className="group relative"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-ink-2" title={g.label}>
                  {g.label}
                </span>
                <RateBadge rate={g.rate} size="sm" />
              </span>
              <span className="shrink-0 font-semibold text-ink tabular">
                {fmtNum(g.qty)} <span className="font-normal text-ink-3">{g.units.join('/')}</span>
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(g.qty / max) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{
                  background: rateColor(g.rate),
                  opacity: hover == null || hover === g.key ? 1 : 0.4,
                  transition: 'opacity .15s',
                }}
              />
            </div>
            {hover === g.key && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute top-full right-0 z-20 mt-1.5 w-60 rounded-xl border border-line bg-surface p-3 text-xs shadow-xl"
              >
                <p className="mb-1.5 font-semibold text-ink">{g.label}</p>
                <div className="space-y-0.5 text-ink-2">
                  <p className="flex justify-between">
                    Alíquota <RateBadge rate={g.rate} size="sm" />
                  </p>
                  <p className="flex justify-between">
                    NCM <span className="font-mono text-ink">{formatNcm(g.ncm)}</span>
                  </p>
                  <p className="flex justify-between">
                    Valor <span className="text-ink tabular">{fmtBRL(g.total)}</span>
                  </p>
                  <p className="flex justify-between">
                    ICMS <span className="text-ink tabular">{fmtBRL(g.icmsValue)}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Matriz NCM × alíquota com quantidade e valor. */
export function NcmMatrix({ products, rates, delay }: { products: Product[]; rates: number[]; delay?: number }) {
  const ncms = summarizeBy(products, (p) => p.ncm)
  const cell = (ncm: string, rate: number) => {
    const list = products.filter((p) => p.ncm === ncm && p.icmsRate === rate)
    return list.length
      ? { qty: list.reduce((s, p) => s + p.qty, 0), total: list.reduce((s, p) => s + p.total, 0) }
      : null
  }
  return (
    <Card delay={delay}>
      <CardHeader
        icon={<Grid3x3 className="size-4" />}
        title="Matriz NCM × alíquota"
        subtitle="Quantidade e valor de cada NCM em cada alíquota"
      />
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-ink-3 uppercase">
              <th className="py-2 text-left font-semibold">NCM</th>
              {rates.map((r) => (
                <th key={r} className="px-2 py-2 text-right font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: rateColor(r) }} />
                    {fmtRate(r)}
                  </span>
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {ncms.map((n) => (
              <tr key={n.key} className="border-t border-line">
                <td className="py-2.5 font-mono text-xs text-ink">{formatNcm(n.key)}</td>
                {rates.map((r) => {
                  const c = cell(n.key, r)
                  return (
                    <td key={r} className="px-2 py-2.5 text-right tabular">
                      {c ? (
                        <>
                          <p className="font-semibold text-ink">{fmtNum(c.qty)}</p>
                          <p className="text-[11px] text-ink-3">{fmtBRL(c.total)}</p>
                        </>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="py-2.5 pl-2 text-right tabular">
                  <p className="font-semibold text-ink">{fmtNum(n.qty)}</p>
                  <p className="text-[11px] text-ink-3">{fmtBRL(n.total)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Origem da mercadoria (1º dígito do CST) — explica por que alguns itens têm 4%. */
export function OriginPanel({ products, delay }: { products: Product[]; delay?: number }) {
  const origins = summarizeBy(products, (p) => p.origin)
  const total = origins.reduce((s, o) => s + o.total, 0) || 1
  return (
    <Card delay={delay}>
      <CardHeader
        icon={<Globe2 className="size-4" />}
        title="Origem da mercadoria"
        subtitle="1º dígito do CST — define se a operação interestadual pode usar 4%"
      />
      <div className="space-y-3 px-5 pb-5">
        {origins.map((o, i) => {
          const rs = [...new Set(products.filter((p) => p.origin === o.key).map((p) => p.icmsRate))].sort(
            (a, b) => a - b,
          )
          return (
            <div key={o.key}>
              <div className="mb-1 flex items-start justify-between gap-3 text-xs">
                <span className="text-ink-2">
                  <b className="font-mono text-ink">{o.key}</b> · {ORIGIN_LABELS[o.key] ?? 'Origem não identificada'}
                </span>
                <span className="flex shrink-0 gap-1">
                  {rs.map((r) => (
                    <RateBadge key={r} rate={r} size="sm" />
                  ))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(o.total / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06 }}
                    className="h-full rounded-full bg-ink-2"
                  />
                </div>
                <span className="w-36 shrink-0 text-right text-xs whitespace-nowrap text-ink tabular">
                  {fmtBRL(o.total)} <span className="text-ink-3">{fmtPct(o.total / total)}</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

