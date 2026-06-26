import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/metas — lista metas do usuario logado
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('metas_financeiras')
    .select('*')
    .order('data_limite', { ascending: true })

  if (status === 'EmAndamento' || status === 'Concluida' || status === 'Cancelada') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/metas — cria nova meta (id_usuario derivado da sessao)
// Body: { titulo, valor_objetivo, valor_atual?, data_inicio?, data_limite, status? }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

  const { titulo, valor_objetivo, valor_atual, data_inicio, data_limite, status } = body
  if (!titulo || valor_objetivo === undefined || !data_limite) {
    return NextResponse.json(
      { error: 'campos obrigatorios: titulo, valor_objetivo, data_limite' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('metas_financeiras')
    .insert({
      id_usuario: idUsuario,
      titulo,
      valor_objetivo: Number(valor_objetivo),
      valor_atual: valor_atual !== undefined ? Number(valor_atual) : 0,
      data_inicio: data_inicio ?? new Date().toISOString().slice(0, 10),
      data_limite,
      status: status ?? 'EmAndamento',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
