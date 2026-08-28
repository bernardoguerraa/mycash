import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resposta nunca cacheada.
 *
 * `force-dynamic` so impede o Next de pre-renderizar; a resposta ainda podia
 * ficar guardada na borda da Vercel e no OkHttp do Android. Deu para ver no
 * app: o painel voltava com as transacoes novas e, na mesma resposta, o saldo
 * e as metas de dez minutos antes. Sao dados por usuario e sempre variaveis,
 * entao nenhum deles pode ser reaproveitado.
 */
const SEM_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const { data, error } = await supabase
    .from('lembretes')
    .select('*')
    .eq('id_lembrete', Number(params.id))
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: SEM_CACHE })
  if (!data) return NextResponse.json({ error: 'nao encontrado' }, { status: 404, headers: SEM_CACHE })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400, headers: SEM_CACHE })

  const { data, error } = await supabase
    .from('lembretes')
    .update(body)
    .eq('id_lembrete', Number(params.id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: SEM_CACHE })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const { error } = await supabase
    .from('lembretes')
    .delete()
    .eq('id_lembrete', Number(params.id))

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: SEM_CACHE })
  return new NextResponse(null, { status: 204, headers: SEM_CACHE })
}
