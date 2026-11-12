import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { rateColor } from '../lib/colors'
import { fmtRate } from '../lib/analysis'

export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => format(v))
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [mv, value])
  return <motion.span className="tabular">{text}</motion.span>
}

export function Card({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

export function RateBadge({ rate, size = 'md' }: { rate: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg' ? 'px-3 py-1 text-sm' : size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 font-semibold text-ink tabular ${cls}`}
    >
      <span className="size-2 rounded-full" style={{ background: rateColor(rate) }} />
      {fmtRate(rate)}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; hint?: string }[]
}) {
  return (
    <div className="relative inline-flex max-w-full overflow-x-auto rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={`relative z-10 rounded-lg px-3 py-1.5 whitespace-nowrap text-[13px] font-medium transition-colors ${
            value === o.id ? 'text-ink' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.id).join('')}`}
              className="absolute inset-0 -z-10 rounded-lg border border-line bg-surface shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}
