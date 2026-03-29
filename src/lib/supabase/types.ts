export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          plan: 'free' | 'pro'
          credits_used: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          plan?: 'free' | 'pro'
          credits_used?: number
          created_at?: string
        }
        Update: {
          email?: string
          plan?: 'free' | 'pro'
          credits_used?: number
        }
      }
      github_repos: {
        Row: {
          id: string
          github_id: number
          full_name: string
          description: string | null
          homepage: string | null
          language: string | null
          topics: string[]
          stars: number
          forks: number
          open_issues: number
          contributor_count: number | null
          last_commit_at: string | null
          created_at_github: string | null
          license: string | null
          is_archived: boolean
          has_website: boolean
          raw_data: Json | null
          fetched_at: string
        }
        Insert: {
          id?: string
          github_id: number
          full_name: string
          description?: string | null
          homepage?: string | null
          language?: string | null
          topics?: string[]
          stars?: number
          forks?: number
          open_issues?: number
          contributor_count?: number | null
          last_commit_at?: string | null
          created_at_github?: string | null
          license?: string | null
          is_archived?: boolean
          has_website?: boolean
          raw_data?: Json | null
          fetched_at?: string
        }
        Update: {
          description?: string | null
          homepage?: string | null
          language?: string | null
          topics?: string[]
          stars?: number
          forks?: number
          open_issues?: number
          contributor_count?: number | null
          last_commit_at?: string | null
          license?: string | null
          is_archived?: boolean
          has_website?: boolean
          raw_data?: Json | null
          fetched_at?: string
        }
      }
      social_posts: {
        Row: {
          id: string
          source: 'reddit' | 'twitter'
          external_id: string
          url: string | null
          title: string | null
          body: string | null
          author: string | null
          subreddit: string | null
          upvotes: number
          comment_count: number
          created_at_src: string | null
          fetched_at: string
          raw_data: Json | null
        }
        Insert: {
          id?: string
          source: 'reddit' | 'twitter'
          external_id: string
          url?: string | null
          title?: string | null
          body?: string | null
          author?: string | null
          subreddit?: string | null
          upvotes?: number
          comment_count?: number
          created_at_src?: string | null
          fetched_at?: string
          raw_data?: Json | null
        }
        Update: {
          url?: string | null
          title?: string | null
          body?: string | null
          upvotes?: number
          comment_count?: number
          fetched_at?: string
          raw_data?: Json | null
        }
      }
      signals: {
        Row: {
          id: string
          signal_type: 'github_repo' | 'reddit_post' | 'twitter_post'
          ref_github_repo: string | null
          ref_social_post: string | null
          title: string
          summary: string | null
          suggested_name: string | null
          target_user: string | null
          monetization: string | null
          demand_score: number | null
          gap_score: number | null
          feasibility_score: number | null
          total_score: number | null
          score_version: number
          scored_at: string | null
          fetched_at: string
          audience: 'technical' | 'non-technical' | 'mixed' | null
        }
        Insert: {
          id?: string
          signal_type: 'github_repo' | 'reddit_post' | 'twitter_post'
          ref_github_repo?: string | null
          ref_social_post?: string | null
          title: string
          summary?: string | null
          suggested_name?: string | null
          target_user?: string | null
          monetization?: string | null
          demand_score?: number | null
          gap_score?: number | null
          feasibility_score?: number | null
          total_score?: number | null
          score_version?: number
          scored_at?: string | null
          fetched_at?: string
          audience?: 'technical' | 'non-technical' | 'mixed' | null
        }
        Update: {
          title?: string
          summary?: string | null
          suggested_name?: string | null
          target_user?: string | null
          monetization?: string | null
          demand_score?: number | null
          gap_score?: number | null
          feasibility_score?: number | null
          total_score?: number | null
          score_version?: number
          scored_at?: string | null
          audience?: 'technical' | 'non-technical' | 'mixed' | null
        }
      }
      user_saved_signals: {
        Row: {
          id: string
          user_id: string
          signal_id: string
          notes: string | null
          tags: string[]
          status: 'inbox' | 'researching' | 'building' | 'pass' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          signal_id: string
          notes?: string | null
          tags?: string[]
          status?: 'inbox' | 'researching' | 'building' | 'pass' | 'archived'
          created_at?: string
        }
        Update: {
          notes?: string | null
          tags?: string[]
          status?: 'inbox' | 'researching' | 'building' | 'pass' | 'archived'
        }
      }
      crawl_jobs: {
        Row: {
          id: string
          job_type: 'github_search' | 'reddit_sub' | 'twitter_query'
          target: string
          last_run_at: string | null
          last_cursor: string | null
          run_count: number
          status: 'idle' | 'running' | 'error'
          error_msg: string | null
        }
        Insert: {
          id?: string
          job_type: 'github_search' | 'reddit_sub' | 'twitter_query'
          target: string
          last_run_at?: string | null
          last_cursor?: string | null
          run_count?: number
          status?: 'idle' | 'running' | 'error'
          error_msg?: string | null
        }
        Update: {
          last_run_at?: string | null
          last_cursor?: string | null
          run_count?: number
          status?: 'idle' | 'running' | 'error'
          error_msg?: string | null
        }
      }
      scoring_queue: {
        Row: {
          id: string
          entity_type: 'github_repo' | 'social_post'
          entity_id: string
          priority: number
          enqueued_at: string
          processed_at: string | null
          status: 'pending' | 'processing' | 'done' | 'failed'
          attempts: number
        }
        Insert: {
          id?: string
          entity_type: 'github_repo' | 'social_post'
          entity_id: string
          priority?: number
          enqueued_at?: string
          processed_at?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          attempts?: number
        }
        Update: {
          processed_at?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          attempts?: number
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Signal = Tables<'signals'>
export type GithubRepo = Tables<'github_repos'>
export type SocialPost = Tables<'social_posts'>
export type UserSavedSignal = Tables<'user_saved_signals'>
export type CrawlJob = Tables<'crawl_jobs'>
