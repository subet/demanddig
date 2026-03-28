import { type NextRequest, NextResponse } from 'next/server'

export function verifyInternalToken(req: NextRequest): NextResponse | null {
  const token = req.headers.get('x-internal-token')
  if (!token || token !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
