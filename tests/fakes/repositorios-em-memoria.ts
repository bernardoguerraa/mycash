import type {
  ContaDoDominio,
  ContasPort,
  TransacaoDoDominio,
  TransacoesPort,
} from '@/domain/portas'

/**
 * Repositorios em memoria (Fake, na taxonomia de Meszaros).
 *
 * Nao sao stubs nem mocks: sao implementacoes funcionais e completas das
 * portas, guardando estado num Map. Isso permite verificacao de estado
 * (escola de Detroit) — o teste afirma "o saldo ficou 850", e nao "o metodo
 * ajustarSaldo foi chamado com 350".
 *
 * A diferenca importa na pratica: um teste que verifica chamadas quebra quando
 * alguem reescreve a mesma regra somando de outro jeito, mesmo com o resultado
 * final identico. Isso e falso positivo, e destroi a confianca na suite.
 */

export class ContasEmMemoria implements ContasPort {
  private readonly registros = new Map<number, ContaDoDominio>()

  constructor(iniciais: ContaDoDominio[] = []) {
    iniciais.forEach((conta) => this.registros.set(conta.id_conta, { ...conta }))
  }

  async porId(idConta: number): Promise<ContaDoDominio | null> {
    const conta = this.registros.get(idConta)
    // Devolve copia: se o teste alterar o objeto recebido, o "banco" nao muda
    // junto — um repositorio real tambem nao devolveria a linha por referencia.
    return conta ? { ...conta } : null
  }

  async ajustarSaldo(idConta: number, delta: number): Promise<void> {
    const conta = this.registros.get(idConta)
    if (!conta) return
    conta.saldo_atual = Math.round((conta.saldo_atual + delta) * 100) / 100
  }

  /** Leitura sincrona para a fase de Assert. */
  saldoDe(idConta: number): number | undefined {
    return this.registros.get(idConta)?.saldo_atual
  }
}

export class TransacoesEmMemoria implements TransacoesPort {
  private readonly registros = new Map<number, TransacaoDoDominio>()
  private proximoId: number

  constructor(iniciais: TransacaoDoDominio[] = []) {
    iniciais.forEach((t) => this.registros.set(t.id_transacao, { ...t }))
    // Continua a numeracao a partir do maior id semeado, como uma sequence.
    this.proximoId = Math.max(0, ...iniciais.map((t) => t.id_transacao)) + 1
  }

  async porId(idTransacao: number): Promise<TransacaoDoDominio | null> {
    const registro = this.registros.get(idTransacao)
    return registro ? { ...registro } : null
  }

  async inserir(dados: Omit<TransacaoDoDominio, 'id_transacao'>): Promise<TransacaoDoDominio> {
    const criada: TransacaoDoDominio = { ...dados, id_transacao: this.proximoId++ }
    this.registros.set(criada.id_transacao, criada)
    return { ...criada }
  }

  async atualizar(
    idTransacao: number,
    dados: Partial<Omit<TransacaoDoDominio, 'id_transacao'>>
  ): Promise<TransacaoDoDominio> {
    const atual = this.registros.get(idTransacao)
    if (!atual) throw new Error(`Transacao ${idTransacao} nao existe.`)

    const atualizada = { ...atual, ...dados }
    this.registros.set(idTransacao, atualizada)
    return { ...atualizada }
  }

  async remover(idTransacao: number): Promise<void> {
    this.registros.delete(idTransacao)
  }

  /** Leitura sincrona para a fase de Assert. */
  todas(): TransacaoDoDominio[] {
    return Array.from(this.registros.values())
  }
}
