import { motion } from 'motion/react'
import { Percent } from 'lucide-react'
import { useState } from 'react'
import type { RateSummary } from '../lib/analysis'
import { fmtBRL, fmtNum, fmtPct, fmtRate } from '../lib/analysis'
import { rateColor } from '../lib/colors'
import { AnimatedNumber, Card, CardHeader } from './ui'

export function RateBreakdown({ rates, delay }: { rates: RateSummary[]; delay?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = rates.reduce((s, r) => s + r.total, 0) || 1
  const totalQty = rates.reduce((s, r) => s + r.qty, 0) || 1
  const hovered = rates.find((r) => r.rate === hover)

  return (
    <Card delay={delay}>
      <CardHeader
        icon={<Percent className="size-4" />}
        title="Separação por alíquota de ICMS"
        subtitle="Participação de cada alíquota no valor dos produtos"
      />
      <div className="px-5">
        <div className="relative">
          <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
            {rates.map((r, i) => (
              <motion.div
                key={r.rate}
                initial={{ width: 0 }}
                animate={{ width: `${(r.total / total) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHover(r.rate)}
                onMouseLeave={() => setHover(null)}
                className="h-full cursor-default transition-opacity"
                style={{ background: rateColor(r.rate), opacity: hover == null || hover === r.rate ? 1 : 0.35 }}
              />
            ))}
          </div>
          <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            {hovered ? (
              <span>
                <b className="text-ink">{fmtRate(hovered.rate)}</b> · {fmtBRL(hovered.total)} ·{' '}
                {fmtPct(hovered.total / total)} do valor · {fmtNum(hovered.qty)} unidades
              </span>
            ) : (
              rates.map((r) => (
                <span key={r.rate} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: rateColor(r.rate) }} />
                  {fmtRate(r.rate)} <span className="text-ink-3">{fmtPct(r.total / total)}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {rates.map((r, i) => (
          <motion.div
            key={r.rate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            onMouseEnter={() => setHover(r.rate)}
            onMouseLeave={() => setHover(null)}
            className={`relative overflow-hidden rounded-xl border bg-surface-2/50 p-4 transition-colors ${
              hover === r.rate ? 'border-ink-3' : 'border-line'
            }`}
          >
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: rateColor(r.rate) }} />
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-ink tabular">{fmtRate(r.rate)}</span>
              <span className="text-xs text-ink-2">
                {r.lines} {r.lines === 1 ? 'linha' : 'linhas'}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">Quantidade</p>
              <p className="text-xl font-semibold text-ink">
                <AnimatedNumber value={r.qty} format={(v) => fmtNum(Math.round(v * 100) / 100)} />
                <span className="ml-1.5 text-xs font-normal text-ink-3">{fmtPct(r.qty / totalQty)} do total</span>
              </p>
            </div>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
              {[
                ['Valor dos produtos', r.total],
                ['BC ICMS', r.icmsBase],
                ['ICMS', r.icmsValue],
                ['IPI', r.ipiValue],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between gap-2">
                  <dt className="text-ink-3">{l}</dt>
                  <dd className="font-medium text-ink tabular">{fmtBRL(v as number)}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
