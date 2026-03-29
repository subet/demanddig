import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Signal, GithubRepo, SocialPost } from '@/lib/supabase/types'
import { SignalActions } from '@/components/signal-actions'

type Props = { params: Promise<{ id: string }> }

type SignalWithJoins = Signal & {
  github_repos: GithubRepo | null
  social_posts: SocialPost | null
}

export default async function SignalDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data }, { data: savedRows }] = await Promise.all([
    supabase
      .from('signals')
      .select('*, github_repos:ref_github_repo(*), social_posts:ref_social_post(*)')
      .eq('id', id)
      .single(),
    user
      ? supabase
          .from('user_saved_signals')
          .select('status')
          .eq('user_id', user.id)
          .eq('signal_id', id)
          .limit(1)
      : Promise.resolve({ data: [] }),
  ])

  if (!data) notFound()

  const signal = data as unknown as SignalWithJoins
  const repo = signal.github_repos
  const post = signal.social_posts

  const savedStatus = (savedRows as { status: string }[] | null)?.[0]?.status
  const initialState =
    savedStatus === 'archived' ? 'archived' : savedStatus ? 'saved' : 'none'

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href="/signals"
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 inline-block"
        >
          ← Back to signals
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            {signal.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span className="text-xs font-medium px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {signal.signal_type === 'github_repo' ? 'GitHub' : signal.signal_type === 'reddit_post' ? 'Reddit' : 'Twitter'}
            </span>
            <SignalActions signalId={id} initialState={initialState} alwaysVisible />
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Demand', value: signal.demand_score },
          { label: 'Gap', value: signal.gap_score },
          { label: 'Feasibility', value: signal.feasibility_score },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {s.value != null ? (s.value * 100).toFixed(0) : '—'}
            </div>
            <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      {signal.summary && (
        <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">AI Insight</span>
            {signal.suggested_name && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                {signal.suggested_name}
              </span>
            )}
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{signal.summary}</p>
          {(signal.target_user || signal.monetization) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100 dark:border-blue-900">
              {signal.target_user && (
                <div>
                  <div className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1">Target user</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">{signal.target_user}</div>
                </div>
              )}
              {signal.monetization && (
                <div>
                  <div className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1">Monetization</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">{signal.monetization}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GitHub metadata */}
      {repo && (
        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Repository</h2>
          <a
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono"
          >
            {repo.full_name}
          </a>
          {repo.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{repo.description}</p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Stars</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.stars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Forks</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.forks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Language</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.language ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Contributors</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.contributor_count ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Open issues</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.open_issues.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Has website</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{repo.has_website ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {repo.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reddit/Twitter post metadata */}
      {post && (
        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Post</h2>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>↑ {post.upvotes.toLocaleString()}</span>
              <span>💬 {post.comment_count.toLocaleString()}</span>
              {post.subreddit && <span>r/{post.subreddit}</span>}
            </div>
          </div>
          {post.title && (
            <p className="font-medium text-zinc-800 dark:text-zinc-200">{post.title}</p>
          )}
          {post.body && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-10">
              {post.body}
            </p>
          )}
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-block"
            >
              View original post →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
