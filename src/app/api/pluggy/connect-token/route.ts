import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPluggyClient } from '@/lib/pluggy/client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  }

  // opcionalmente recebe itemId para modo "update" (re-conectar item existente)
  const body = await req.json().catch(() => ({}))
  const itemId = typeof body?.itemId === 'string' ? body.itemId : undefined

  const pluggy = getPluggyClient()

  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/pluggy/webhook`
    : undefined

  const tokenResp = await pluggy.createConnectToken(itemId, {
    clientUserId: user.id,
    webhookUrl,
  } as any)

  return NextResponse.json({ accessToken: tokenResp.accessToken })
}
