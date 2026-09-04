/**
 * Erros de dominio.
 *
 * Sao classes, e nao strings soltas, para que o teste possa afirmar o tipo do
 * erro (`rejects.toThrow(ContaBloqueadaError)`) sem depender da mensagem. A
 * mensagem e texto de interface e muda; o tipo e o contrato.
 *
 * Nenhum deles conhece HTTP: quem traduz para status code e o adaptador em
 * src/lib/api, nao o dominio.
 */

export class ErroDeDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = new.target.name
  }
}

/** Valor monetario que deveria ser positivo veio zerado ou negativo. */
export class ValorInvalidoError extends ErroDeDominio {}

/** Data fora de ordem, ausente ou impossivel. */
export class DataInvalidaError extends ErroDeDominio {}

/**
 * Lancamento em conta que nao esta com status Ativo.
 *
 * A tabela `contas_bancarias` guarda o status, mas ate agora nada no sistema
 * o respeitava: dava para lancar numa conta bloqueada normalmente.
 */
export class ContaBloqueadaError extends ErroDeDominio {}

/** Operacao referenciando conta que nao existe (ou nao e do usuario). */
export class ContaNaoEncontradaError extends ErroDeDominio {}
