import { createClient } from 'jsr:@supabase/supabase-js@2'

const REDDIT_API = 'https://oauth.reddit.com'
const POSTS_PER_RUN = 25
const PAIRS_PER_INVOCATION = 5 // process N subreddit/query pairs per run to stay under 150s

interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  subreddit: string
  url: string
  permalink: string
  score: number
  num_comments: number
  created_utc: number
}

interface RedditListing {
  data: {
    children: { data: RedditPost }[]
    after: string | null
  }
}

async function getRedditToken(clientId: string, clientSecret: string, userAgent: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function searchSubreddit(
  subreddit: string,
  query: string,
  after: string | null,
  token: string,
  userAgent: string
): Promise<RedditListing> {
  const params = new URLSearchParams({
    q: query,
    sort: 'top',
    t: 'year',
    limit: String(POSTS_PER_RUN),
    type: 'link',
    ...(after ? { after } : {}),
  })

  const url = `${REDDIT_API}/r/${subreddit}/search.json?${params}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
    },
  })

  if (!res.ok) throw new Error(`Reddit search failed: ${res.status} for r/${subreddit}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const clientId = Deno.env.get('REDDIT_CLIENT_ID')
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET')
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') ?? 'demanddig/1.0'

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get Reddit OAuth token
  let token: string
  try {
    token = await getRedditToken(clientId, clientSecret, userAgent)
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pick the next N idle reddit_sub jobs ordered by last_run_at
  const { data: jobs } = await supabase
    .from('crawl_jobs')
    .select('*')
    .eq('job_type', 'reddit_sub')
    .eq('status', 'idle')
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(PAIRS_PER_INVOCATION)

  if (!jobs?.length) {
    return new Response(JSON.stringify({ message: 'No idle Reddit jobs' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: { job: string; inserted: number; error?: string }[] = []

  for (const job of jobs) {
    // target format: "subreddit|query string"
    const [subreddit, query] = job.target.split('|')
    if (!subreddit || !query) continue

    await supabase
      .from('crawl_jobs')
      .update({ status: 'running' })
      .eq('id', job.id)

    try {
      const after = job.last_cursor ?? null
      const listing = await searchSubreddit(subreddit, query, after, token, userAgent)

      const posts = listing.data.children.map((c) => c.data)
      const nextCursor = listing.data.after ?? null

      if (!posts.length) {
        await supabase
          .from('crawl_jobs')
          .update({
            status: 'idle',
            last_run_at: new Date().toISOString(),
            last_cursor: null, // reset
            run_count: job.run_count + 1,
            error_msg: null,
          })
          .eq('id', job.id)
        results.push({ job: job.target, inserted: 0 })
        continue
      }

      // Upsert posts
      const rows = posts.map((p) => ({
        source: 'reddit' as const,
        external_id: p.id,
        url: `https://reddit.com${p.permalink}`,
        title: p.title,
        body: p.selftext || null,
        author: p.author,
        subreddit: p.subreddit,
        upvotes: p.score,
        comment_count: p.num_comments,
        created_at_src: new Date(p.created_utc * 1000).toISOString(),
        fetched_at: new Date().toISOString(),
        raw_data: p as unknown as Record<string, unknown>,
      }))

      const { error: upsertError } = await supabase
        .from('social_posts')
        .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: false })

      if (upsertError) throw new Error(upsertError.message)

      await supabase
        .from('crawl_jobs')
        .update({
          status: 'idle',
          last_run_at: new Date().toISOString(),
          last_cursor: nextCursor,
          run_count: job.run_count + 1,
          error_msg: null,
        })
        .eq('id', job.id)

      results.push({ job: job.target, inserted: rows.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('crawl_jobs')
        .update({ status: 'error', error_msg: message })
        .eq('id', job.id)
      results.push({ job: job.target, inserted: 0, error: message })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
