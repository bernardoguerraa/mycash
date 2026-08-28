import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

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

// GET /api/contas — lista as contas bancarias do usuario logado
export async function GET(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .order('id_conta', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: SEM_CACHE })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

// POST /api/contas — cria conta bancaria (id_usuario derivado da sessao)
// Body: { instituicao, numero_conta, tipo_conta, saldo_atual? }
export async function POST(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400, headers: SEM_CACHE })

  const { instituicao, numero_conta, tipo_conta, saldo_atual } = body
  if (!instituicao || !numero_conta || !tipo_conta) {
    return NextResponse.json(
      { error: 'campos obrigatorios: instituicao, numero_conta, tipo_conta' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert({
      id_usuario: idUsuario,
      instituicao,
      numero_conta,
      tipo_conta,
      saldo_atual: saldo_atual ?? 0,
      origem: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: SEM_CACHE })
  return NextResponse.json({ data }, { status: 201, headers: SEM_CACHE })
}
