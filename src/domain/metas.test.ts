import { describe, it, expect } from 'vitest'

import { DataInvalidaError, ValorInvalidoError } from './erros'
import {
  aportar,
  diasRestantes,
  estaAtrasada,
  progresso,
  quantoFalta,
  validarPrazo,
  type Meta,
} from './metas'

/**
 * O "hoje" e sempre injetado. Sem isso, `diasRestantes` mudaria de resultado
 * conforme o dia em que a suite roda: o teste passaria hoje e falharia sozinho
 * amanha, quebrando o R de Repeatable sem ninguem ter tocado no codigo.
 */
const HOJE = new Date(2026, 8, 4) // 4 de setembro de 2026, meia-noite local

const META_BASE: Meta = {
  valor_objetivo: 10000,
  valor_atual: 4000,
  data_limite: '2026-12-31',
  status: 'EmAndamento',
}

describe('progresso', () => {
  it('progresso_metadeDoObjetivo_retorna50PorCento', () => {
    const meta = { valor_objetivo: 10000, valor_atual: 5000 }

    expect(progresso(meta)).toBe(50)
  })

  it('progresso_valorAcimaDoObjetivo_travaEm100', () => {
    // "115% concluida" nao diz nada e estoura a barra na tela.
    const meta = { valor_objetivo: 1000, valor_atual: 1150 }

    expect(progresso(meta)).toBe(100)
  })

  it('progresso_objetivoZero_retornaZeroSemDividirPorZero', () => {
    const meta = { valor_objetivo: 0, valor_atual: 500 }

    expect(progresso(meta)).toBe(0)
  })
})

describe('quantoFalta', () => {
  it('quantoFalta_metaEmAndamento_retornaADiferenca', () => {
    expect(quantoFalta({ valor_objetivo: 10000, valor_atual: 4000 })).toBe(6000)
  })

  it('quantoFalta_objetivoJaSuperado_retornaZeroENaoNegativo', () => {
    expect(quantoFalta({ valor_objetivo: 1000, valor_atual: 1200 })).toBe(0)
  })
})

describe('aportar', () => {
  it('aportar_valorAbaixoDoObjetivo_somaEMantemEmAndamento', () => {
    // Arrange
    const meta = { ...META_BASE }

    // Act
    const resultado = aportar(meta, 1000)

    // Assert
    expect(resultado).toEqual({ valor_atual: 5000, status: 'EmAndamento' })
  })

  it('aportar_atingeExatamenteOObjetivo_concluiAMeta', () => {
    const meta = { ...META_BASE, valor_atual: 9000 }

    const resultado = aportar(meta, 1000)

    expect(resultado.status).toBe('Concluida')
  })

  it('aportar_ultrapassaOObjetivo_concluiAMeta', () => {
    const meta = { ...META_BASE, valor_atual: 9500 }

    const resultado = aportar(meta, 1000)

    expect(resultado).toEqual({ valor_atual: 10500, status: 'Concluida' })
  })

  it('aportar_valorZero_lancaValorInvalidoError', () => {
    expect(() => aportar({ ...META_BASE }, 0)).toThrow(ValorInvalidoError)
  })

  it('aportar_valorNegativo_lancaValorInvalidoError', () => {
    expect(() => aportar({ ...META_BASE }, -50)).toThrow(ValorInvalidoError)
  })

  it('aportar_metaJaConcluida_lancaValorInvalidoError', () => {
    // Dinheiro entrando numa meta que ninguem acompanha mais fica invisivel.
    const meta: Meta = { ...META_BASE, status: 'Concluida' }

    expect(() => aportar(meta, 100)).toThrow(ValorInvalidoError)
  })

  it('aportar_metaCancelada_lancaValorInvalidoError', () => {
    const meta: Meta = { ...META_BASE, status: 'Cancelada' }

    expect(() => aportar(meta, 100)).toThrow(ValorInvalidoError)
  })

  it('aportar_valorComCentavos_arredondaCorretamente', () => {
    const meta = { ...META_BASE, valor_atual: 0.1 }

    const resultado = aportar(meta, 0.2)

    expect(resultado.valor_atual).toBe(0.3)
  })
})

describe('diasRestantes', () => {
  it('diasRestantes_prazoFuturo_retornaDiasPositivos', () => {
    expect(diasRestantes('2026-09-14', HOJE)).toBe(10)
  })

  it('diasRestantes_prazoHoje_retornaZero', () => {
    expect(diasRestantes('2026-09-04', HOJE)).toBe(0)
  })

  it('diasRestantes_prazoPassado_retornaDiasNegativos', () => {
    expect(diasRestantes('2026-09-01', HOJE)).toBe(-3)
  })

  it('diasRestantes_dataSemHora_naoPerdeUmDiaPorFusoHorario', () => {
    // "YYYY-MM-DD" no construtor do JS vira meia-noite UTC; no Brasil (UTC-3)
    // isso volta para o dia anterior e o prazo venceria cedo demais.
    expect(diasRestantes('2026-09-05', HOJE)).toBe(1)
  })
})

describe('estaAtrasada', () => {
  it('estaAtrasada_emAndamentoComPrazoVencido_retornaVerdadeiro', () => {
    const meta: Meta = { ...META_BASE, data_limite: '2026-08-01' }

    expect(estaAtrasada(meta, HOJE)).toBe(true)
  })

  it('estaAtrasada_concluidaComPrazoVencido_retornaFalso', () => {
    // Concluir antes de vencer o prazo nao e atraso.
    const meta: Meta = { ...META_BASE, data_limite: '2026-08-01', status: 'Concluida' }

    expect(estaAtrasada(meta, HOJE)).toBe(false)
  })

  it('estaAtrasada_prazoNoFuturo_retornaFalso', () => {
    expect(estaAtrasada(META_BASE, HOJE)).toBe(false)
  })

  it('estaAtrasada_venceHoje_aindaNaoEstaAtrasada', () => {
    // Fronteira exata: quem tem ate hoje para bater a meta ainda esta no
    // prazo. Sem este caso, trocar `< 0` por `<= 0` passaria despercebido —
    // foi um mutante sobrevivente ate ele existir.
    const meta: Meta = { ...META_BASE, data_limite: '2026-09-04' }

    expect(estaAtrasada(meta, HOJE)).toBe(false)
  })
})

describe('validarPrazo', () => {
  it('validarPrazo_limitePosteriorAoInicio_naoLanca', () => {
    expect(() => validarPrazo('2026-09-04', '2026-12-31')).not.toThrow()
  })

  it('validarPrazo_limiteAnteriorAoInicio_lancaDataInvalidaError', () => {
    expect(() => validarPrazo('2026-12-31', '2026-09-04')).toThrow(DataInvalidaError)
  })

  it('validarPrazo_limiteIgualAoInicio_lancaDataInvalidaError', () => {
    // Prazo de zero dia nao e prazo.
    expect(() => validarPrazo('2026-09-04', '2026-09-04')).toThrow(DataInvalidaError)
  })

  it('validarPrazo_dataMalFormada_lancaDataInvalidaError', () => {
    expect(() => validarPrazo('2026-09-04', 'nao-e-data')).toThrow(DataInvalidaError)
  })
})
