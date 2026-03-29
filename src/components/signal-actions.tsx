'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

type ActionState = 'none' | 'saved' | 'archived'

export function SignalActions({
  signalId,
  initialState = 'none',
}: {
  signalId: string
  initialState?: ActionState
}) {
  const [state, setState] = useState<ActionState>(initialState)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAction(action: 'save' | 'archive') {
    if (loading) return
    setLoading(true)

    const isSameAction =
      (action === 'save' && state === 'saved') ||
      (action === 'archive' && state === 'archived')

    if (isSameAction) {
      // Undo — remove from saved/archived
      await fetch(`/api/signals/${signalId}/action`, { method: 'DELETE' })
      setState('none')
    } else {
      await fetch(`/api/signals/${signalId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      setState(action === 'save' ? 'saved' : 'archived')
      // Remove from signals list after a short delay so user sees the feedback
      setTimeout(() => router.refresh(), 600)
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Save */}
      <button
        onClick={(e) => { e.preventDefault(); handleAction('save') }}
        disabled={loading}
        title={state === 'saved' ? 'Unsave' : 'Save'}
        className={clsx(
          'p-1.5 rounded-md transition-colors',
          state === 'saved'
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
            : 'text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={state === 'saved' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>

      {/* Archive */}
      <button
        onClick={(e) => { e.preventDefault(); handleAction('archive') }}
        disabled={loading}
        title={state === 'archived' ? 'Unarchive' : 'Archive'}
        className={clsx(
          'p-1.5 rounded-md transition-colors',
          state === 'archived'
            ? 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800'
            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 11v6m6-6v6M4 11l1 9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l1-9" />
        </svg>
      </button>
    </div>
  )
}
