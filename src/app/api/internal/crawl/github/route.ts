import { type NextRequest, NextResponse } from 'next/server'
import { verifyInternalToken } from '@/lib/internal-auth'

export async function POST(req: NextRequest) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SECRET_KEY!

  const res = await fetch(`${supabaseUrl}/functions/v1/crawl-github`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await res.json()
  return NextResponse.json(body, { status: res.status })
}
