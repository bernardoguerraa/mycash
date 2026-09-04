import type { StatusConta, TipoTransacao } from '@/types/database'

/**
 * Portas do dominio (Inversao de Dependencia).
 *
 * O caso de uso depende destas interfaces, nunca de Supabase ou fetch. Em
 * producao quem as implementa e o adaptador Postgres; no teste, um repositorio
 * em memoria. E o que permite exercitar a regra de negocio sem rede, sem banco
 * e sem container — os testes rodam em milissegundos e dao o mesmo resultado
 * em qualquer maquina.
 *
 * Sao interfaces estreitas de proposito: declaram o que o dominio usa, e nao
 * tudo o que a tabela sabe fazer. Porta larga obriga o Fake do teste a
 * implementar metodos que ninguem chama.
 */

export type ContaDoDominio = {
  id_conta: number
  instituicao: string
  saldo_atual: number
  status_conta: StatusConta
}

export type TransacaoDoDominio = {
  id_transacao: number
  id_conta: number
  tipo: TipoTransacao
  valor: number
  descricao: string
  categoria: string
  data_transacao: string
}

export interface ContasPort {
  porId(idConta: number): Promise<ContaDoDominio | null>
  /** Soma `delta` ao saldo. Implementacoes devem persistir o resultado. */
  ajustarSaldo(idConta: number, delta: number): Promise<void>
}

export interface TransacoesPort {
  porId(idTransacao: number): Promise<TransacaoDoDominio | null>
  inserir(dados: Omit<TransacaoDoDominio, 'id_transacao'>): Promise<TransacaoDoDominio>
  atualizar(
    idTransacao: number,
    dados: Partial<Omit<TransacaoDoDominio, 'id_transacao'>>
  ): Promise<TransacaoDoDominio>
  remover(idTransacao: number): Promise<void>
}
