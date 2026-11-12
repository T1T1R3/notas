import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, FileText, Layers, X } from 'lucide-react'
import type { Note } from '../lib/parser'
import { checkNote, fmtBRL } from '../lib/analysis'

export function NoteList({
  notes,
  selected,
  onSelect,
  onRemove,
}: {
  notes: Note[]
  selected: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
      <button
        onClick={() => onSelect('all')}
        className={`relative flex w-44 shrink-0 snap-start flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
          selected === 'all' ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink-3'
        }`}
      >
        <Layers className={`size-5 ${selected === 'all' ? 'text-accent' : 'text-ink-3'}`} />
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Todas as notas</p>
          <p className="text-xs text-ink-2">
            {notes.length} {notes.length === 1 ? 'nota consolidada' : 'notas consolidadas'}
          </p>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {notes.map((n) => {
          const chk = checkNote(n)
          const ok = chk.productsOk !== false && chk.icmsOk !== false && chk.ipiOk !== false && n.warnings.length === 0
          const active = selected === n.id
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              className="shrink-0 snap-start"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(n.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}
                className={`group relative w-72 cursor-pointer rounded-2xl border p-4 transition-colors ${
                  active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink-3'
                }`}
              >
                <button
                  aria-label="Remover nota"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(n.id)
                  }}
                  className="absolute top-3 right-3 rounded-md p-1 text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-bad"
                >
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-ink-3" />
                  <span className="text-sm font-semibold text-ink tabular">
                    NF {n.number || '—'}
                    {n.series && <span className="font-normal text-ink-3"> · série {n.series}</span>}
                  </span>
                </div>
                <p className="mt-2 truncate text-[13px] font-medium text-ink" title={n.issuerName}>
                  {n.issuerName}
                </p>
                <p className="truncate text-xs text-ink-2">
                  {n.issueDate || 'sem data'} · {n.issuerUf || '?'} → {n.recipientUf || '?'} · {n.products.length}{' '}
                  {n.products.length === 1 ? 'item' : 'itens'}
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-base font-semibold text-ink tabular">
                    {n.totals.note != null ? fmtBRL(n.totals.note) : '—'}
                  </span>
                  {ok ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-medium text-good"
                      title="Soma dos itens, do ICMS e do IPI conferem com os totais da nota"
                    >
                      <CheckCircle2 className="size-3" /> Conferida
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn"
                      title={n.warnings.join('\n')}
                    >
                      <AlertTriangle className="size-3" /> Verificar
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
