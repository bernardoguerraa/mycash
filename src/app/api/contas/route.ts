import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/contas — lista as contas bancarias do usuario logado
export async function GET() {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .order('id_conta', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/contas — cria conta bancaria (id_usuario derivado da sessao)
// Body: { instituicao, numero_conta, tipo_conta, saldo_atual? }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
