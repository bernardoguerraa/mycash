import { describe, it, expect, beforeEach } from 'vitest'

import { ContasEmMemoria, TransacoesEmMemoria } from '../../tests/fakes/repositorios-em-memoria'
import { ContaBloqueadaError, ContaNaoEncontradaError, ValorInvalidoError } from './erros'
import { criarServicoDeLancamentos, type ServicoDeLancamentos } from './lancamentos'

/**
 * Testes do caso de uso de lancamento, com repositorios em memoria.
 *
 * Nenhum mock: os Fakes sao implementacoes reais das portas, e as assercoes
 * olham o estado final ("o saldo ficou 850"), nao a troca de mensagens ("o
 * metodo foi chamado com 150"). E a verificacao de estado da escola de
 * Detroit, que sobrevive a refatoracao interna do servico.
 *
 * Zero I/O: sem rede, sem banco, sem relogio. Roda igual em qualquer maquina.
 */

const CONTA_ATIVA = {
  id_conta: 1,
  instituicao: 'Nubank',
  saldo_atual: 1000,
  status_conta: 'Ativo' as const,
}

const CONTA_SECUNDARIA = {
  id_conta: 2,
  instituicao: 'Itau',
  saldo_atual: 500,
  status_conta: 'Ativo' as const,
}

const CONTA_BLOQUEADA = {
  id_conta: 3,
  instituicao: 'Banco Antigo',
  saldo_atual: 200,
  status_conta: 'Bloqueado' as const,
}

const LANCAMENTO_BASE = {
  id_conta: 1,
  tipo: 'Saida' as const,
  valor: 150,
  descricao: 'Mercado',
  categoria: 'Alimentacao',
  data_transacao: '2026-09-04',
}

let contas: ContasEmMemoria
let transacoes: TransacoesEmMemoria
let servico: ServicoDeLancamentos

// Estado novo a cada teste: um teste nunca herda o saldo deixado por outro
// (o "I" de Independent das regras F.I.R.S.T.).
beforeEach(() => {
  contas = new ContasEmMemoria([CONTA_ATIVA, CONTA_SECUNDARIA, CONTA_BLOQUEADA])
  transacoes = new TransacoesEmMemoria()
  servico = criarServicoDeLancamentos(contas, transacoes)
})

describe('criar', () => {
  it('criar_saidaEmContaAtiva_reduzOSaldoDaConta', async () => {
    // Arrange: conta 1 comeca com 1000.

    // Act
    await servico.criar(LANCAMENTO_BASE)

    // Assert
    expect(contas.saldoDe(1)).toBe(850)
  })

  it('criar_entrada_aumentaOSaldoDaConta', async () => {
    await servico.criar({ ...LANCAMENTO_BASE, tipo: 'Entrada', valor: 3200 })

    expect(contas.saldoDe(1)).toBe(4200)
  })

  it('criar_lancamentoValido_persisteATransacao', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE)

    expect(criada.id_transacao).toBeGreaterThan(0)
    expect(transacoes.todas()).toHaveLength(1)
  })

  it('criar_valorZero_lancaValorInvalidoError', async () => {
    await expect(servico.criar({ ...LANCAMENTO_BASE, valor: 0 })).rejects.toThrow(
      ValorInvalidoError
    )
  })

  it('criar_valorInvalido_naoAlteraOSaldo', async () => {
    // Regra recusada nao pode deixar rastro: saldo intacto.
    await expect(servico.criar({ ...LANCAMENTO_BASE, valor: -5 })).rejects.toThrow()

    expect(contas.saldoDe(1)).toBe(1000)
  })

  it('criar_contaInexistente_lancaContaNaoEncontradaError', async () => {
    await expect(servico.criar({ ...LANCAMENTO_BASE, id_conta: 999 })).rejects.toThrow(
      ContaNaoEncontradaError
    )
  })
})

describe('editar', () => {
  it('editar_aumentaOValorDaSaida_ajustaApenasADiferenca', async () => {
    // Arrange: 1000 - 150 = 850.
    const criada = await servico.criar(LANCAMENTO_BASE)

    // Act: a saida sobe para 200, ou seja, mais 50 saindo.
    await servico.editar(criada.id_transacao, { valor: 200 })

    // Assert
    expect(contas.saldoDe(1)).toBe(800)
  })

  it('editar_trocaSaidaPorEntrada_inverteOEfeitoNoSaldo', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE) // 850

    await servico.editar(criada.id_transacao, { tipo: 'Entrada' })

    // Devolve os 150 e soma outros 150.
    expect(contas.saldoDe(1)).toBe(1150)
  })

  it('editar_mudaDeConta_devolveParaAOrigemEDescontaNoDestino', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE) // conta 1: 850

    await servico.editar(criada.id_transacao, { id_conta: 2 })

    expect(contas.saldoDe(1)).toBe(1000) // origem restaurada
    expect(contas.saldoDe(2)).toBe(350) // destino descontado
  })

  it('editar_apenasADescricao_naoMexeNoSaldo', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE)

    await servico.editar(criada.id_transacao, { descricao: 'Mercado do bairro' })

    expect(contas.saldoDe(1)).toBe(850)
  })

  it('editar_moveParaContaBloqueada_lancaContaBloqueadaError', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE)

    await expect(servico.editar(criada.id_transacao, { id_conta: 3 })).rejects.toThrow(
      ContaBloqueadaError
    )
  })

  it('editar_transacaoInexistente_lancaContaNaoEncontradaError', async () => {
    await expect(servico.editar(999, { valor: 10 })).rejects.toThrow(ContaNaoEncontradaError)
  })
})

describe('excluir', () => {
  it('excluir_saida_devolveOValorAoSaldo', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE) // 850

    await servico.excluir(criada.id_transacao)

    expect(contas.saldoDe(1)).toBe(1000)
  })

  it('excluir_entrada_retiraOValorDoSaldo', async () => {
    const criada = await servico.criar({ ...LANCAMENTO_BASE, tipo: 'Entrada', valor: 500 })

    await servico.excluir(criada.id_transacao)

    expect(contas.saldoDe(1)).toBe(1000)
  })

  it('excluir_lancamento_removeORegistro', async () => {
    const criada = await servico.criar(LANCAMENTO_BASE)

    await servico.excluir(criada.id_transacao)

    expect(transacoes.todas()).toHaveLength(0)
  })

  it('excluir_idInexistente_naoAlteraNadaENaoLanca', async () => {
    // Excluir duas vezes (duplo toque na tela) nao pode debitar duas vezes.
    await expect(servico.excluir(999)).resolves.toBeUndefined()

    expect(contas.saldoDe(1)).toBe(1000)
  })
})

describe('conta bloqueada', () => {
  it('criar_emContaBloqueada_lancaContaBloqueadaError', async () => {
    await expect(servico.criar({ ...LANCAMENTO_BASE, id_conta: 3 })).rejects.toThrow(
      ContaBloqueadaError
    )
  })

  it('criar_emContaBloqueada_naoPersisteNemMoveOSaldo', async () => {
    await expect(servico.criar({ ...LANCAMENTO_BASE, id_conta: 3 })).rejects.toThrow()

    expect(transacoes.todas()).toHaveLength(0)
    expect(contas.saldoDe(3)).toBe(200)
  })

  it('excluir_emContaBloqueada_continuaPermitido', async () => {
    // Bloquear impede dinheiro novo, nao a correcao de um lancamento indevido.
    // O lancamento e semeado direto no repositorio porque a criacao recusaria.
    const semeada = await transacoes.inserir({ ...LANCAMENTO_BASE, id_conta: 3 })

    await servico.excluir(semeada.id_transacao)

    expect(contas.saldoDe(3)).toBe(350)
  })
})

describe('sequencia de operacoes', () => {
  it('operacoesEncadeadas_criarEditarExcluir_saldoVoltaAoInicial', async () => {
    // Fecha o ciclo: qualquer residuo nas contas aparece aqui.
    const criada = await servico.criar(LANCAMENTO_BASE)
    await servico.editar(criada.id_transacao, { valor: 275.5, tipo: 'Entrada' })
    await servico.excluir(criada.id_transacao)

    expect(contas.saldoDe(1)).toBe(1000)
  })

  it('varioLancamentos_saidasEEntradas_saldoRefleteASomaLiquida', async () => {
    await servico.criar({ ...LANCAMENTO_BASE, tipo: 'Entrada', valor: 3400 })
    await servico.criar({ ...LANCAMENTO_BASE, tipo: 'Saida', valor: 1400 })
    await servico.criar({ ...LANCAMENTO_BASE, tipo: 'Saida', valor: 285.5 })

    // 1000 + 3400 - 1400 - 285.50
    expect(contas.saldoDe(1)).toBe(2714.5)
  })
})
