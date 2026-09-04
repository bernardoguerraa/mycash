import { ContaNaoEncontradaError } from './erros'
import type { ContasPort, TransacaoDoDominio, TransacoesPort } from './portas'
import {
  deltaDaExclusao,
  deltasDaEdicao,
  efeitoNoSaldo,
  validarLancamento,
} from './saldo'

/**
 * Casos de uso de lancamento: criar, editar e excluir mantendo o saldo da
 * conta coerente.
 *
 * Depende so das portas (ContasPort/TransacoesPort), nunca de Supabase. Em
 * producao recebe os adaptadores Postgres; no teste recebe repositorios em
 * memoria, e a regra exercitada e exatamente a mesma que roda em producao.
 *
 * Antes disso, `saldo_atual` era um numero digitado no cadastro que nunca
 * acompanhava os lancamentos.
 */

export type NovoLancamento = {
  id_conta: number
  tipo: TransacaoDoDominio['tipo']
  valor: number
  descricao: string
  categoria: string
  data_transacao: string
}

export function criarServicoDeLancamentos(contas: ContasPort, transacoes: TransacoesPort) {
  /** Busca a conta ou falha — nenhuma operacao segue sem conta valida. */
  async function exigirConta(idConta: number) {
    const conta = await contas.porId(idConta)
    if (!conta) {
      throw new ContaNaoEncontradaError('Conta nao encontrada para este usuario.')
    }
    return conta
  }

  return {
    /** Grava o lancamento e move o saldo da conta no mesmo passo. */
    async criar(dados: NovoLancamento): Promise<TransacaoDoDominio> {
      const conta = await exigirConta(dados.id_conta)

      validarLancamento(
        { idConta: dados.id_conta, tipo: dados.tipo, valor: dados.valor },
        conta
      )

      const criada = await transacoes.inserir(dados)

      await contas.ajustarSaldo(
        dados.id_conta,
        efeitoNoSaldo({ idConta: dados.id_conta, tipo: dados.tipo, valor: dados.valor })
      )

      return criada
    },

    /**
     * Edita o lancamento e reconcilia o saldo.
     *
     * Quando a conta muda, duas contas sao ajustadas: a antiga recebe de volta
     * o que perdera e a nova passa a arcar com o valor.
     */
    async editar(
      idTransacao: number,
      mudancas: Partial<NovoLancamento>
    ): Promise<TransacaoDoDominio> {
      const antes = await transacoes.porId(idTransacao)
      if (!antes) {
        throw new ContaNaoEncontradaError('Lancamento nao encontrado.')
      }

      const depois = {
        idConta: mudancas.id_conta ?? antes.id_conta,
        tipo: mudancas.tipo ?? antes.tipo,
        valor: mudancas.valor ?? antes.valor,
      }

      // A conta de destino precisa aceitar o lancamento: mover um valor para
      // uma conta bloqueada seria a mesma escrita que a criacao recusa.
      const contaDestino = await exigirConta(depois.idConta)
      validarLancamento(depois, contaDestino)

      const atualizada = await transacoes.atualizar(idTransacao, mudancas)

      const deltas = deltasDaEdicao(
        { idConta: antes.id_conta, tipo: antes.tipo, valor: antes.valor },
        depois
      )
      for (const { idConta, delta } of deltas) {
        await contas.ajustarSaldo(idConta, delta)
      }

      return atualizada
    },

    /**
     * Remove o lancamento e devolve o valor ao saldo.
     *
     * Le antes de apagar: depois do delete nao ha como saber quanto devolver.
     * Excluir e permitido mesmo em conta bloqueada — bloquear impede entrada
     * de dinheiro novo, nao a correcao de um lancamento indevido.
     */
    async excluir(idTransacao: number): Promise<void> {
      const antes = await transacoes.porId(idTransacao)
      if (!antes) return

      await transacoes.remover(idTransacao)
      await contas.ajustarSaldo(
        antes.id_conta,
        deltaDaExclusao({ idConta: antes.id_conta, tipo: antes.tipo, valor: antes.valor })
      )
    },
  }
}

export type ServicoDeLancamentos = ReturnType<typeof criarServicoDeLancamentos>
