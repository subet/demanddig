import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          DemandDig
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 py-24">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Find your next SaaS idea
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            DemandDig scans GitHub, Reddit, and Twitter to surface real unmet demand —
            repos without a SaaS counterpart, posts crying out for a product that doesn&apos;t exist yet.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 transition-colors"
          >
            Get started free
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 max-w-3xl w-full text-left">
          {[
            {
              icon: '⚡',
              title: 'GitHub signals',
              desc: 'Index repos with high stars but no hosted product. Find the gap.',
            },
            {
              icon: '📣',
              title: 'Reddit demand',
              desc: 'Surface posts from r/startups, r/selfhosted, r/SaaS where people beg for tools.',
            },
            {
              icon: '🎯',
              title: 'Scored & ranked',
              desc: 'Every signal gets a demand, gap, and feasibility score. Filter to your sweet spot.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-5 space-y-2"
            >
              <div className="text-2xl">{f.icon}</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
