import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getCurrentIdUsuario } from '@/lib/api/auth'
import { saldoConsolidado } from '@/domain/saldo'
import { serieMensal, totalPorTipo } from '@/domain/resumo'
import { paraDataLocal } from '@/domain/datas'

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
  if (!idUsuario) return NextResponse.json({ error: 'nao autenticado' }, { status: 401, headers: SEM_CACHE })

  const agora = new Date()
  // A serie cobre os seis meses que terminam no atual, entao a janela comeca
  // no primeiro dia de cinco meses atras. O mes corrente sai da mesma
  // consulta — nao vale uma ida a mais ao banco so para ele.
  const inicioSerie = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()

  const [perfil, contas, seisMeses, metasAtivas, recentes, lembretes] = await Promise.all([
    supabase.from('usuarios').select('nome_completo').eq('id_usuario', idUsuario).maybeSingle(),
    supabase.from('contas_bancarias').select('saldo_atual'),
    supabase
      .from('transacoes')
      .select('valor, tipo, data_transacao')
      .gte('data_transacao', inicioSerie.toISOString()),
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

  const falha = contas.error ?? seisMeses.error ?? recentes.error ?? lembretes.error
  if (falha) return NextResponse.json({ error: falha.message }, { status: 500, headers: SEM_CACHE })

  // As agregacoes vivem em src/domain/resumo.ts, testadas sem banco. Esta
  // rota so busca as linhas e entrega o resultado.
  const saldoTotal = saldoConsolidado(contas.data ?? [])
  const lancamentos = seisMeses.data ?? []

  const serie = serieMensal(lancamentos, agora)
  const doMesCorrente = lancamentos.filter((t) => {
    const data = paraDataLocal(t.data_transacao)
    return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
  })

  const entradas = totalPorTipo(doMesCorrente, 'Entrada')
  const saidas = totalPorTipo(doMesCorrente, 'Saida')

  return NextResponse.json(
    {
      data: {
        // O nome vem daqui, e nao do user_metadata do Supabase Auth: o cadastro
        // grava o nome completo na tabela `usuarios`, e o metadata do Auth fica
        // vazio. Sem isso a saudacao cai no prefixo do e-mail.
        nome: perfil.data?.nome_completo ?? '',
        saldoTotal,
        entradas,
        saidas,
        saldoMes: entradas - saidas,
        metasAtivas: metasAtivas.count ?? 0,
        serieMensal: serie,
        recentes: recentes.data ?? [],
        proximosLembretes: lembretes.data ?? [],
      },
    },
    { headers: SEM_CACHE }
  )
}
