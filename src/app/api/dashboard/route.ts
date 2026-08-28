import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard — resumo consolidado do usuario logado.
 *
 * Mesmos numeros que o server component de /dashboard monta no web, so que
 * como endpoint. Existe por dois motivos:
 *
 * 1. O app fazia quatro requisicoes e recortava o mes corrente em JavaScript
 *    no celular. Agora o recorte acontece no Postgres e volta uma resposta
 *    so — no 4G isso e a diferenca entre o painel abrir e o painel demorar.
 * 2. A regra de "o que e o resumo" passa a viver no servidor. Se amanha
 *    entrar um cliente novo (web, outro app), ele ganha o mesmo numero sem
 *    reimplementar a conta.
 *
 * A RLS continua filtrando por usuario; nenhuma query aqui usa id_usuario
 * no where, igual ao resto das rotas.
 */
export async function GET(req: NextRequest) {
  const supabase = createClientFromRequest(req)
  const idUsuario = await getCurrentIdUsuario(supabase)
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401 })

  const agora = new Date()
  const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const ultimoDia = new Date(
    agora.getFullYear(),
    agora.getMonth() + 1,
    0,
    23,
    59,
    59
  ).toISOString()
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()

  const [contas, doMes, metasAtivas, recentes, lembretes] = await Promise.all([
    supabase.from('contas_bancarias').select('saldo_atual'),
    supabase
      .from('transacoes')
      .select('valor, tipo')
      .gte('data_transacao', primeiroDia)
      .lte('data_transacao', ultimoDia),
    supabase
      .from('metas_financeiras')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'EmAndamento'),
    supabase
      .from('transacoes')
      .select('id_transacao, id_conta, descricao, valor, tipo, data_transacao, categoria')
      .order('data_transacao', { ascending: false })
      .limit(5),
    supabase
      .from('lembretes')
      .select('id_lembrete, descricao, data_vencimento, valor_previsto, tipo')
      .eq('ativo', true)
      .gte('data_vencimento', hoje)
      .order('data_vencimento', { ascending: true })
      .limit(4),
  ])

  const falha = contas.error ?? doMes.error ?? recentes.error ?? lembretes.error
  if (falha) return NextResponse.json({ error: falha.message }, { status: 500 })

  const saldoTotal = (contas.data ?? []).reduce((soma, c) => soma + (c.saldo_atual || 0), 0)

  const somar = (tipo: 'Entrada' | 'Saida') =>
    (doMes.data ?? [])
      .filter((t) => t.tipo === tipo)
      .reduce((soma, t) => soma + Math.abs(t.valor || 0), 0)

  const entradas = somar('Entrada')
  const saidas = somar('Saida')

  return NextResponse.json({
    data: {
      saldoTotal,
      entradas,
      saidas,
      saldoMes: entradas - saidas,
      metasAtivas: metasAtivas.count ?? 0,
      recentes: recentes.data ?? [],
      proximosLembretes: lembretes.data ?? [],
    },
  })
}
