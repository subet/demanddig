import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { ScoreBadge } from '@/components/score-badge'

type SignalRow = {
  id: string
  signal_type: string
  title: string
  total_score: number | null
  demand_score: number | null
  gap_score: number | null
  feasibility_score: number | null
  fetched_at: string
}

type SearchParams = Promise<{ type?: string; sort?: string; page?: string; lang?: string }>

export default async function SignalsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const type = params.type ?? 'all'
  const sort = params.sort ?? 'total_score'
  const page = Number(params.page ?? 1)
  const limit = 25
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('signals')
    .select('id, signal_type, title, total_score, demand_score, gap_score, feasibility_score, fetched_at', { count: 'exact' })
    .range(offset, offset + limit - 1)

  if (type !== 'all') query = query.eq('signal_type', type)
  if (sort === 'total_score') query = query.order('total_score', { ascending: false })
  else if (sort === 'demand') query = query.order('demand_score', { ascending: false })
  else if (sort === 'gap') query = query.order('gap_score', { ascending: false })
  else if (sort === 'newest') query = query.order('fetched_at', { ascending: false })

  const { data, count } = await query
  const signals = (data ?? []) as SignalRow[]
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Signals</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {count ?? 0} total signals
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { label: 'All', value: 'all' },
          { label: 'GitHub', value: 'github_repo' },
          { label: 'Reddit', value: 'reddit_post' },
          { label: 'Twitter', value: 'twitter_post' },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/signals?type=${f.value}&sort=${sort}`}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              type === f.value
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <div className="ml-auto flex gap-2">
          {[
            { label: 'Score', value: 'total_score' },
            { label: 'Demand', value: 'demand' },
            { label: 'Gap', value: 'gap' },
            { label: 'Newest', value: 'newest' },
          ].map((s) => (
            <Link
              key={s.value}
              href={`/signals?type=${type}&sort=${s.value}`}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                sort === s.value
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {!signals.length ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            No signals yet. Crawlers will populate this automatically.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Signal</th>
                <th className="px-4 py-3 text-right font-medium">Demand</th>
                <th className="px-4 py-3 text-right font-medium">Gap</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {signals.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/signals/${s.id}`} className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {s.signal_type === 'github_repo' ? 'GH' : s.signal_type === 'reddit_post' ? 'RD' : 'TW'}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 truncate hover:text-zinc-900 dark:hover:text-zinc-100">
                        {s.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge value={s.demand_score} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge value={s.gap_score} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge value={s.total_score} bold />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/signals?type=${type}&sort=${sort}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/signals?type=${type}&sort=${sort}&page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
