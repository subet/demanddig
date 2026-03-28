import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import type { Tables } from '@/lib/supabase/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = data as Tables<'user_profiles'> | null

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Account and preferences</p>
      </div>

      {/* Account */}
      <section className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-5 py-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Account</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Email</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Plan</span>
            <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
              {profile?.plan ?? 'free'}
            </span>
          </div>
        </div>
      </section>

      {/* Crawler status */}
      <section className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-5 py-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Crawlers</h2>
        </div>
        <div className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
          Configure crawler settings and API keys in your{' '}
          <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            .env.local
          </code>{' '}
          file. Crawlers run automatically via Supabase Edge Function crons.
        </div>
        <div className="px-5 py-4">
          <dl className="space-y-2 text-sm">
            {[
              { key: 'GITHUB_TOKEN', desc: 'GitHub Personal Access Token (5,000 req/hr)' },
              { key: 'REDDIT_CLIENT_ID', desc: 'Reddit OAuth app client ID' },
              { key: 'REDDIT_CLIENT_SECRET', desc: 'Reddit OAuth app client secret' },
              { key: 'OPENAI_API_KEY', desc: 'OpenAI key for AI summaries' },
            ].map((v) => (
              <div key={v.key} className="flex items-start gap-3">
                <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                  {v.key}
                </code>
                <span className="text-zinc-400">{v.desc}</span>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
