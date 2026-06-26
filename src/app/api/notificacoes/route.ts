import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/notificacoes — lista notificacoes do usuario logado
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lida = searchParams.get('lida')

  let query = supabase
    .from('notificacoes')
    .select('*')
    .order('data_notificacao', { ascending: false })

  if (lida === 'true') query = query.eq('lida', true)
  if (lida === 'false') query = query.eq('lida', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/notificacoes — cria notificacao manual (uso debug/admin)
// Body: { mensagem, tipo, lida? }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

  const { mensagem, tipo, lida } = body
  if (!mensagem || !tipo) {
    return NextResponse.json(
      { error: 'campos obrigatorios: mensagem, tipo' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('notificacoes')
    .insert({
      id_usuario: idUsuario,
      mensagem,
      tipo,
      lida: lida ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
