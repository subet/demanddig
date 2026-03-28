import { createClient } from 'jsr:@supabase/supabase-js@2'

const GITHUB_API = 'https://api.github.com'
const REPOS_PER_RUN = 50

interface GitHubRepo {
  id: number
  full_name: string
  description: string | null
  homepage: string | null
  language: string | null
  topics: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string | null
  created_at: string | null
  license: { spdx_id: string } | null
  archived: boolean
}

interface GitHubSearchResponse {
  items: GitHubRepo[]
  total_count: number
}

Deno.serve(async (req) => {
  // Allow manual POST triggers
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const githubToken = Deno.env.get('GITHUB_TOKEN')
  if (!githubToken) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'demanddig/1.0',
  }

  // Pick the next job that hasn't run recently (oldest first)
  const { data: job, error: jobError } = await supabase
    .from('crawl_jobs')
    .select('*')
    .eq('job_type', 'github_search')
    .eq('status', 'idle')
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .single()

  if (jobError || !job) {
    return new Response(JSON.stringify({ message: 'No idle GitHub jobs found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Mark job as running
  await supabase
    .from('crawl_jobs')
    .update({ status: 'running' })
    .eq('id', job.id)

  try {
    // Build search URL with pagination cursor
    const page = job.last_cursor ? parseInt(job.last_cursor, 10) : 1
    const perPage = REPOS_PER_RUN
    const query = encodeURIComponent(job.target)
    const url = `${GITHUB_API}/search/repositories?q=${query}&sort=stars&order=desc&per_page=${perPage}&page=${page}`

    const res = await fetch(url, { headers })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub API error ${res.status}: ${text}`)
    }

    const data: GitHubSearchResponse = await res.json()

    if (!data.items?.length) {
      // No more results — reset cursor to start over next run
      await supabase
        .from('crawl_jobs')
        .update({
          status: 'idle',
          last_run_at: new Date().toISOString(),
          last_cursor: '1',
          run_count: job.run_count + 1,
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({ message: 'No results, cursor reset', job: job.target }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Upsert repos
    const repos = data.items.map((r) => ({
      github_id: r.id,
      full_name: r.full_name,
      description: r.description,
      homepage: r.homepage || null,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      forks: r.forks_count,
      open_issues: r.open_issues_count,
      last_commit_at: r.pushed_at,
      created_at_github: r.created_at,
      license: r.license?.spdx_id ?? null,
      is_archived: r.archived,
      has_website: !!(r.homepage && r.homepage.trim()),
      raw_data: r as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('github_repos')
      .upsert(repos, { onConflict: 'github_id', ignoreDuplicates: false })

    if (upsertError) throw new Error(`Upsert error: ${upsertError.message}`)

    // Advance cursor — if we got fewer results than requested, reset to page 1 next run
    const nextPage = data.items.length < perPage ? 1 : page + 1

    await supabase
      .from('crawl_jobs')
      .update({
        status: 'idle',
        last_run_at: new Date().toISOString(),
        last_cursor: String(nextPage),
        run_count: job.run_count + 1,
        error_msg: null,
      })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({
        message: 'OK',
        job: job.target,
        inserted: repos.length,
        nextPage,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await supabase
      .from('crawl_jobs')
      .update({ status: 'error', error_msg: message })
      .eq('id', job.id)

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
