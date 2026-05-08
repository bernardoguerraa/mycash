import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Tx = Database['public']['Tables']['transacoes']['Row']
type DB = SupabaseClient<Database>

/**
 * Aplica regras quando uma transação nova chega:
 * - Entrada → avança valor_atual de metas "EmAndamento" (proporcional simples)
 * - Match com lembrete por descrição → desativa lembrete
 * - Cria notificação resumo
 */
export async function applyTransactionRules(
  db: DB,
  tx: Tx,
  idUsuario: number
): Promise<void> {
  const mensagens: string[] = []

  // 1) Atualiza metas em progresso se for entrada
  if (tx.tipo === 'Entrada') {
    const { data: metas } = await db
      .from('metas_financeiras')
      .select('id_meta, titulo, valor_atual, valor_objetivo')
      .eq('id_usuario', idUsuario)
      .eq('status', 'EmAndamento')

    if (metas && metas.length > 0) {
      // estratégia: distribui 10% da entrada uniformemente entre metas ativas
      const contribuicao = Math.round((tx.valor * 0.1) / metas.length * 100) / 100

      for (const m of metas) {
        const novoValor = Math.min(m.valor_atual + contribuicao, m.valor_objetivo)
        const concluida = novoValor >= m.valor_objetivo

        await db
          .from('metas_financeiras')
          .update({
            valor_atual: novoValor,
            status: concluida ? 'Concluida' : 'EmAndamento',
          })
          .eq('id_meta', m.id_meta)

        if (concluida) {
          mensagens.push(`Meta "${m.titulo}" concluída!`)
        } else if (contribuicao > 0) {
          mensagens.push(`Meta "${m.titulo}" +R$ ${contribuicao.toFixed(2)}`)
        }
      }
    }
  }

  // 2) Tenta casar com lembrete ativo
  const descNorm = tx.descricao.toLowerCase()
  const { data: lembretes } = await db
    .from('lembretes')
    .select('id_lembrete, descricao, valor_previsto, tipo')
    .eq('id_usuario', idUsuario)
    .eq('ativo', true)

  if (lembretes) {
    for (const l of lembretes) {
      const match =
        descNorm.includes(l.descricao.toLowerCase()) &&
        Math.abs(tx.valor - l.valor_previsto) / l.valor_previsto < 0.1

      if (match) {
        await db.from('lembretes').update({ ativo: false }).eq('id_lembrete', l.id_lembrete)
        mensagens.push(`Lembrete "${l.descricao}" marcado como pago`)
      }
    }
  }

  // 3) Notificação consolidada
  if (mensagens.length > 0) {
    await db.from('notificacoes').insert({
      id_usuario: idUsuario,
      tipo: 'Sistema',
      mensagem: mensagens.join(' · '),
      lida: false,
    })
  }
}

/** Alerta de saldo baixo após sync de conta */
export async function applyBalanceAlert(
  db: DB,
  idUsuario: number,
  idConta: number,
  saldo: number,
  instituicao: string
): Promise<void> {
  if (saldo >= 100) return

  await db.from('notificacoes').insert({
    id_usuario: idUsuario,
    tipo: 'Alerta',
    mensagem: `Saldo baixo em ${instituicao}: R$ ${saldo.toFixed(2)}`,
    lida: false,
  })
}
