import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronRight, Download, GitCompareArrows, Search, Table2 } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import type { Group, GroupMode } from '../lib/analysis'
import { GROUP_MODES, exportGroupsCsv, fmtBRL, fmtNum, fmtRate, formatNcm } from '../lib/analysis'
import { rateColor } from '../lib/colors'
import { Card, CardHeader, RateBadge, Segmented } from './ui'

type SortKey = 'label' | 'qty' | 'total' | 'icmsValue' | 'rate'

export function GroupTable({
  groups,
  mode,
  onMode,
  rates,
  delay,
}: {
  groups: Group[]
  mode: GroupMode
  onMode: (m: GroupMode) => void
  rates: number[]
  delay?: number
}) {
  const [query, setQuery] = useState('')
  const [rateFilter, setRateFilter] = useState<number | null>(null)
  const [onlySplit, setOnlySplit] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'label', dir: 1 })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = groups.filter(
      (g) =>
        (rateFilter == null || g.rate === rateFilter) &&
        (!onlySplit || g.otherRates.length > 0) &&
        (!q ||
          g.label.toLowerCase().includes(q) ||
          g.ncm.includes(q.replace(/\./g, '')) ||
          g.codes.some((c) => c.toLowerCase().includes(q))),
    )
    return list.sort((a, b) => {
      const k = sort.key
      const r = k === 'label' ? a.label.localeCompare(b.label) || a.rate - b.rate : a[k] - b[k]
      return r * sort.dir
    })
  }, [groups, query, rateFilter, onlySplit, sort])

  const sum = rows.reduce(
    (s, g) => ({
      qty: s.qty + g.qty,
      total: s.total + g.total,
      icmsBase: s.icmsBase + g.icmsBase,
      icmsValue: s.icmsValue + g.icmsValue,
      ipiValue: s.ipiValue + g.ipiValue,
    }),
    { qty: 0, total: 0, icmsBase: 0, icmsValue: 0, ipiValue: 0 },
  )
  const splitCount = new Set(groups.filter((g) => g.otherRates.length).map((g) => g.baseKey)).size


  return (
    <Card delay={delay}>
      <CardHeader
        icon={<Table2 className="size-4" />}
        title="Produtos separados por nome e alíquota"
        subtitle="Cada linha soma as quantidades de um produto em uma alíquota de ICMS. Clique para ver os itens de origem."
        right={
          <button
            onClick={() => exportGroupsCsv(rows)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-2"
          >
            <Download className="size-4" /> CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
        <Segmented value={mode} onChange={onMode} options={GROUP_MODES} />
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto, código ou NCM…"
            className="w-full rounded-xl border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setRateFilter(null)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              rateFilter == null ? 'border-ink bg-ink text-surface' : 'border-line text-ink-2 hover:text-ink'
            }`}
          >
            Todas
          </button>
          {rates.map((r) => (
            <button
              key={r}
              onClick={() => setRateFilter(rateFilter === r ? null : r)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular ${
                rateFilter === r ? 'border-ink bg-ink text-surface' : 'border-line text-ink-2 hover:text-ink'
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: rateColor(r) }} />
              {fmtRate(r)}
            </button>
          ))}
          {splitCount > 0 && (
            <button
              onClick={() => setOnlySplit((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                onlySplit ? 'border-warn bg-warn-soft text-warn' : 'border-line text-ink-2 hover:text-ink'
              }`}
            >
              <GitCompareArrows className="size-3.5" /> Em mais de uma alíquota ({splitCount})
            </button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-line border-t border-line md:hidden">
        {rows.map((g) => (
          <li key={g.key} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{g.label}</p>
                <p className="truncate font-mono text-[11px] text-ink-3">
                  {formatNcm(g.ncm)} · {g.codes.join(', ')}
                </p>
              </div>
              <RateBadge rate={g.rate} />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-lg font-semibold text-ink tabular">
                {fmtNum(g.qty)} <span className="text-xs font-normal text-ink-3">{g.units.join('/')}</span>
              </span>
              <span className="text-right text-xs text-ink-2 tabular">
                {fmtBRL(g.total)}
                <br />
                ICMS {fmtBRL(g.icmsValue)}
              </span>
            </div>
            {g.otherRates.length > 0 && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                <GitCompareArrows className="size-3" /> também em {g.otherRates.map(fmtRate).join(', ')}
              </span>
            )}
          </li>
        ))}
        {rows.length > 0 && (
          <li className="flex justify-between bg-surface-2/60 px-4 py-3 text-sm font-semibold text-ink tabular">
            <span>Total</span>
            <span>
              {fmtNum(sum.qty)} un · {fmtBRL(sum.total)}
            </span>
          </li>
        )}
      </ul>

      <div className="hidden overflow-x-auto border-t border-line md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-surface-2/60">
            <tr>
              <th className="w-8" />
              <ThCell sort={sort} onSort={setSort} k="label">Produto</ThCell>
              <ThCell sort={sort} onSort={setSort}>NCM</ThCell>
              <ThCell sort={sort} onSort={setSort} k="rate">Alíquota</ThCell>
              <ThCell sort={sort} onSort={setSort} k="qty" right>
                Quantidade
              </ThCell>
              <ThCell sort={sort} onSort={setSort} k="total" right>
                Valor total
              </ThCell>
              <ThCell sort={sort} onSort={setSort} right>BC ICMS</ThCell>
              <ThCell sort={sort} onSort={setSort} k="icmsValue" right>
                ICMS
              </ThCell>
              <ThCell sort={sort} onSort={setSort} right>IPI</ThCell>
              <ThCell sort={sort} onSort={setSort} right>Preço médio</ThCell>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((g, i) => {
                const isOpen = open === g.key
                return (
                  <Fragment key={g.key}>
                    <motion.tr
                      layout="position"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => setOpen(isOpen ? null : g.key)}
                      className={`cursor-pointer border-t border-line transition-colors hover:bg-surface-2/60 ${
                        isOpen ? 'bg-surface-2/60' : ''
                      }`}
                    >
                      <td className="pl-4">
                        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="inline-block text-ink-3">
                          <ChevronRight className="size-4" />
                        </motion.span>
                      </td>
                      <td className="max-w-[340px] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink" title={g.label}>
                            {g.label}
                          </span>
                          {g.otherRates.length > 0 && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn"
                              title="O mesmo produto aparece também em outra alíquota"
                            >
                              <GitCompareArrows className="size-3" /> também {g.otherRates.map(fmtRate).join(', ')}
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[11px] text-ink-3" title={g.codes.join(', ')}>
                          {g.codes.length} {g.codes.length === 1 ? 'código' : 'códigos'}: {g.codes.join(', ')}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-2">{formatNcm(g.ncm)}</td>
                      <td className="px-3 py-3">
                        <RateBadge rate={g.rate} />
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular">
                        <span className="text-base font-semibold text-ink">{fmtNum(g.qty)}</span>
                        <span className="ml-1 text-xs text-ink-3">{g.units.join('/')}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium whitespace-nowrap text-ink tabular">
                        {fmtBRL(g.total)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap text-ink-2 tabular">{fmtBRL(g.icmsBase)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap text-ink-2 tabular">{fmtBRL(g.icmsValue)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap text-ink-2 tabular">{fmtBRL(g.ipiValue)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap text-ink-2 tabular">
                        {fmtBRL(g.qty ? g.total / g.qty : 0)}
                      </td>
                    </motion.tr>
                    {isOpen && (
                      <tr className="bg-surface-2/40">
                        <td colSpan={10} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-12 pt-1 pb-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-ink-3">
                                    <th className="py-1.5 text-left font-medium">Nota</th>
                                    <th className="py-1.5 text-left font-medium">Código</th>
                                    <th className="py-1.5 text-left font-medium">Descrição</th>
                                    <th className="py-1.5 text-left font-medium">CST</th>
                                    <th className="py-1.5 text-left font-medium">CFOP</th>
                                    <th className="py-1.5 text-left font-medium">Pedido</th>
                                    <th className="py-1.5 text-right font-medium">Qtd</th>
                                    <th className="py-1.5 text-right font-medium">V. unit.</th>
                                    <th className="py-1.5 text-right font-medium">V. total</th>
                                    <th className="py-1.5 text-right font-medium">ICMS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items.map((p) => (
                                    <tr key={p.id} className="border-t border-line/70 text-ink-2">
                                      <td className="py-1.5 tabular">{p.noteNumber}</td>
                                      <td className="py-1.5 font-mono text-ink">{p.code}</td>
                                      <td className="py-1.5">{p.name}</td>
                                      <td className="py-1.5 font-mono">{p.cst}</td>
                                      <td className="py-1.5 font-mono">{p.cfop}</td>
                                      <td className="py-1.5">{p.order || '—'}</td>
                                      <td className="py-1.5 text-right font-medium text-ink tabular">
                                        {fmtNum(p.qty)} {p.unit}
                                      </td>
                                      <td className="py-1.5 text-right tabular">{fmtBRL(p.unitPrice)}</td>
                                      <td className="py-1.5 text-right tabular">{fmtBRL(p.total)}</td>
                                      <td className="py-1.5 text-right tabular">{fmtBRL(p.icmsValue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </AnimatePresence>
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-3">
                  Nenhum produto corresponde aos filtros.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-line bg-surface-2/60 font-semibold text-ink">
              <tr>
                <td />
                <td className="px-3 py-3" colSpan={3}>
                  Total ({rows.length} {rows.length === 1 ? 'grupo' : 'grupos'})
                </td>
                <td className="px-3 py-3 text-right tabular">{fmtNum(sum.qty)}</td>
                <td className="px-3 py-3 text-right tabular">{fmtBRL(sum.total)}</td>
                <td className="px-3 py-3 text-right tabular">{fmtBRL(sum.icmsBase)}</td>
                <td className="px-3 py-3 text-right tabular">{fmtBRL(sum.icmsValue)}</td>
                <td className="px-3 py-3 text-right tabular">{fmtBRL(sum.ipiValue)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}

type ThProps = {
  k?: SortKey
  children: React.ReactNode
  right?: boolean
  sort: { key: SortKey; dir: 1 | -1 }
  onSort: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: 1 | -1 }>>
}

function ThCell({ k, children, right, sort, onSort }: ThProps) {
  return (
    <th
      onClick={
        k ? () => onSort((s) => ({ key: k, dir: s.key === k ? (-s.dir as 1 | -1) : k === 'label' ? 1 : -1 })) : undefined
      }
      className={`px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-ink-3 uppercase ${
        right ? 'text-right' : 'text-left'
      } ${k ? 'cursor-pointer select-none hover:text-ink' : ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {k && sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </span>
    </th>
  )
}
