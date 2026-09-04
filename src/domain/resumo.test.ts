import { describe, it, expect } from 'vitest'

import {
  grupoDeVencimento,
  serieMensal,
  totalPorTipo,
  totalPrevisto,
  type LancamentoResumo,
} from './resumo'

/** Referencia fixa: 4 de setembro de 2026. */
const HOJE = new Date(2026, 8, 4)

const lancamento = (
  tipo: 'Entrada' | 'Saida',
  valor: number,
  data: string
): LancamentoResumo => ({ tipo, valor, data_transacao: data })

describe('totalPorTipo', () => {
  it('totalPorTipo_entradas_somaApenasAsEntradas', () => {
    // Arrange
    const lancamentos = [
      lancamento('Entrada', 3400, '2026-09-01'),
      lancamento('Saida', 1400, '2026-09-02'),
      lancamento('Entrada', 900, '2026-09-03'),
    ]

    // Act
    const total = totalPorTipo(lancamentos, 'Entrada')

    // Assert
    expect(total).toBe(4300)
  })

  it('totalPorTipo_saidaGravadaComSinalNegativo_somaOModulo', () => {
    const lancamentos = [lancamento('Saida', -1400, '2026-09-02')]

    expect(totalPorTipo(lancamentos, 'Saida')).toBe(1400)
  })

  it('totalPorTipo_listaVazia_retornaZero', () => {
    expect(totalPorTipo([], 'Entrada')).toBe(0)
  })
})

describe('serieMensal', () => {
  it('serieMensal_qualquerEntrada_retornaSempreSeisMeses', () => {
    const serie = serieMensal([], HOJE)

    expect(serie).toHaveLength(6)
  })

  it('serieMensal_referenciaSetembro_terminaNoMesCorrente', () => {
    const serie = serieMensal([], HOJE)

    expect(serie.map((p) => p.mes)).toEqual(['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'])
  })

  it('serieMensal_semLancamentos_deixaOsMesesZerados', () => {
    // Zerado de proposito: o grafico do web aproxima os meses anteriores a
    // partir do atual, desenhando movimento que nunca existiu.
    const serie = serieMensal([], HOJE)

    expect(serie.every((p) => p.entradas === 0 && p.saidas === 0)).toBe(true)
  })

  it('serieMensal_lancamentosNoMesCorrente_caemNoUltimoBalde', () => {
    const lancamentos = [
      lancamento('Entrada', 3400, '2026-09-02'),
      lancamento('Saida', 1400, '2026-09-03'),
    ]

    const serie = serieMensal(lancamentos, HOJE)

    expect(serie[5]).toMatchObject({ mes: 'Set', entradas: 3400, saidas: 1400 })
  })

  it('serieMensal_lancamentosEmMesesDiferentes_vaoParaSeusProprioBaldes', () => {
    const lancamentos = [
      lancamento('Entrada', 1000, '2026-07-15'),
      lancamento('Entrada', 2000, '2026-09-01'),
    ]

    const serie = serieMensal(lancamentos, HOJE)

    expect(serie[3]).toMatchObject({ mes: 'Jul', entradas: 1000 })
    expect(serie[5]).toMatchObject({ mes: 'Set', entradas: 2000 })
  })

  it('serieMensal_lancamentoForaDaJanela_eIgnorado', () => {
    // Janeiro esta a mais de seis meses da referencia.
    const lancamentos = [lancamento('Entrada', 9999, '2026-01-10')]

    const serie = serieMensal(lancamentos, HOJE)

    expect(serie.every((p) => p.entradas === 0)).toBe(true)
  })

  it('serieMensal_viradaDeAno_mantemOAnoCorretoEmCadaMes', () => {
    // Referencia em fevereiro/2026: a serie comeca em setembro/2025.
    const fevereiro = new Date(2026, 1, 10)

    const serie = serieMensal([], fevereiro)

    expect(serie[0]).toMatchObject({ mes: 'Set', ano: 2025 })
    expect(serie[5]).toMatchObject({ mes: 'Fev', ano: 2026 })
  })

  it('serieMensal_dataInvalida_eIgnoradaSemQuebrar', () => {
    const lancamentos = [
      { tipo: 'Entrada' as const, valor: 100, data_transacao: 'sem-data' },
      lancamento('Entrada', 500, '2026-09-01'),
    ]

    const serie = serieMensal(lancamentos, HOJE)

    expect(serie[5].entradas).toBe(500)
  })
})

describe('grupoDeVencimento', () => {
  it('grupoDeVencimento_ontem_classificaComoVencido', () => {
    expect(grupoDeVencimento('2026-09-03', HOJE)).toBe('vencidos')
  })

  it('grupoDeVencimento_hoje_classificaComoProximo', () => {
    // Vence hoje ainda da tempo de pagar; mandar para vencidos assusta sem
    // motivo.
    expect(grupoDeVencimento('2026-09-04', HOJE)).toBe('proximos')
  })

  it('grupoDeVencimento_daquiASeteDias_classificaComoProximo', () => {
    expect(grupoDeVencimento('2026-09-11', HOJE)).toBe('proximos')
  })

  it('grupoDeVencimento_daquiAOitoDias_classificaComoFuturo', () => {
    // Fronteira exata da janela de sete dias.
    expect(grupoDeVencimento('2026-09-12', HOJE)).toBe('futuros')
  })
})

describe('totalPrevisto', () => {
  const lembretes = [
    { tipo: 'ContaPagar' as const, valor_previsto: 1240.9, ativo: true },
    { tipo: 'ContaPagar' as const, valor_previsto: 189.7, ativo: true },
    { tipo: 'ContaPagar' as const, valor_previsto: 500, ativo: false },
    { tipo: 'ContaReceber' as const, valor_previsto: 900, ativo: true },
  ]

  it('totalPrevisto_contasAPagarAtivas_somaApenasAsAtivas', () => {
    expect(totalPrevisto(lembretes, 'ContaPagar')).toBe(1430.6)
  })

  it('totalPrevisto_lembreteInativo_ficaDeForaDaSoma', () => {
    // Desativar um lembrete tem de tirar o valor da previsao.
    const soInativo = [{ tipo: 'ContaPagar' as const, valor_previsto: 500, ativo: false }]

    expect(totalPrevisto(soInativo, 'ContaPagar')).toBe(0)
  })

  it('totalPrevisto_contasAReceber_naoMisturaComAsAPagar', () => {
    expect(totalPrevisto(lembretes, 'ContaReceber')).toBe(900)
  })
})
