import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type TopSignal = {
  id: string
  title: string
  signal_type: string
  total_score: number | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: totalSignals }, { count: githubCount }, { count: redditCount }] =
    await Promise.all([
      supabase.from('signals').select('*', { count: 'exact', head: true }),
      supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('signal_type', 'github_repo'),
      supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('signal_type', 'reddit_post'),
    ])

  const { data } = await supabase
    .from('signals')
    .select('id, title, signal_type, total_score')
    .order('total_score', { ascending: false })
    .limit(5)

  const topSignals = (data ?? []) as TopSignal[]

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Overview of all crawled demand signals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total signals', value: totalSignals ?? 0 },
          { label: 'GitHub repos', value: githubCount ?? 0 },
          { label: 'Reddit posts', value: redditCount ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
          >
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {s.value.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top signals */}
      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            Top signals this week
          </h2>
        </div>
        {!topSignals.length ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            No signals yet — crawlers will populate this once configured.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topSignals.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                    {s.signal_type === 'github_repo' ? 'GH' : 'RD'}
                  </span>
                  <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate">
                    {s.title}
                  </span>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 shrink-0 ml-4">
                  {s.total_score != null ? (s.total_score * 100).toFixed(0) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
