import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TipoTransacao } from '@/types/database'

/**
 * Movimentacao do saldo da conta a cada lancamento.
 *
 * Ate aqui `contas_bancarias.saldo_atual` era um numero digitado a mao que
 * nunca acompanhava as transacoes: dava para lancar R$ 20 mil de entrada e o
 * saldo continuar no valor do cadastro. Agora toda escrita em /api/transacoes
 * corrige a conta afetada.
 *
 * Fica no servidor de proposito — web e mobile chamam as mesmas rotas, entao
 * a regra vale para os dois sem ser reescrita de cada lado.
 *
 * Limitacao conhecida: Postgres nao esta sendo usado em transacao unica aqui,
 * porque as tabelas centrais nao tem migration versionada e um trigger nao
 * poderia ser revisado no repositorio. Se o ajuste do saldo falhar depois do
 * insert, a conta fica defasada ate o proximo lancamento naquela conta. O
 * caminho definitivo e um trigger em `transacoes`, junto com a migration que
 * falta para as seis tabelas centrais.
 */

type Cliente = SupabaseClient<Database>

/** Entrada soma, saida subtrai. */
export function efeitoNoSaldo(tipo: TipoTransacao, valor: number): number {
  const modulo = Math.abs(Number(valor) || 0)
  return tipo === 'Entrada' ? modulo : -modulo
}

/**
 * Soma `delta` ao saldo da conta. Le e escreve em duas etapas porque o
 * PostgREST nao expoe incremento atomico; a RLS garante que so o dono chega
 * aqui.
 */
export async function ajustarSaldo(
  supabase: Cliente,
  idConta: number,
  delta: number
): Promise<void> {
  if (!delta) return

  const { data: conta } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual')
    .eq('id_conta', idConta)
    .maybeSingle()

  if (!conta) return

  await supabase
    .from('contas_bancarias')
    .update({ saldo_atual: Number((conta.saldo_atual + delta).toFixed(2)) })
    .eq('id_conta', idConta)
}

/**
 * Troca o efeito de uma transacao pelo de outra, cobrindo o caso de a edicao
 * mudar de conta: devolve o valor para a conta antiga e desconta na nova.
 */
export async function trocarEfeito(
  supabase: Cliente,
  antes: { id_conta: number; tipo: TipoTransacao; valor: number },
  depois: { id_conta: number; tipo: TipoTransacao; valor: number }
): Promise<void> {
  const efeitoAntes = efeitoNoSaldo(antes.tipo, antes.valor)
  const efeitoDepois = efeitoNoSaldo(depois.tipo, depois.valor)

  if (antes.id_conta === depois.id_conta) {
    await ajustarSaldo(supabase, antes.id_conta, efeitoDepois - efeitoAntes)
    return
  }

  await ajustarSaldo(supabase, antes.id_conta, -efeitoAntes)
  await ajustarSaldo(supabase, depois.id_conta, efeitoDepois)
}
