import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['save', 'archive']),
})

// Untyped client to avoid Database generic conflicts with postgrest v12
async function getClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const status = parsed.data.action === 'save' ? 'inbox' : 'archived'

  // Check if record exists
  const { data: existing } = await supabase
    .from('user_saved_signals')
    .select('id')
    .eq('user_id', user.id)
    .eq('signal_id', id)
    .limit(1)

  let error: { message: string } | null = null

  if (existing && existing.length > 0) {
    const res = await supabase
      .from('user_saved_signals')
      .update({ status })
      .eq('user_id', user.id)
      .eq('signal_id', id)
    error = res.error
  } else {
    const res = await supabase
      .from('user_saved_signals')
      .insert({ user_id: user.id, signal_id: id, status })
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('user_saved_signals')
    .delete()
    .eq('user_id', user.id)
    .eq('signal_id', id)

  return NextResponse.json({ ok: true })
}
