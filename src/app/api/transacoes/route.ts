import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'
import { ajustarSaldo, efeitoNoSaldo } from '@/lib/api/saldo'

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

// GET /api/transacoes — lista as transacoes do usuario logado (RLS filtra)
// Query: id_conta, tipo, de (YYYY-MM-DD), ate (YYYY-MM-DD), limit
export async function GET(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const { searchParams } = new URL(req.url)
  const idConta = searchParams.get('id_conta')
  const tipo = searchParams.get('tipo')
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  let query = supabase
    .from('transacoes')
    .select('*')
    .order('data_transacao', { ascending: false })
    .limit(limit)

  if (idConta) query = query.eq('id_conta', Number(idConta))
  if (tipo === 'Entrada' || tipo === 'Saida') query = query.eq('tipo', tipo)

  // Recorte por periodo. O app pedia a lista inteira e filtrava o mes no
  // celular; com isso o corte acontece no Postgres, que e onde tem indice.
  // `ate` inclui o dia todo — senao "ate 31/08" perderia tudo depois de 00h.
  if (de) query = query.gte('data_transacao', de)
  if (ate) query = query.lte('data_transacao', `${ate}T23:59:59.999`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: SEM_CACHE })
  return NextResponse.json({ data }, { headers: SEM_CACHE })
}

// POST /api/transacoes — cria uma nova transacao
// Body: { id_conta, data_transacao, tipo, categoria, descricao, valor }
// id_conta precisa pertencer ao usuario (RLS WITH CHECK valida)
export async function POST(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400, headers: SEM_CACHE })

  const { id_conta, data_transacao, tipo, categoria, descricao, valor } = body
  if (!id_conta || !tipo || !categoria || !descricao || valor === undefined) {
    return NextResponse.json(
      { error: 'campos obrigatorios: id_conta, tipo, categoria, descricao, valor' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('transacoes')
    .insert({
      id_conta: Number(id_conta),
      data_transacao: data_transacao ?? new Date().toISOString(),
      tipo,
      categoria,
      descricao,
      valor: Number(valor),
      origem: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: SEM_CACHE })

  // O saldo da conta acompanha o lancamento.
  await ajustarSaldo(
    supabase,
    Number(id_conta),
    efeitoNoSaldo({ idConta: Number(id_conta), tipo, valor: Number(valor) })
  )

  return NextResponse.json({ data }, { status: 201, headers: SEM_CACHE })
}
