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

// GET /api/lembretes — lista lembretes do usuario logado
export async function GET(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ativo = searchParams.get('ativo')
  const tipo = searchParams.get('tipo')

  let query = supabase
    .from('lembretes')
    .select('*')
    .order('data_vencimento', { ascending: true })

  if (ativo === 'true') query = query.eq('ativo', true)
  if (ativo === 'false') query = query.eq('ativo', false)
  if (tipo === 'ContaPagar' || tipo === 'ContaReceber') query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

// POST /api/lembretes — cria novo lembrete
// Body: { descricao, data_vencimento, valor_previsto, tipo, ativo? }
export async function POST(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

  const { descricao, data_vencimento, valor_previsto, tipo, ativo } = body
  if (!descricao || !data_vencimento || valor_previsto === undefined || !tipo) {
    return NextResponse.json(
      { error: 'campos obrigatorios: descricao, data_vencimento, valor_previsto, tipo' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('lembretes')
    .insert({
      id_usuario: idUsuario,
      descricao,
      data_vencimento,
      valor_previsto: Number(valor_previsto),
      tipo,
      ativo: ativo ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201, headers: SEM_CACHE })
}
