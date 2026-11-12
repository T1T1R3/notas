import { AnimatePresence, motion } from 'motion/react'
import { FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'

export function Dropzone({
  onFiles,
  compact,
  busy,
}: {
  onFiles: (files: File[]) => void
  compact: boolean
  busy: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (files.length) onFiles(files)
  }

  return (
    <motion.div
      layout
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        take(e.dataTransfer.files)
      }}
      onClick={() => input.current?.click()}
      animate={{ scale: over ? 1.01 : 1 }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
        over ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/60'
      } ${compact ? 'px-5 py-4' : 'px-6 py-16'}`}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      {!compact && <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />}
      <div className={`relative flex items-center gap-4 ${compact ? '' : 'flex-col text-center'}`}>
        <motion.div
          animate={over ? { y: -4, rotate: -6 } : { y: 0, rotate: 0 }}
          className={`grid shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25 ${
            compact ? 'size-10' : 'size-16'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.span key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className={`animate-spin ${compact ? 'size-5' : 'size-7'}`} />
              </motion.span>
            ) : (
              <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileUp className={compact ? 'size-5' : 'size-7'} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        <div>
          <p className={`font-semibold tracking-tight text-ink ${compact ? 'text-sm' : 'text-xl'}`}>
            {busy ? 'Lendo notas…' : compact ? 'Adicionar mais notas' : 'Solte aqui os PDFs das notas (DANFE)'}
          </p>
          <p className={`text-ink-2 ${compact ? 'text-xs' : 'mt-1 text-sm'}`}>
            {compact
              ? 'Arraste ou clique — os dados são somados às notas já carregadas'
              : 'ou clique para escolher. Pode selecionar vários arquivos de uma vez.'}
          </p>
          {!compact && (
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-good-soft px-3 py-1 text-xs font-medium text-good">
              <ShieldCheck className="size-3.5" /> Processado 100% no seu navegador — nenhum arquivo é enviado
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
