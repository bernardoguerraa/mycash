import type { SupabaseClient } from '@supabase/supabase-js'

import { aplicarDelta, deltaDaExclusao, deltasDaEdicao, efeitoNoSaldo } from '@/domain/saldo'
import type { Lancamento } from '@/domain/saldo'
import type { Database } from '@/types/database'

/**
 * Adaptador de persistencia do saldo.
 *
 * A regra de quanto o saldo muda vive em `src/domain/saldo.ts`, que e puro e
 * testado sem banco. Este arquivo so faz o I/O: le a linha, chama a funcao de
 * dominio e grava o resultado. Se o Postgres for trocado, o dominio nao muda.
 *
 * Limitacao conhecida: as duas etapas nao correm numa transacao unica, porque
 * as tabelas centrais nao tem migration versionada e um trigger nao poderia
 * ser revisado no repositorio. Se o ajuste falhar depois do insert, a conta
 * fica defasada ate o proximo lancamento nela. O caminho definitivo e um
 * trigger em `transacoes`, junto da migration que falta.
 */

type Cliente = SupabaseClient<Database>

export type { Lancamento }
export { efeitoNoSaldo }

/**
 * Soma `delta` ao saldo da conta.
 *
 * Le e escreve em duas etapas porque o PostgREST nao expoe incremento
 * atomico; a RLS garante que so o dono da conta chega aqui.
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
    .update({ saldo_atual: aplicarDelta(conta.saldo_atual, delta) })
    .eq('id_conta', idConta)
}

/**
 * Reconcilia o saldo apos uma edicao.
 *
 * O dominio decide os deltas (podem ser dois, quando a conta muda); aqui so
 * aplicamos cada um.
 */
export async function trocarEfeito(
  supabase: Cliente,
  antes: Lancamento,
  depois: Lancamento
): Promise<void> {
  for (const { idConta, delta } of deltasDaEdicao(antes, depois)) {
    await ajustarSaldo(supabase, idConta, delta)
  }
}

/** Desfaz o efeito de um lancamento excluido. */
export async function reverterEfeito(
  supabase: Cliente,
  lancamento: Lancamento
): Promise<void> {
  await ajustarSaldo(supabase, lancamento.idConta, deltaDaExclusao(lancamento))
}
