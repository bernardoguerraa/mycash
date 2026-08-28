import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { ajustarSaldo, efeitoNoSaldo, trocarEfeito } from '@/lib/api/saldo'

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

// GET /api/transacoes/[id] — busca uma transacao por id (RLS filtra para o dono)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('id_transacao', Number(params.id))
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'nao encontrada' }, { status: 404 })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

// PATCH /api/transacoes/[id] — atualiza campos da transacao
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

  // Guarda o estado anterior para desfazer o efeito antigo no saldo.
  const { data: antes } = await supabase
    .from('transacoes')
    .select('id_conta, tipo, valor')
    .eq('id_transacao', Number(params.id))
    .maybeSingle()

  const { data, error } = await supabase
    .from('transacoes')
    .update(body)
    .eq('id_transacao', Number(params.id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (antes) {
    await trocarEfeito(supabase, antes, {
      id_conta: data.id_conta,
      tipo: data.tipo,
      valor: data.valor,
    })
  }

  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

// DELETE /api/transacoes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClientFromRequest(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  // Le antes de apagar: depois do delete nao ha como saber quanto devolver.
  const { data: antes } = await supabase
    .from('transacoes')
    .select('id_conta, tipo, valor')
    .eq('id_transacao', Number(params.id))
    .maybeSingle()

  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id_transacao', Number(params.id))

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (antes) {
    await ajustarSaldo(supabase, antes.id_conta, -efeitoNoSaldo(antes.tipo, antes.valor))
  }

  return new NextResponse(null, { status: 204 })
}
