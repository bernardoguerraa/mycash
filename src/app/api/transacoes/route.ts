import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/transacoes — lista as transacoes do usuario logado (RLS filtra)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const idConta = searchParams.get('id_conta')
  const tipo = searchParams.get('tipo')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  let query = supabase
    .from('transacoes')
    .select('*')
    .order('data_transacao', { ascending: false })
    .limit(limit)

  if (idConta) query = query.eq('id_conta', Number(idConta))
  if (tipo === 'Entrada' || tipo === 'Saida') query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/transacoes — cria uma nova transacao
// Body: { id_conta, data_transacao, tipo, categoria, descricao, valor }
// id_conta precisa pertencer ao usuario (RLS WITH CHECK valida)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
