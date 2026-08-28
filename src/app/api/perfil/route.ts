import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/perfil — dados do usuario logado mais os contadores das telas.
 *
 * O web monta isso no server component de /perfil lendo a tabela `usuarios`
 * direto. O app nativo nao tem esse caminho: sem esta rota ele precisaria
 * abrir o Supabase so para o perfil, quebrando a regra de que todo dado de
 * dominio passa pela API. As contagens vem juntas porque a tela mostra as
 * tres e uma ida so evita tres round-trips no celular.
 */
export async function GET(req: NextRequest) {
  const supabase = createClientFromRequest(req)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const [perfil, contas, transacoes, metas] = await Promise.all([
    supabase.from('usuarios').select('*').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('contas_bancarias').select('*', { count: 'exact', head: true }),
    supabase.from('transacoes').select('*', { count: 'exact', head: true }),
    supabase.from('metas_financeiras').select('*', { count: 'exact', head: true }),
  ])

  if (perfil.error) {
    return NextResponse.json({ error: perfil.error.message }, { status: 500 })
  }

  // Cadastros anteriores a migration 20260619 podem estar sem auth_user_id.
  // O server component de /perfil no web casa por e-mail, entao a rota faz o
  // mesmo antes de desistir — senao a tela abriria vazia para esses usuarios.
  let linha = perfil.data
  if (!linha && user.email) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()
    linha = data
  }

  // senha_hash nunca sai da rota, mesmo sendo hash.
  const usuario = linha ? (({ senha_hash: _ignorado, ...resto }) => resto)(linha) : null

  return NextResponse.json({
    data: {
      usuario,
      email: user.email ?? '',
      stats: {
        totalContas: contas.count ?? 0,
        totalTransacoes: transacoes.count ?? 0,
        totalMetas: metas.count ?? 0,
      },
    },
  })
}

/**
 * PATCH /api/perfil — atualiza o nome do usuario logado.
 * Body: { nome_completo }
 */
export async function PATCH(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400 })

  const nome = typeof body.nome_completo === 'string' ? body.nome_completo.trim() : ''
  if (!nome) {
    return NextResponse.json({ error: 'campo obrigatorio: nome_completo' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update({ nome_completo: nome })
    .eq('id_usuario', idUsuario)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { senha_hash: _ignorado, ...usuario } = data
  return NextResponse.json({ data: usuario })
}
