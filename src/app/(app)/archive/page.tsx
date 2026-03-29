import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type ArchivedItem = {
  id: string
  created_at: string
  signal_id: string
  signal_title: string
  signal_type: string
  total_score: number | null
}

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  type RawRow = {
    id: string
    created_at: string
    signal_id: string
    signals: { id: string; title: string; signal_type: string; total_score: number | null } | null
  }

  const { data: rawData } = await supabase
    .from('user_saved_signals')
    .select('id, created_at, signal_id, signals:signal_id(id, title, signal_type, total_score)')
    .eq('user_id', user!.id)
    .eq('status', 'archived')
    .order('created_at', { ascending: false })

  const items: ArchivedItem[] = ((rawData ?? []) as unknown as RawRow[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    signal_id: row.signals?.id ?? '',
    signal_title: row.signals?.title ?? '',
    signal_type: row.signals?.signal_type ?? '',
    total_score: row.signals?.total_score ?? null,
  }))

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Archive</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Signals you&apos;ve dismissed — {items.length} total
        </p>
      </div>

      {!items.length ? (
        <div className="py-16 text-center text-sm text-zinc-400">
          Nothing archived yet. Use the archive button on signals you want to dismiss.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 shrink-0">
                  {item.signal_type === 'github_repo' ? 'GH' : 'RD'}
                </span>
                <Link
                  href={`/signals/${item.signal_id}`}
                  className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 truncate"
                >
                  {item.signal_title}
                </Link>
              </div>
              {item.total_score != null && (
                <span className="text-sm text-zinc-400 shrink-0">
                  {(item.total_score * 100).toFixed(0)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
