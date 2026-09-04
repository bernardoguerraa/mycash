import { describe, it, expect } from 'vitest'

import { diferencaEmDias, inicioDoDia, paraDataLocal, paraISO } from './datas'

/**
 * Estes testes existem por causa de um bug que chegou a producao: no grafico
 * do painel, todo lancamento do primeiro dia do mes era contado no mes
 * anterior. A causa era `new Date('2026-09-01')`, que o JS interpreta como
 * meia-noite UTC — 31/08 as 21h no horario de Brasilia.
 */

describe('paraDataLocal', () => {
  it('paraDataLocal_dataSemHora_ancoraNaMeiaNoiteLocal', () => {
    // Arrange / Act
    const data = paraDataLocal('2026-09-01')

    // Assert: continua sendo setembro (mes 8), e nao agosto.
    expect(data.getMonth()).toBe(8)
    expect(data.getDate()).toBe(1)
  })

  it('paraDataLocal_primeiroDiaDoMes_naoRetrocedeParaOMesAnterior', () => {
    // Reproduz exatamente o bug do grafico.
    const data = paraDataLocal('2026-09-01')

    expect(data.getFullYear() * 12 + data.getMonth()).toBe(2026 * 12 + 8)
  })

  it('paraDataLocal_timestampComHora_preservaOInstante', () => {
    // Timestamp do Postgres ja e inequivoco e passa direto.
    const data = paraDataLocal('2026-09-01T15:30:00')

    expect(data.getHours()).toBe(15)
    expect(data.getMinutes()).toBe(30)
  })

  it('paraDataLocal_textoComLixoAntesDaData_naoEIdentificadoComoDataSimples', () => {
    // A regex precisa da ancora `^`: sem ela, "lixo2026-09-01" seria tratado
    // como data pura e viraria "lixo2026-09-01T00:00:00".
    expect(Number.isNaN(paraDataLocal('lixo2026-09-01').getTime())).toBe(true)
  })

  it('paraDataLocal_textoInvalido_retornaDataInvalida', () => {
    expect(Number.isNaN(paraDataLocal('nao-e-data').getTime())).toBe(true)
  })
})

describe('inicioDoDia', () => {
  it('inicioDoDia_dataComHora_zeraHoraMinutoESegundo', () => {
    const comHora = new Date(2026, 8, 4, 15, 30, 45)

    const zerada = inicioDoDia(comHora)

    expect([zerada.getHours(), zerada.getMinutes(), zerada.getSeconds()]).toEqual([0, 0, 0])
  })

  it('inicioDoDia_dataComHora_preservaODia', () => {
    const comHora = new Date(2026, 8, 4, 23, 59, 59)

    expect(inicioDoDia(comHora).getDate()).toBe(4)
  })
})

describe('diferencaEmDias', () => {
  it('diferencaEmDias_dataFutura_retornaPositivo', () => {
    expect(diferencaEmDias(new Date(2026, 8, 4), new Date(2026, 8, 14))).toBe(10)
  })

  it('diferencaEmDias_mesmoDiaComHorasDiferentes_retornaZero', () => {
    // A hora nao pode contar como um dia a mais.
    const manha = new Date(2026, 8, 4, 8, 0)
    const noite = new Date(2026, 8, 4, 23, 0)

    expect(diferencaEmDias(manha, noite)).toBe(0)
  })

  it('diferencaEmDias_dataPassada_retornaNegativo', () => {
    expect(diferencaEmDias(new Date(2026, 8, 4), new Date(2026, 8, 1))).toBe(-3)
  })

  it('diferencaEmDias_atravessandoOMes_contaCorretamente', () => {
    expect(diferencaEmDias(new Date(2026, 7, 30), new Date(2026, 8, 2))).toBe(3)
  })

  it('diferencaEmDias_atravessandoHorarioDeVerao_contaDiasInteiros', () => {
    // Um dia com 23 ou 25 horas nao pode virar 0 ou 2 dias.
    expect(diferencaEmDias(new Date(2026, 9, 15), new Date(2026, 9, 25))).toBe(10)
  })
})

describe('paraISO', () => {
  it('paraISO_data_formataComoAAAAMMDD', () => {
    expect(paraISO(new Date(2026, 8, 4))).toBe('2026-09-04')
  })

  it('paraISO_mesEDiaDeUmDigito_completaComZeroAEsquerda', () => {
    expect(paraISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('paraISO_dataComHora_usaODiaLocalENaoOUTC', () => {
    // 23h em Brasilia ja e o dia seguinte em UTC; o ISO precisa do dia local.
    expect(paraISO(new Date(2026, 8, 4, 23, 30))).toBe('2026-09-04')
  })
})
