import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from 'pluggy-sdk'

import {
  mapAccountNumber,
  mapAccountType,
  mapTransactionCategoria,
  mapTransactionTipo,
} from './mapping'

/**
 * Testes da camada de traducao do Open Finance.
 *
 * Aqui o MyCash esta do lado do **consumidor**: a Pluggy e um provedor de
 * terceiro, e nada impede que ela mande um `subtype` que nunca vimos ou um
 * campo faltando. Estas quatro funcoes sao a fronteira onde o vocabulario
 * dela vira o nosso — e sao puras, entao dao para testar sem rede, sem chave
 * de API e sem sandbox.
 *
 * O que estes casos protegem e justamente o comportamento diante do
 * inesperado: o *tolerant reader* do ADR aplicado na direcao contraria. Se um
 * dia a Pluggy introduzir `PAYMENT_ACCOUNT`, a conta tem de virar 'Corrente',
 * e nao `undefined` gravado no banco.
 */

/** Monta so os campos que a funcao le; o resto do tipo da SDK e ruido aqui. */
function conta(campos: Record<string, unknown>): Account {
  return campos as unknown as Account
}

function transacao(campos: Record<string, unknown>): Transaction {
  return campos as unknown as Transaction
}

describe('mapAccountType', () => {
  it.each([
    ['CHECKING_ACCOUNT', 'Corrente'],
    ['SAVINGS_ACCOUNT', 'Poupanca'],
    ['CREDIT_CARD', 'Cartao de Credito'],
    ['LOAN', 'Emprestimo'],
    ['INVESTMENT', 'Investimento'],
  ])('mapAccountType_subtype%s_viraTipoConhecido', (subtype, esperado) => {
    expect(mapAccountType(conta({ subtype, type: 'BANK' }))).toBe(esperado)
  })

  it('mapAccountType_subtypeDesconhecidoEmContaDeCredito_caiEmCartaoDeCredito', () => {
    // Campo novo do provedor nao pode virar `undefined` no nosso banco:
    // `tipo_conta` e enum no Postgres e o insert quebraria.
    const acc = conta({ subtype: 'PAYMENT_ACCOUNT', type: 'CREDIT' })

    expect(mapAccountType(acc)).toBe('Cartao de Credito')
  })

  it('mapAccountType_subtypeDesconhecidoEmContaBancaria_caiEmCorrente', () => {
    const acc = conta({ subtype: 'PAYMENT_ACCOUNT', type: 'BANK' })

    expect(mapAccountType(acc)).toBe('Corrente')
  })

  it('mapAccountType_semSubtype_decidePeloType', () => {
    // `subtype` nao existe no tipo publico da SDK: e campo que a Pluggy
    // devolve mas nao documenta. Pode simplesmente nao vir.
    expect(mapAccountType(conta({ type: 'CREDIT' }))).toBe('Cartao de Credito')
    expect(mapAccountType(conta({ type: 'BANK' }))).toBe('Corrente')
  })
})

describe('mapAccountNumber', () => {
  it('mapAccountNumber_comTransferNumber_prefereODadoBancario', () => {
    // transferNumber e o numero com agencia, o que o usuario reconhece no
    // extrato. Ganha de `number` quando os dois vem.
    const acc = conta({
      id: 'acc-1234567890',
      number: '9999',
      bankData: { transferNumber: '0001/12345-6' },
    })

    expect(mapAccountNumber(acc)).toBe('0001/12345-6')
  })

  it('mapAccountNumber_semTransferNumber_usaONumeroDaConta', () => {
    const acc = conta({ id: 'acc-1234567890', number: '12345-6' })

    expect(mapAccountNumber(acc)).toBe('12345-6')
  })

  it('mapAccountNumber_numeroVemComoNumero_convertidoParaTexto', () => {
    // `numero_conta` e `text` no schema. Se a Pluggy mandar numero, gravar o
    // tipo errado so apareceria em producao.
    const acc = conta({ id: 'acc-1234567890', number: 123456 })

    const resultado = mapAccountNumber(acc)

    expect(resultado).toBe('123456')
    expect(typeof resultado).toBe('string')
  })

  it('mapAccountNumber_semNenhumIdentificador_usaOPrefixoDoIdPluggy', () => {
    // Ultimo recurso: `numero_conta` e obrigatorio na tabela, entao alguma
    // coisa precisa ir. Oito caracteres do id da Pluggy resolvem.
    const acc = conta({ id: 'abcdefgh-ijkl-mnop' })

    expect(mapAccountNumber(acc)).toBe('abcdefgh')
  })
})

describe('mapTransactionTipo', () => {
  it('mapTransactionTipo_valorNegativo_viraSaida', () => {
    expect(mapTransactionTipo(transacao({ amount: -150.5 }))).toBe('Saida')
  })

  it('mapTransactionTipo_valorPositivo_viraEntrada', () => {
    expect(mapTransactionTipo(transacao({ amount: 3200 }))).toBe('Entrada')
  })

  it('mapTransactionTipo_valorZero_viraEntrada', () => {
    // Fronteira do `< 0`. Zero cair em Entrada e consequencia da comparacao,
    // nao decisao de negocio — mas o domino recusa valor zero antes de
    // persistir (ValorInvalidoError), entao nunca chega ao banco.
    expect(mapTransactionTipo(transacao({ amount: 0 }))).toBe('Entrada')
  })
})

describe('mapTransactionCategoria', () => {
  it('mapTransactionCategoria_comCategoria_usaADaPluggy', () => {
    const tx = transacao({ category: 'Supermercado', type: 'DEBIT' })

    expect(mapTransactionCategoria(tx)).toBe('Supermercado')
  })

  it('mapTransactionCategoria_semCategoriaEmDebito_caiEmOutrosSaida', () => {
    // A Pluggy so classifica parte das transacoes; `category` vem null com
    // frequencia. Categoria vazia quebraria o filtro da tela.
    const tx = transacao({ category: null, type: 'DEBIT' })

    expect(mapTransactionCategoria(tx)).toBe('Outros (Saida)')
  })

  it('mapTransactionCategoria_semCategoriaEmCredito_caiEmOutrosEntrada', () => {
    const tx = transacao({ category: null, type: 'CREDIT' })

    expect(mapTransactionCategoria(tx)).toBe('Outros (Entrada)')
  })

  it('mapTransactionCategoria_categoriaVazia_tratadaComoAusente', () => {
    // String vazia e falsy: cai no mesmo ramo do null, de proposito.
    const tx = transacao({ category: '', type: 'DEBIT' })

    expect(mapTransactionCategoria(tx)).toBe('Outros (Saida)')
  })
})
