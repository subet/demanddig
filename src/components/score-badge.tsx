import { clsx } from 'clsx'

export function ScoreBadge({
  value,
  bold = false,
}: {
  value: number | null
  bold?: boolean
}) {
  if (value == null) return <span className="text-zinc-300 dark:text-zinc-600">—</span>

  const pct = Math.round(value * 100)
  const color =
    pct >= 70
      ? 'text-green-600 dark:text-green-400'
      : pct >= 45
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-zinc-400'

  return (
    <span className={clsx(color, bold && 'font-semibold')}>
      {pct}
    </span>
  )
}
