-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- user_profiles
-- ============================================================
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  credits_used int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- github_repos
-- ============================================================
create table public.github_repos (
  id                  uuid primary key default uuid_generate_v4(),
  github_id           bigint unique not null,
  full_name           text unique not null,
  description         text,
  homepage            text,
  language            text,
  topics              text[] not null default '{}',
  stars               int not null default 0,
  forks               int not null default 0,
  open_issues         int not null default 0,
  contributor_count   int,
  last_commit_at      timestamptz,
  created_at_github   timestamptz,
  license             text,
  is_archived         bool not null default false,
  has_website         bool not null default false,
  raw_data            jsonb,
  fetched_at          timestamptz not null default now()
);

alter table public.github_repos enable row level security;

create policy "Authenticated users can read repos"
  on public.github_repos for select
  to authenticated using (true);

create index github_repos_stars_idx on public.github_repos (stars desc);
create index github_repos_last_commit_idx on public.github_repos (last_commit_at desc);
create index github_repos_language_idx on public.github_repos (language);
create index github_repos_topics_idx on public.github_repos using gin (topics);
create index github_repos_fetched_at_idx on public.github_repos (fetched_at desc);

-- ============================================================
-- social_posts
-- ============================================================
create table public.social_posts (
  id              uuid primary key default uuid_generate_v4(),
  source          text not null check (source in ('reddit', 'twitter')),
  external_id     text not null,
  url             text,
  title           text,
  body            text,
  author          text,
  subreddit       text,
  upvotes         int not null default 0,
  comment_count   int not null default 0,
  created_at_src  timestamptz,
  fetched_at      timestamptz not null default now(),
  raw_data        jsonb,
  unique (source, external_id)
);

alter table public.social_posts enable row level security;

create policy "Authenticated users can read posts"
  on public.social_posts for select
  to authenticated using (true);

create index social_posts_source_sub_idx on public.social_posts (source, subreddit);
create index social_posts_created_at_idx on public.social_posts (created_at_src desc);
create index social_posts_fetched_at_idx on public.social_posts (fetched_at desc);

-- ============================================================
-- signals
-- ============================================================
create table public.signals (
  id                  uuid primary key default uuid_generate_v4(),
  signal_type         text not null check (signal_type in ('github_repo', 'reddit_post', 'twitter_post')),
  ref_github_repo     uuid references public.github_repos(id) on delete cascade,
  ref_social_post     uuid references public.social_posts(id) on delete cascade,

  title               text not null,
  summary             text,
  suggested_name      text,
  target_user         text,
  monetization        text,

  demand_score        numeric(4,3) check (demand_score >= 0 and demand_score <= 1),
  gap_score           numeric(4,3) check (gap_score >= 0 and gap_score <= 1),
  feasibility_score   numeric(4,3) check (feasibility_score >= 0 and feasibility_score <= 1),
  total_score         numeric(4,3) check (total_score >= 0 and total_score <= 1),

  score_version       int not null default 1,
  scored_at           timestamptz,
  fetched_at          timestamptz not null default now(),

  embedding           vector(1536),

  constraint signals_single_ref check (
    (ref_github_repo is not null)::int + (ref_social_post is not null)::int = 1
  )
);

alter table public.signals enable row level security;

create policy "Authenticated users can read signals"
  on public.signals for select
  to authenticated using (true);

create index signals_total_score_idx on public.signals (total_score desc);
create index signals_signal_type_idx on public.signals (signal_type);
create index signals_scored_at_idx on public.signals (scored_at desc);
create index signals_fetched_at_idx on public.signals (fetched_at desc);

-- ============================================================
-- user_saved_signals
-- ============================================================
create table public.user_saved_signals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  signal_id   uuid not null references public.signals(id) on delete cascade,
  notes       text,
  tags        text[] not null default '{}',
  status      text not null default 'inbox' check (status in ('inbox', 'researching', 'building', 'pass')),
  created_at  timestamptz not null default now(),
  unique (user_id, signal_id)
);

alter table public.user_saved_signals enable row level security;

create policy "Users can manage own saved signals"
  on public.user_saved_signals for all
  using (auth.uid() = user_id);

create index user_saved_signals_user_status_idx on public.user_saved_signals (user_id, status);
create index user_saved_signals_tags_idx on public.user_saved_signals using gin (tags);

-- ============================================================
-- crawl_jobs
-- ============================================================
create table public.crawl_jobs (
  id            uuid primary key default uuid_generate_v4(),
  job_type      text not null check (job_type in ('github_search', 'reddit_sub', 'twitter_query')),
  target        text not null,
  last_run_at   timestamptz,
  last_cursor   text,
  run_count     int not null default 0,
  status        text not null default 'idle' check (status in ('idle', 'running', 'error')),
  error_msg     text,
  unique (job_type, target)
);

alter table public.crawl_jobs enable row level security;

create policy "Service role only"
  on public.crawl_jobs for all
  to service_role using (true);

-- Seed crawl jobs
insert into public.crawl_jobs (job_type, target) values
  -- GitHub searches
  ('github_search', 'language:python topic:automation stars:100..5000 pushed:>2024-01-01'),
  ('github_search', 'language:typescript topic:self-hosted stars:50..3000 pushed:>2024-01-01'),
  ('github_search', 'language:python topic:self-hosted stars:50..3000 pushed:>2024-01-01'),
  ('github_search', 'language:go topic:cli stars:100..5000 pushed:>2024-01-01'),
  ('github_search', 'language:rust topic:tool stars:50..3000 pushed:>2024-01-01'),
  ('github_search', 'topic:cli stars:200..10000 has:topics pushed:>2024-01-01'),
  ('github_search', 'topic:automation stars:100..5000 has:topics pushed:>2024-01-01'),
  ('github_search', 'topic:api-client stars:100..3000 has:topics pushed:>2024-01-01'),
  -- Reddit subreddits / queries
  ('reddit_sub', 'entrepreneur|I wish there was'),
  ('reddit_sub', 'entrepreneur|why isn''t there'),
  ('reddit_sub', 'startups|I wish there was'),
  ('reddit_sub', 'startups|looking for a tool'),
  ('reddit_sub', 'SaaS|I wish there was'),
  ('reddit_sub', 'SaaS|why isn''t there'),
  ('reddit_sub', 'selfhosted|I wish there was'),
  ('reddit_sub', 'selfhosted|looking for a tool'),
  ('reddit_sub', 'webdev|there should be'),
  ('reddit_sub', 'programming|there should be'),
  ('reddit_sub', 'sideproject|I wish there was'),
  ('reddit_sub', 'Indiehackers|I wish there was');

-- ============================================================
-- scoring_queue
-- ============================================================
create table public.scoring_queue (
  id            uuid primary key default uuid_generate_v4(),
  entity_type   text not null check (entity_type in ('github_repo', 'social_post')),
  entity_id     uuid not null,
  priority      int not null default 5,
  enqueued_at   timestamptz not null default now(),
  processed_at  timestamptz,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts      int not null default 0
);

alter table public.scoring_queue enable row level security;

create policy "Service role only"
  on public.scoring_queue for all
  to service_role using (true);

create index scoring_queue_pending_idx on public.scoring_queue (status, priority desc, enqueued_at asc)
  where status = 'pending';

-- Auto-enqueue on github_repo insert
create or replace function public.enqueue_repo_for_scoring()
returns trigger language plpgsql security definer as $$
begin
  insert into public.scoring_queue (entity_type, entity_id, priority)
  values ('github_repo', new.id, 5)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_github_repo_inserted
  after insert on public.github_repos
  for each row execute function public.enqueue_repo_for_scoring();

-- Auto-enqueue on social_post insert
create or replace function public.enqueue_post_for_scoring()
returns trigger language plpgsql security definer as $$
begin
  insert into public.scoring_queue (entity_type, entity_id, priority)
  values ('social_post', new.id, 7)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_social_post_inserted
  after insert on public.social_posts
  for each row execute function public.enqueue_post_for_scoring();
