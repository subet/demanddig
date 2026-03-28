import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import Link from 'next/link'

const STATUSES = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'researching', label: 'Researching' },
  { value: 'building', label: 'Building' },
  { value: 'pass', label: 'Pass' },
] as const

type SavedItem = {
  id: string
  notes: string | null
  tags: string[]
  status: string
  created_at: string
  signal_id: string
  signal_title: string
  signal_type: string
  total_score: number | null
}

type SearchParams = Promise<{ status?: string }>

export default async function SavedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const status = params.status ?? 'inbox'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  type RawRow = {
    id: string
    notes: string | null
    tags: string[]
    status: string
    created_at: string
    signal_id: string
    signals: { id: string; title: string; signal_type: string; total_score: number | null } | null
  }

  const { data: rawData } = await supabase
    .from('user_saved_signals')
    .select('id, notes, tags, status, created_at, signal_id, signals:signal_id(id, title, signal_type, total_score)')
    .eq('user_id', user!.id)
    .eq('status', status)
    .order('created_at', { ascending: false })

  const raw = (rawData ?? []) as unknown as RawRow[]

  const saved: SavedItem[] = raw.map((row) => {
    const s = row.signals
    return {
      id: row.id,
      notes: row.notes,
      tags: row.tags,
      status: row.status,
      created_at: row.created_at,
      signal_id: s?.id ?? '',
      signal_title: s?.title ?? '',
      signal_type: s?.signal_type ?? '',
      total_score: s?.total_score ?? null,
    }
  })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Saved</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your idea pipeline</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-800">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/saved?status=${s.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              status === s.value
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Items */}
      {!saved.length ? (
        <div className="py-16 text-center text-sm text-zinc-400">
          Nothing here yet.{' '}
          <Link href="/signals" className="text-zinc-600 dark:text-zinc-300 hover:underline">
            Browse signals
          </Link>{' '}
          to save ideas.
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                    {item.signal_type === 'github_repo' ? 'GH' : 'RD'}
                  </span>
                  <Link
                    href={`/signals/${item.signal_id}`}
                    className="text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:underline truncate"
                  >
                    {item.signal_title}
                  </Link>
                </div>
                {item.total_score != null && (
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
                    {(item.total_score * 100).toFixed(0)}
                  </span>
                )}
              </div>
              {item.notes && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {item.notes}
                </p>
              )}
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
