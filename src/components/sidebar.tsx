'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clsx } from 'clsx'
import type { SupabaseClient } from '@supabase/supabase-js'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/signals', label: 'Signals', icon: '⚡' },
  { href: '/saved', label: 'Saved', icon: '★' },
  { href: '/archive', label: 'Archive', icon: '▣' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const clientRef = useRef<SupabaseClient | null>(null)
  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createClient()
    return clientRef.current
  }, [])

  async function signOut() {
    await getClient().auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-4">
      <div className="mb-6 px-2">
        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          DemandDig
        </span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span className="text-base leading-none">→</span>
        Sign out
      </button>
    </aside>
  )
}
