import { createClient } from 'jsr:@supabase/supabase-js@2'

const BATCH_SIZE = 20
const SCORE_VERSION = 1
const AI_SCORE_THRESHOLD = 0.55
const DEADLINE_MS = 110_000 // stop before Edge Function 150s wall-clock limit

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function scoreGithubRepo(repo: Record<string, unknown>): {
  demand: number
  gap: number
  feasibility: number
} {
  const stars = (repo.stars as number) ?? 0
  const forks = (repo.forks as number) ?? 0
  const openIssues = (repo.open_issues as number) ?? 0
  const contributors = (repo.contributor_count as number | null) ?? 1
  const hasWebsite = (repo.has_website as boolean) ?? false
  const isArchived = (repo.is_archived as boolean) ?? false
  const language = (repo.language as string | null) ?? ''
  const lastCommitAt = repo.last_commit_at as string | null
  const topics = (repo.topics as string[]) ?? []

  // Demand: stars are the vote count
  const demand = Math.min(Math.log10(stars + 1) / Math.log10(50_000), 1)

  // Gap: no website + no commercial topics
  const commercialTopics = ['saas', 'hosted', 'cloud', 'enterprise', 'platform']
  const hasCommercialTopic = topics.some((t) => commercialTopics.includes(t.toLowerCase()))
  let gap = 0.5
  if (!hasWebsite && !hasCommercialTopic) gap = 0.85
  else if (!hasWebsite || !hasCommercialTopic) gap = 0.55
  else gap = 0.2

  // Feasibility
  const langScore: Record<string, number> = {
    TypeScript: 0.9, JavaScript: 0.85, Python: 0.85,
    Go: 0.8, Rust: 0.75, Ruby: 0.75, Swift: 0.65,
    'C#': 0.65, Java: 0.6, C: 0.4, 'C++': 0.4,
  }
  const langFeasibility = langScore[language] ?? 0.5

  // Recency score
  let recencyScore = 0.3
  if (lastCommitAt) {
    const monthsAgo = (Date.now() - new Date(lastCommitAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo < 3) recencyScore = 1.0
    else if (monthsAgo < 6) recencyScore = 0.85
    else if (monthsAgo < 12) recencyScore = 0.7
    else if (monthsAgo < 24) recencyScore = 0.5
  }

  // Solo-buildable: fewer contributors = easier to replicate
  const contributorScore = contributors <= 3 ? 0.9 : contributors <= 10 ? 0.7 : 0.5

  // Penalty for archived repos
  const archivePenalty = isArchived ? 0.3 : 1.0

  // Low issue velocity is good (manageable scope)
  const issueScore = openIssues < 10 ? 0.9 : openIssues < 50 ? 0.75 : openIssues < 200 ? 0.6 : 0.4

  const feasibility =
    (langFeasibility * 0.3 + recencyScore * 0.3 + contributorScore * 0.25 + issueScore * 0.15) *
    archivePenalty

  return {
    demand: Math.min(Math.max(demand, 0), 1),
    gap: Math.min(Math.max(gap, 0), 1),
    feasibility: Math.min(Math.max(feasibility, 0), 1),
  }
}

function scoreSocialPost(post: Record<string, unknown>): {
  demand: number
  gap: number
  feasibility: number
} {
  const upvotes = (post.upvotes as number) ?? 0
  const comments = (post.comment_count as number) ?? 0
  const body = ((post.body as string) ?? '').toLowerCase()
  const subreddit = (post.subreddit as string | null) ?? ''
  const createdAt = post.created_at_src as string | null

  // Demand: upvotes + comment engagement
  const upvoteScore = Math.min(Math.log10(upvotes + 1) / Math.log10(10_000), 1)
  const commentBonus = Math.min(comments / 200, 0.15)
  const demand = Math.min(upvoteScore + commentBonus, 1)

  // Gap: explicit "nothing exists" language
  const gapSignals = [
    "there's nothing",
    'there is nothing',
    "couldn't find",
    'could not find',
    "doesn't exist",
    'does not exist',
    'no good',
    'no open source',
    'looking for',
    'wish there was',
    "isn't there",
    'is not there',
    'there should be',
    'why not',
    'anyone know',
    'any tool',
    'no tool',
  ]
  const hasGapSignal = gapSignals.some((s) => body.includes(s))
  const gap = hasGapSignal ? 0.85 : 0.45

  // Feasibility: recency + subreddit
  let recencyScore = 0.5
  if (createdAt) {
    const monthsAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo < 6) recencyScore = 1.0
    else if (monthsAgo < 12) recencyScore = 0.8
    else if (monthsAgo < 24) recencyScore = 0.6
  }

  // Technical subreddits validate feasibility
  const techSubs = ['selfhosted', 'programming', 'webdev', 'devops', 'homelab']
  const subScore = techSubs.includes(subreddit.toLowerCase()) ? 0.9 : 0.7

  const feasibility = recencyScore * 0.6 + subScore * 0.4

  return {
    demand: Math.min(Math.max(demand, 0), 1),
    gap: Math.min(Math.max(gap, 0), 1),
    feasibility: Math.min(Math.max(feasibility, 0), 1),
  }
}

function composite(demand: number, gap: number, feasibility: number): number {
  return demand * 0.45 + gap * 0.35 + feasibility * 0.2
}

// ---------------------------------------------------------------------------
// AI summary (only called for high-scoring signals)
// ---------------------------------------------------------------------------

async function generateSummary(
  title: string,
  context: string,
  apiKey: string
): Promise<{ summary: string; suggested_name: string; target_user: string; monetization: string } | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a SaaS opportunity analyst. Given a GitHub repo or community post, identify the product opportunity. Respond with JSON only.',
          },
          {
            role: 'user',
            content: `Analyze this demand signal and return JSON with keys: summary (1 paragraph opportunity analysis), suggested_name (short product name), target_user (who pays), monetization (how to charge).\n\nSignal: ${title}\n\nContext: ${context}`,
          },
        ],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    return JSON.parse(content)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async () => {
  const start = Date.now()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  // Fetch a batch of pending queue items
  const { data: queueItems, error: queueError } = await supabase
    .from('scoring_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('enqueued_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (queueError) {
    return new Response(JSON.stringify({ error: queueError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!queueItems?.length) {
    return new Response(JSON.stringify({ message: 'Queue empty' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results = { processed: 0, skipped: 0, errors: 0 }

  for (const item of queueItems) {
    // Deadline guard
    if (Date.now() - start > DEADLINE_MS) break

    // Mark as processing
    await supabase
      .from('scoring_queue')
      .update({ status: 'processing', attempts: item.attempts + 1 })
      .eq('id', item.id)

    try {
      let demand = 0, gap = 0, feasibility = 0
      let title = ''
      let aiContext = ''
      let signalType: 'github_repo' | 'reddit_post' | 'twitter_post' = 'github_repo'
      let refField: { ref_github_repo?: string; ref_social_post?: string } = {}

      if (item.entity_type === 'github_repo') {
        const { data: repo } = await supabase
          .from('github_repos')
          .select('*')
          .eq('id', item.entity_id)
          .single()

        if (!repo) throw new Error('Repo not found')

        const scores = scoreGithubRepo(repo as Record<string, unknown>)
        demand = scores.demand
        gap = scores.gap
        feasibility = scores.feasibility
        title = repo.full_name
        signalType = 'github_repo'
        refField = { ref_github_repo: repo.id }
        aiContext = [
          repo.description,
          `Stars: ${repo.stars}`,
          `Language: ${repo.language}`,
          `Topics: ${repo.topics?.join(', ')}`,
          `Has website: ${repo.has_website}`,
        ]
          .filter(Boolean)
          .join('. ')
      } else if (item.entity_type === 'social_post') {
        const { data: post } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', item.entity_id)
          .single()

        if (!post) throw new Error('Post not found')

        const scores = scoreSocialPost(post as Record<string, unknown>)
        demand = scores.demand
        gap = scores.gap
        feasibility = scores.feasibility
        title = post.title ?? post.body?.slice(0, 100) ?? 'Untitled post'
        signalType = post.source === 'twitter' ? 'twitter_post' : 'reddit_post'
        refField = { ref_social_post: post.id }
        aiContext = [
          post.title,
          post.body?.slice(0, 500),
          `Upvotes: ${post.upvotes}`,
          post.subreddit ? `Subreddit: r/${post.subreddit}` : null,
        ]
          .filter(Boolean)
          .join('. ')
      }

      const total = composite(demand, gap, feasibility)

      // Check if signal already exists for this entity
      const refKey = item.entity_type === 'github_repo' ? 'ref_github_repo' : 'ref_social_post'
      const { data: existingRows } = await supabase
        .from('signals')
        .select('id')
        .eq(refKey, item.entity_id)
        .limit(1)
      const existing = existingRows?.[0] ?? null

      let summary = null, suggested_name = null, target_user = null, monetization = null

      // Generate AI summary for high-scoring signals
      if (total >= AI_SCORE_THRESHOLD && openaiKey) {
        const ai = await generateSummary(title, aiContext, openaiKey)
        if (ai) {
          summary = ai.summary
          suggested_name = ai.suggested_name
          target_user = ai.target_user
          monetization = ai.monetization
        }
      }

      const signalData = {
        signal_type: signalType,
        ...refField,
        title,
        summary,
        suggested_name,
        target_user,
        monetization,
        demand_score: parseFloat(demand.toFixed(3)),
        gap_score: parseFloat(gap.toFixed(3)),
        feasibility_score: parseFloat(feasibility.toFixed(3)),
        total_score: parseFloat(total.toFixed(3)),
        score_version: SCORE_VERSION,
        scored_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase.from('signals').update(signalData).eq('id', existing.id)
      } else {
        await supabase.from('signals').insert(signalData)
      }

      // Mark queue item done
      await supabase
        .from('scoring_queue')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', item.id)

      results.processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      await supabase
        .from('scoring_queue')
        .update({
          status: item.attempts >= 3 ? 'failed' : 'pending',
        })
        .eq('id', item.id)

      results.errors++
    }
  }

  return new Response(JSON.stringify({ ...results, durationMs: Date.now() - start }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
