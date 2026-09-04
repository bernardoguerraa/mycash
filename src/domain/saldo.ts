import { ContaBloqueadaError } from './erros'
import { emCentavos, exigirValorPositivo } from './valores'
import type { StatusConta, TipoTransacao } from './tipos'

/**
 * Regras de saldo — o nucleo do dominio do MyCash.
 *
 * Tudo aqui e funcao pura sobre dados simples: nao conhece Supabase, HTTP nem
 * relogio. O adaptador (src/lib/api/saldo.ts) le do banco, chama estas
 * funcoes e grava o resultado; se um dia o banco mudar, este arquivo nao muda.
 *
 * Foi justamente a regra que faltava: `saldo_atual` era um numero digitado no
 * cadastro que nunca acompanhava os lancamentos, entao dava para lancar vinte
 * mil reais de entrada e a conta continuar com o valor inicial.
 */

/** O minimo que o dominio precisa saber de um lancamento. */
export type Lancamento = {
  idConta: number
  tipo: TipoTransacao
  valor: number
}

/**
 * Quanto um lancamento move o saldo: entrada soma, saida subtrai.
 *
 * Usa o modulo do valor de proposito. Se um registro antigo tiver sido gravado
 * com valor negativo, o sinal ainda vem do `tipo` — senao uma saida de -50
 * somaria ao inves de subtrair.
 */
export function efeitoNoSaldo(lancamento: Lancamento): number {
  const modulo = Math.abs(Number(lancamento.valor) || 0)
  return lancamento.tipo === 'Entrada' ? modulo : -modulo
}

/** Aplica um delta ao saldo, ja arredondado para centavos. */
export function aplicarDelta(saldoAtual: number, delta: number): number {
  return emCentavos(saldoAtual + delta)
}

/**
 * Deltas que uma edicao produz.
 *
 * Editar pode trocar a conta do lancamento, e nesse caso duas contas mudam: a
 * antiga recebe de volta o que havia perdido e a nova passa a arcar com o
 * valor. Devolver uma lista (em vez de um numero) e o que torna esse caso
 * representavel — com um retorno unico a mudanca de conta ficaria invisivel.
 *
 * Mesma conta produz um delta so, ja liquido.
 */
export function deltasDaEdicao(
  antes: Lancamento,
  depois: Lancamento
): { idConta: number; delta: number }[] {
  const efeitoAntes = efeitoNoSaldo(antes)
  const efeitoDepois = efeitoNoSaldo(depois)

  if (antes.idConta === depois.idConta) {
    const delta = emCentavos(efeitoDepois - efeitoAntes)
    return delta === 0 ? [] : [{ idConta: antes.idConta, delta }]
  }

  return [
    { idConta: antes.idConta, delta: emCentavos(-efeitoAntes) },
    { idConta: depois.idConta, delta: emCentavos(efeitoDepois) },
  ]
}

/** Excluir desfaz exatamente o efeito que o lancamento tinha aplicado. */
export function deltaDaExclusao(lancamento: Lancamento): number {
  return emCentavos(-efeitoNoSaldo(lancamento))
}

/** Saldo consolidado: a soma dos saldos das contas do usuario. */
export function saldoConsolidado(contas: { saldo_atual: number }[]): number {
  return emCentavos(contas.reduce((total, c) => total + (c.saldo_atual || 0), 0))
}

/**
 * Uma conta so aceita lancamento enquanto esta Ativa.
 *
 * `status_conta` existe no schema desde o inicio, mas nada no sistema o
 * respeitava: dava para lancar normalmente numa conta Bloqueada. Bloquear uma
 * conta que continua recebendo movimento nao bloqueia nada.
 */
export function exigirContaOperavel(conta: {
  status_conta: StatusConta
  instituicao?: string
}): void {
  if (conta.status_conta === 'Ativo') return

  const nome = conta.instituicao ? `"${conta.instituicao}"` : 'selecionada'
  const motivo = conta.status_conta === 'Bloqueado' ? 'bloqueada' : 'inativa'

  throw new ContaBloqueadaError(
    `A conta ${nome} esta ${motivo} e nao aceita novos lancamentos.`
  )
}

/**
 * Valida um lancamento antes de ele tocar o banco.
 *
 * Reune as duas regras acima num ponto so, para que criar e editar nao possam
 * divergir com o tempo.
 */
export function validarLancamento(
  lancamento: Lancamento,
  conta: { status_conta: StatusConta; instituicao?: string }
): void {
  exigirValorPositivo(lancamento.valor)
  exigirContaOperavel(conta)
}
