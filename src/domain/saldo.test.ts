import { describe, it, expect } from 'vitest'

import { ContaBloqueadaError } from './erros'
import {
  aplicarDelta,
  deltaDaExclusao,
  deltasDaEdicao,
  efeitoNoSaldo,
  exigirContaOperavel,
  saldoConsolidado,
  validarLancamento,
} from './saldo'
import { ValorInvalidoError } from './erros'

/**
 * Testes de unidade do nucleo de saldo.
 *
 * Sao funcoes puras: nao ha Arrange de infraestrutura, nenhum dubl e e cada
 * caso roda em microssegundos. Nomes seguem
 * [Unidade]_[Condicao]_[ResultadoEsperado].
 */

describe('efeitoNoSaldo', () => {
  it('efeitoNoSaldo_entrada_somaAoSaldo', () => {
    // Arrange
    const lancamento = { idConta: 1, tipo: 'Entrada' as const, valor: 250.5 }

    // Act
    const efeito = efeitoNoSaldo(lancamento)

    // Assert
    expect(efeito).toBe(250.5)
  })

  it('efeitoNoSaldo_saida_subtraiDoSaldo', () => {
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: 80 }

    const efeito = efeitoNoSaldo(lancamento)

    expect(efeito).toBe(-80)
  })

  it('efeitoNoSaldo_valorNegativoGravado_usaOTipoParaDecidirOSinal', () => {
    // Registro legado gravado com valor negativo: o sinal tem de vir do tipo,
    // senao uma saida somaria ao inves de subtrair.
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: -80 }

    const efeito = efeitoNoSaldo(lancamento)

    expect(efeito).toBe(-80)
  })
})

describe('aplicarDelta', () => {
  it('aplicarDelta_somaComResiduoBinario_arredondaParaCentavos', () => {
    // 0.1 + 0.2 em ponto flutuante da 0.30000000000000004.
    const saldo = 0.1

    const novo = aplicarDelta(saldo, 0.2)

    expect(novo).toBe(0.3)
  })

  it('aplicarDelta_deltaNegativo_reduzOSaldo', () => {
    const saldo = 1000

    const novo = aplicarDelta(saldo, -250.75)

    expect(novo).toBe(749.25)
  })
})

describe('deltasDaEdicao', () => {
  it('deltasDaEdicao_mesmaContaEValorMaior_geraUmDeltaLiquido', () => {
    const antes = { idConta: 1, tipo: 'Saida' as const, valor: 100 }
    const depois = { idConta: 1, tipo: 'Saida' as const, valor: 150 }

    const deltas = deltasDaEdicao(antes, depois)

    // A saida cresceu 50, entao o saldo cai mais 50.
    expect(deltas).toEqual([{ idConta: 1, delta: -50 }])
  })

  it('deltasDaEdicao_trocaDeTipo_inverteOEfeitoPorInteiro', () => {
    const antes = { idConta: 1, tipo: 'Saida' as const, valor: 100 }
    const depois = { idConta: 1, tipo: 'Entrada' as const, valor: 100 }

    const deltas = deltasDaEdicao(antes, depois)

    // Devolve os 100 retirados e soma os 100 novos.
    expect(deltas).toEqual([{ idConta: 1, delta: 200 }])
  })

  it('deltasDaEdicao_mudancaDeConta_devolveParaAOrigemEDescontaNoDestino', () => {
    const antes = { idConta: 1, tipo: 'Saida' as const, valor: 100 }
    const depois = { idConta: 2, tipo: 'Saida' as const, valor: 100 }

    const deltas = deltasDaEdicao(antes, depois)

    expect(deltas).toEqual([
      { idConta: 1, delta: 100 },
      { idConta: 2, delta: -100 },
    ])
  })

  it('deltasDaEdicao_semMudancaFinanceira_naoGeraAjuste', () => {
    // Editar so a descricao nao pode mexer em saldo nenhum.
    const antes = { idConta: 1, tipo: 'Saida' as const, valor: 100 }
    const depois = { idConta: 1, tipo: 'Saida' as const, valor: 100 }

    const deltas = deltasDaEdicao(antes, depois)

    expect(deltas).toEqual([])
  })
})

describe('deltaDaExclusao', () => {
  it('deltaDaExclusao_saidaExcluida_devolveOValorAoSaldo', () => {
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: 120 }

    const delta = deltaDaExclusao(lancamento)

    expect(delta).toBe(120)
  })

  it('deltaDaExclusao_entradaExcluida_retiraOValorDoSaldo', () => {
    const lancamento = { idConta: 1, tipo: 'Entrada' as const, valor: 300 }

    const delta = deltaDaExclusao(lancamento)

    expect(delta).toBe(-300)
  })
})

describe('saldoConsolidado', () => {
  it('saldoConsolidado_variasContas_somaTodosOsSaldos', () => {
    const contas = [{ saldo_atual: 1000 }, { saldo_atual: 250.5 }, { saldo_atual: -80.5 }]

    const total = saldoConsolidado(contas)

    expect(total).toBe(1170)
  })

  it('saldoConsolidado_semContas_retornaZero', () => {
    const total = saldoConsolidado([])

    expect(total).toBe(0)
  })
})

describe('exigirContaOperavel', () => {
  it('exigirContaOperavel_contaAtiva_naoLancaErro', () => {
    const conta = { status_conta: 'Ativo' as const, instituicao: 'Nubank' }

    expect(() => exigirContaOperavel(conta)).not.toThrow()
  })

  it('exigirContaOperavel_contaBloqueada_lancaContaBloqueadaError', () => {
    const conta = { status_conta: 'Bloqueado' as const, instituicao: 'Nubank' }

    expect(() => exigirContaOperavel(conta)).toThrow(ContaBloqueadaError)
  })

  it('exigirContaOperavel_contaInativa_lancaContaBloqueadaError', () => {
    const conta = { status_conta: 'Inativo' as const, instituicao: 'Itau' }

    expect(() => exigirContaOperavel(conta)).toThrow(ContaBloqueadaError)
  })

  it('exigirContaOperavel_contaBloqueada_mensagemNomeiaAInstituicao', () => {
    // A pessoa pode ter varias contas; a mensagem precisa dizer qual recusou.
    const conta = { status_conta: 'Bloqueado' as const, instituicao: 'Nubank' }

    expect(() => exigirContaOperavel(conta)).toThrow(/Nubank/)
  })
})

describe('validarLancamento', () => {
  const contaAtiva = { status_conta: 'Ativo' as const, instituicao: 'Nubank' }

  it('validarLancamento_valorZero_lancaValorInvalidoError', () => {
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: 0 }

    expect(() => validarLancamento(lancamento, contaAtiva)).toThrow(ValorInvalidoError)
  })

  it('validarLancamento_valorNegativo_lancaValorInvalidoError', () => {
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: -1 }

    expect(() => validarLancamento(lancamento, contaAtiva)).toThrow(ValorInvalidoError)
  })

  it('validarLancamento_valorPositivoEContaAtiva_passa', () => {
    const lancamento = { idConta: 1, tipo: 'Saida' as const, valor: 10 }

    expect(() => validarLancamento(lancamento, contaAtiva)).not.toThrow()
  })
})
