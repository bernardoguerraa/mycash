import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'
import type { Database } from '@/types/database'

type UsuarioRow = Database['public']['Tables']['usuarios']['Row']

/**
 * Campos do usuario que a rota pode devolver.
 *
 * E uma lista de permissao, nao de exclusao: `senha_hash` fica de fora, e
 * qualquer coluna nova que apareca na tabela tambem fica — quem quiser
 * expor precisa vir aqui de proposito.
 */
function usuarioPublico(linha: UsuarioRow) {
  return {
    id_usuario: linha.id_usuario,
    auth_user_id: linha.auth_user_id,
    nome_completo: linha.nome_completo,
    email: linha.email,
    data_cadastro: linha.data_cadastro,
    plano: linha.plano,
    status_conta: linha.status_conta,
  }
}

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
  if (!user) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const [perfil, contas, transacoes, metas] = await Promise.all([
    supabase.from('usuarios').select('*').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('contas_bancarias').select('*', { count: 'exact', head: true }),
    supabase.from('transacoes').select('*', { count: 'exact', head: true }),
    supabase.from('metas_financeiras').select('*', { count: 'exact', head: true }),
  ])

  if (perfil.error) {
    return NextResponse.json({ error: perfil.error.message }, { status: 500, headers: SEM_CACHE })
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

  const usuario = linha ? usuarioPublico(linha) : null

  return NextResponse.json(
    {
      data: {
        usuario,
        email: user.email ?? '',
        stats: {
          totalContas: contas.count ?? 0,
          totalTransacoes: transacoes.count ?? 0,
          totalMetas: metas.count ?? 0,
        },
      },
    },
    { headers: SEM_CACHE }
  )
}

/**
 * PATCH /api/perfil — atualiza o nome do usuario logado.
 * Body: { nome_completo }
 */
export async function PATCH(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'body invalido' }, { status: 400, headers: SEM_CACHE })

  const nome = typeof body.nome_completo === 'string' ? body.nome_completo.trim() : ''
  if (!nome) {
    return NextResponse.json({ error: 'campo obrigatorio: nome_completo' }, { status: 400, headers: SEM_CACHE })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update({ nome_completo: nome })
    .eq('id_usuario', idUsuario)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: SEM_CACHE })

  return NextResponse.json({ data: usuarioPublico(data) }, { headers: SEM_CACHE })
}
