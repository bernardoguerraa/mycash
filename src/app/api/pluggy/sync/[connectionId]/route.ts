import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncPluggyItem } from '@/lib/pluggy/sync'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  }

  // Resolve conexão + valida que pertence ao usuário
  const { data: conn, error } = await supabase
    .from('pluggy_connections')
    .select('pluggy_item_id, id_usuario')
    .eq('id', Number(params.connectionId))
    .maybeSingle()

  if (error || !conn) {
    return NextResponse.json({ error: 'conexão não encontrada' }, { status: 404 })
  }

  // Service client para ingest (bypass RLS)
  const db = createServiceClient()

  try {
    const result = await syncPluggyItem(db, conn.pluggy_item_id, conn.id_usuario)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    console.error('sync error', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
