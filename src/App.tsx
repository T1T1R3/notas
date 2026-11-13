import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Boxes, FileSpreadsheet, FileStack, Landmark, Receipt, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Dropzone } from './components/Dropzone'
import { GroupTable } from './components/GroupTable'
import { NcmMatrix, OriginPanel, QuantityChart } from './components/Insights'
import { NoteList } from './components/NoteList'
import { RateBreakdown } from './components/RateBreakdown'
import { StCalculator } from './components/StCalculator'
import { AnimatedNumber } from './components/ui'
import {
  exportItemsCsv,
  fmtBRL,
  fmtNum,
  fmtPct,
  fmtRate,
  groupProducts,
  summarizeByRate,
  type GroupMode,
} from './lib/analysis'
import type { Note } from './lib/parser'

const STORE = 'separacao-notas:v2' // v2: leitura de alíquota corrigida; dados antigos são descartados

function loadStored(): Note[] {
  try {
    const raw = localStorage.getItem(STORE)
    return raw ? (JSON.parse(raw) as Note[]) : []
  } catch {
    return []
  }
}

interface Toast {
  id: number
  text: string
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>(loadStored)
  const [selected, setSelected] = useState<string>('all')
  const [mode, setMode] = useState<GroupMode>('generic')
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(notes))
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, [notes])

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
  }, [])

  const handleFiles = async (files: File[]) => {
    setBusy(true)
    const added: Note[] = []
    const { readNoteFromPdf } = await import('./lib/pdf') // pdf.js só é baixado quando necessário
    for (const f of files) {
      try {
        const n = await readNoteFromPdf(f)
        const dup = [...notes, ...added].some((x) => x.accessKey && x.accessKey === n.accessKey)
        if (dup) {
          toast(`${f.name}: nota ${n.number} já estava carregada — ignorada.`)
          continue
        }
        if (!n.products.length) toast(`${f.name}: nenhum produto encontrado (PDF digitalizado ou layout não suportado).`)
        else added.push(n)
      } catch (e) {
        console.error(e)
        toast(`${f.name}: não foi possível ler o PDF.`)
      }
    }
    if (added.length) setNotes((prev) => [...prev, ...added])
    if (added.length === 1 && notes.length === 0) setSelected('all')
    setBusy(false)
  }

  const visibleNotes = selected === 'all' ? notes : notes.filter((n) => n.id === selected)
  const products = useMemo(() => visibleNotes.flatMap((n) => n.products), [visibleNotes])
  const groups = useMemo(() => groupProducts(products, mode), [products, mode])
  const rates = useMemo(() => summarizeByRate(products), [products])
  const visibleRates = rates.map((r) => r.rate)

  const k = useMemo(() => {
    const sum = (f: (p: (typeof products)[number]) => number) => products.reduce((s, p) => s + f(p), 0)
    return {
      lines: products.length,
      qty: sum((p) => p.qty),
      total: sum((p) => p.total),
      icmsBase: sum((p) => p.icmsBase),
      icms: sum((p) => p.icmsValue),
      ipi: sum((p) => p.ipiValue),
      noteTotal: visibleNotes.reduce((s, n) => s + (n.totals.note ?? 0), 0),
    }
  }, [products, visibleNotes])

  const removeNote = (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id))
    if (selected === id) setSelected('all')
  }

  const hasData = notes.length > 0

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -12, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              className="grid size-9 place-items-center rounded-xl bg-accent text-white shadow-md shadow-accent/30"
            >
              <FileStack className="size-5" />
            </motion.div>
            <div>
              <h1 className="text-[15px] leading-tight font-semibold tracking-tight">Separação de Notas</h1>
              <p className="text-xs text-ink-3">Produtos por nome e alíquota de ICMS</p>
            </div>
          </div>
          {hasData && (
            <div className="flex gap-2">
              <button
                onClick={() => exportItemsCsv(visibleNotes)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-surface-2"
              >
                <FileSpreadsheet className="size-4" />
                <span className="hidden sm:inline">Exportar itens</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Remover todas as notas carregadas?')) {
                    setNotes([])
                    setSelected('all')
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-bad"
              >
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {!hasData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl pt-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Separe os produtos das suas notas <span className="text-accent">por alíquota</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-ink-2 text-pretty">
              Envie os PDFs dos DANFEs. O app lê os itens, agrupa produtos iguais e mostra a quantidade em cada
              alíquota de ICMS — com conferência dos totais e estatísticas.
            </p>
          </motion.div>
        )}

        <Dropzone onFiles={handleFiles} compact={hasData} busy={busy} />

        {!hasData && (
          <div className="mx-auto grid max-w-3xl gap-3 pt-2 sm:grid-cols-3">
            {[
              ['Separação automática', 'Mesmo produto em 4% e 12%? Cada alíquota vira uma linha com sua quantidade.'],
              ['Conferência', 'Soma dos itens e do ICMS comparada com os totais impressos na nota.'],
              ['Exportação', 'CSV pronto para Excel com a separação ou com todos os itens.'],
            ].map(([t, d], i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-[13px] text-ink-2">{d}</p>
              </motion.div>
            ))}
          </div>
        )}

        {hasData && (
          <>
            <NoteList notes={notes} selected={selected} onSelect={setSelected} onRemove={removeNote} />

            <AnimatePresence>
              {visibleNotes.some((n) => n.warnings.length) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-warn/30 bg-warn-soft"
                >
                  <div className="flex gap-3 p-4 text-[13px] text-warn">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <ul className="space-y-1">
                      {visibleNotes.flatMap((n) =>
                        n.warnings.map((w, i) => (
                          <li key={n.id + i}>
                            <b>NF {n.number}:</b> {w}
                          </li>
                        )),
                      )}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi
                icon={<Receipt className="size-4" />}
                label="Notas"
                value={<AnimatedNumber value={visibleNotes.length} format={(v) => fmtNum(Math.round(v))} />}
                hint={`${k.lines} linhas de produto`}
                delay={0}
              />
              <Kpi
                icon={<Boxes className="size-4" />}
                label="Unidades"
                value={<AnimatedNumber value={k.qty} format={(v) => fmtNum(Math.round(v))} />}
                hint={`${groups.length} grupos · ${rates.length} ${rates.length === 1 ? 'alíquota' : 'alíquotas'}`}
                delay={0.05}
              />
              <Kpi
                icon={<FileStack className="size-4" />}
                label="Valor dos produtos"
                value={<AnimatedNumber value={k.total} format={fmtBRL} />}
                hint={`Total das notas ${fmtBRL(k.noteTotal)}`}
                delay={0.1}
              />
              <Kpi
                icon={<Landmark className="size-4" />}
                label="ICMS destacado"
                value={<AnimatedNumber value={k.icms} format={fmtBRL} />}
                hint={`Alíquota efetiva ${k.icmsBase ? fmtRate((k.icms / k.icmsBase) * 100) : '—'}`}
                delay={0.15}
              />
              <Kpi
                icon={<Landmark className="size-4" />}
                label="IPI"
                value={<AnimatedNumber value={k.ipi} format={fmtBRL} />}
                hint={k.total ? `${fmtPct(k.ipi / k.total)} sobre produtos` : ''}
                delay={0.2}
                className="col-span-2 lg:col-span-1"
              />
            </div>

            <RateBreakdown rates={rates} delay={0.1} />

            <GroupTable groups={groups} mode={mode} onMode={setMode} rates={visibleRates} delay={0.2} />

            <StCalculator products={products} delay={0.22} />

            <div className="grid gap-5 lg:grid-cols-2">
              <QuantityChart groups={groups} delay={0.25} />
              <div className="space-y-5">
                <NcmMatrix products={products} rates={visibleRates} delay={0.3} />
                <OriginPanel products={products} delay={0.35} />
              </div>
            </div>
          </>
        )}

        <footer className="pt-6 pb-4 text-center text-xs text-ink-3">
          Leitura feita localmente com pdf.js · funciona com DANFEs em PDF com texto (não digitalizados).
        </footer>
      </main>

      <div className="fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-[13px] shadow-xl"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <span className="flex-1 text-ink-2">{t.text}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-ink-3">
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
  delay,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border border-line bg-surface p-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
        <span className="text-ink-3">{icon}</span>
        {label}
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-ink-3">{hint}</p>}
    </motion.div>
  )
}

