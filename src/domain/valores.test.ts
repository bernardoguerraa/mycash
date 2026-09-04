import { describe, it, expect } from 'vitest'

import { ValorInvalidoError } from './erros'
import { emCentavos, exigirValorPositivo, parseValor } from './valores'

/**
 * `parseValor` recebe texto digitado por gente real, entao os casos de borda
 * aqui sao os formatos que aparecem no aplicativo: o teclado numerico do
 * Android oferece virgula e o do iOS oferece ponto.
 */

describe('parseValor', () => {
  it('parseValor_formatoBrasileiroComMilhar_interpretaVirgulaComoDecimal', () => {
    expect(parseValor('1.234,56')).toBe(1234.56)
  })

  it('parseValor_formatoComPontoDecimal_interpretaCorretamente', () => {
    // Teclado numerico do iOS entrega ponto.
    expect(parseValor('1234.56')).toBe(1234.56)
  })

  it('parseValor_somenteVirgula_interpretaComoDecimal', () => {
    expect(parseValor('150,50')).toBe(150.5)
  })

  it('parseValor_numeroInteiro_retornaOValor', () => {
    expect(parseValor('3400')).toBe(3400)
  })

  it('parseValor_comEspacos_ignoraOsEspacos', () => {
    expect(parseValor(' 1 234,56 ')).toBe(1234.56)
  })

  it('parseValor_stringVazia_retornaNaN', () => {
    // NaN em vez de excecao: campo vazio ainda esta sendo preenchido, nao e
    // erro a cada tecla.
    expect(parseValor('')).toBeNaN()
  })

  it('parseValor_textoNaoNumerico_retornaNaN', () => {
    expect(parseValor('abc')).toBeNaN()
  })

  it('parseValor_valorNegativo_preservaOSinal', () => {
    // Quem decide se negativo e aceitavel e exigirValorPositivo, nao o parse.
    expect(parseValor('-50')).toBe(-50)
  })
})

describe('emCentavos', () => {
  it('emCentavos_somaComResiduoBinario_arredondaParaDuasCasas', () => {
    expect(emCentavos(0.1 + 0.2)).toBe(0.3)
  })

  it('emCentavos_terceiraCasaDecimal_arredondaParaCentavos', () => {
    expect(emCentavos(10.567)).toBe(10.57)
  })

  it('emCentavos_valorJaRedondo_naoAltera', () => {
    expect(emCentavos(1500)).toBe(1500)
  })
})

describe('exigirValorPositivo', () => {
  it('exigirValorPositivo_valorPositivo_retornaOProprioValor', () => {
    expect(exigirValorPositivo(150.5)).toBe(150.5)
  })

  it('exigirValorPositivo_zero_lancaValorInvalidoError', () => {
    expect(() => exigirValorPositivo(0)).toThrow(ValorInvalidoError)
  })

  it('exigirValorPositivo_negativo_lancaValorInvalidoError', () => {
    expect(() => exigirValorPositivo(-1)).toThrow(ValorInvalidoError)
  })

  it('exigirValorPositivo_NaN_lancaValorInvalidoError', () => {
    // Campo mal preenchido chega aqui como NaN vindo do parseValor.
    expect(() => exigirValorPositivo(NaN)).toThrow(ValorInvalidoError)
  })

  it('exigirValorPositivo_infinito_lancaValorInvalidoError', () => {
    expect(() => exigirValorPositivo(Infinity)).toThrow(ValorInvalidoError)
  })

  it('exigirValorPositivo_campoNomeado_usaONomeNaMensagem', () => {
    // A mensagem chega ao usuario; precisa dizer qual campo recusou.
    expect(() => exigirValorPositivo(0, 'valor do aporte')).toThrow(/valor do aporte/)
  })
})
