import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getPluggyClient } from './client'
import {
  mapAccountType,
  mapAccountNumber,
  mapTransactionTipo,
  mapTransactionCategoria,
} from './mapping'
import { applyTransactionRules, applyBalanceAlert } from './rules'

type DB = SupabaseClient<Database>

/**
 * Sincroniza todas as contas e transações de um item Pluggy.
 * - Usa service role (server-side) para bypass de RLS no ingest.
 * - Idempotente: upsert por pluggy_account_id e pluggy_tx_id.
 */
export async function syncPluggyItem(
  db: DB,
  pluggyItemId: string,
  idUsuario: number,
  options: { since?: Date } = {}
): Promise<{ contas: number; transacoes: number; novos: number }> {
  const pluggy = getPluggyClient()

  const item = await pluggy.fetchItem(pluggyItemId)

  // Atualiza connection status
  await db
    .from('pluggy_connections')
    .update({
      status: item.status,
      execution_status: item.executionStatus,
      last_updated_at: new Date().toISOString(),
      error_code: item.error?.code ?? null,
      error_message: item.error?.message ?? null,
    })
    .eq('pluggy_item_id', pluggyItemId)

  const accountsResp = await pluggy.fetchAccounts(pluggyItemId)
  const accounts = accountsResp.results

  let totalTx = 0
  let novosTx = 0

  for (const acc of accounts) {
    // Upsert conta
    const { data: conta, error: accErr } = await db
      .from('contas_bancarias')
      .upsert(
        {
          id_usuario: idUsuario,
          instituicao: item.connector.name,
          numero_conta: mapAccountNumber(acc),
          tipo_conta: mapAccountType(acc),
          saldo_atual: acc.balance,
          ultima_sync: new Date().toISOString(),
          pluggy_item_id: pluggyItemId,
          pluggy_account_id: acc.id,
          pluggy_status: item.status,
          origem: 'pluggy',
        },
        { onConflict: 'pluggy_account_id' }
      )
      .select()
      .single()

    if (accErr || !conta) {
      console.error('upsert conta falhou', accErr)
      continue
    }

    await applyBalanceAlert(db, idUsuario, conta.id_conta, acc.balance, item.connector.name)

    // Busca transações (paginação)
    let page = 1
    const pageSize = 500
    while (true) {
      const txResp = await pluggy.fetchTransactions(acc.id, {
        from: options.since?.toISOString().slice(0, 10),
        pageSize,
        page,
      })

      for (const tx of txResp.results) {
        totalTx++

        // upsert idempotente
        const payload = {
          id_conta: conta.id_conta,
          data_transacao: tx.date.toISOString().slice(0, 10),
          tipo: mapTransactionTipo(tx),
          categoria: mapTransactionCategoria(tx),
          descricao: tx.description || '(sem descrição)',
          valor: Math.abs(tx.amount),
          pluggy_tx_id: tx.id,
          origem: 'pluggy' as const,
          raw_data: tx as any,
        }

        const { data: inserted, error: txErr } = await db
          .from('transacoes')
          .upsert(payload, { onConflict: 'pluggy_tx_id', ignoreDuplicates: false })
          .select()
          .single()

        if (txErr) {
          console.error('upsert tx falhou', txErr)
          continue
        }

        // Se foi insert novo (não update), aplica regras
        if (inserted) {
          novosTx++
          await applyTransactionRules(db, inserted, idUsuario)
        }
      }

      if (txResp.results.length < pageSize) break
      page++
      if (page > 20) break // safety: max 10k tx por sync
    }
  }

  return { contas: accounts.length, transacoes: totalTx, novos: novosTx }
}
