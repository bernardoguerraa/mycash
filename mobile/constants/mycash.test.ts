import { describe, it, expect } from 'vitest';

import {
  dataValida,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatarTempoRelativo,
  getGreeting,
  hojeISO,
  rotuloCategoria,
  rotuloTipoConta,
  sanitizarValor,
} from './mycash';

/**
 * Formatadores e entrada de dados do app.
 *
 * Sao funcoes puras: o que chega na tela e o que sai daqui. `parseValor` nao
 * e testado neste arquivo porque agora e reexportado de @dominio/valores, ja
 * coberto pela suite do dominio — testar de novo seria manter duas suites
 * para a mesma funcao.
 */

describe('formatCurrency', () => {
  it('formatCurrency_valorPositivo_formataEmReais', () => {
    // O separador do pt-BR e um espaco nao quebravel, nao um espaco comum.
    expect(formatCurrency(1234.5).replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('formatCurrency_zero_formataSemQuebrar', () => {
    expect(formatCurrency(0).replace(/ /g, ' ')).toBe('R$ 0,00');
  });

  it('formatCurrency_valorNegativo_mantemOSinal', () => {
    expect(formatCurrency(-50)).toContain('-');
  });

  it('formatCurrency_indefinido_naoQuebraEMostraZero', () => {
    // Campo ainda nao carregado chega como undefined na primeira renderizacao.
    expect(formatCurrency(undefined as unknown as number).replace(/ /g, ' ')).toBe('R$ 0,00');
  });
});

describe('formatDate', () => {
  it('formatDate_dataSemHora_naoRetrocedeUmDiaPorFusoHorario', () => {
    // "2026-09-01" cru viraria 31/08 no horario de Brasilia.
    expect(formatDate('2026-09-01')).toMatch(/01/);
  });

  it('formatDateLong_dataSemHora_incluiOAno', () => {
    expect(formatDateLong('2026-09-04')).toMatch(/2026/);
  });

  it('formatDateLong_dataSemHora_mantemODiaCorreto', () => {
    expect(formatDateLong('2026-09-01')).toMatch(/01/);
  });
});

describe('formatarTempoRelativo', () => {
  const agora = Date.now();

  it('formatarTempoRelativo_menosDeUmMinuto_dizAgoraMesmo', () => {
    expect(formatarTempoRelativo(new Date(agora - 30_000).toISOString())).toBe('agora mesmo');
  });

  it('formatarTempoRelativo_umaHora_usaOSingular', () => {
    expect(formatarTempoRelativo(new Date(agora - 3_600_000).toISOString())).toBe('há 1 hora');
  });

  it('formatarTempoRelativo_tresHoras_usaOPlural', () => {
    expect(formatarTempoRelativo(new Date(agora - 3 * 3_600_000).toISOString())).toBe('há 3 horas');
  });

  it('formatarTempoRelativo_doisDias_escolheAFaixaDeDias', () => {
    expect(formatarTempoRelativo(new Date(agora - 2 * 86_400_000).toISOString())).toBe('há 2 dias');
  });
});

describe('sanitizarValor', () => {
  it('sanitizarValor_comLetras_removeOQueNaoCompoeNumero', () => {
    expect(sanitizarValor('R$ 150,50')).toBe('150,50');
  });

  it('sanitizarValor_pontoEVirgula_preservaOsSeparadores', () => {
    expect(sanitizarValor('1.234,56')).toBe('1.234,56');
  });
});

describe('dataValida', () => {
  it('dataValida_dataReal_retornaVerdadeiro', () => {
    expect(dataValida('2026-09-04')).toBe(true);
  });

  it('dataValida_formatoIncompleto_retornaFalso', () => {
    expect(dataValida('2026-09')).toBe(false);
  });

  it('dataValida_diaQueNaoExisteNoMes_retornaFalso', () => {
    // O construtor do JS aceita 31/02 e devolve 03/03 calado.
    expect(dataValida('2026-02-31')).toBe(false);
  });

  it('dataValida_anoBissexto_aceita29DeFevereiro', () => {
    expect(dataValida('2028-02-29')).toBe(true);
  });

  it('dataValida_29DeFevereiroEmAnoComum_retornaFalso', () => {
    expect(dataValida('2026-02-29')).toBe(false);
  });
});

describe('hojeISO', () => {
  it('hojeISO_qualquerMomento_retornaNoFormatoDaApi', () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('hojeISO_usaODiaLocalENaoOUTC', () => {
    // As 23h em Brasilia ja e o dia seguinte em UTC; o valor enviado a API
    // precisa ser o dia que a pessoa esta vendo no relogio dela.
    const hoje = new Date();
    const esperado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
      hoje.getDate()
    ).padStart(2, '0')}`;

    expect(hojeISO()).toBe(esperado);
  });
});

describe('getGreeting', () => {
  it('getGreeting_qualquerHora_retornaUmaDasTresSaudacoes', () => {
    // Le o relogio internamente, entao o teste afirma o conjunto de saidas
    // possiveis em vez de fixar uma — ancorar num horario exigiria injetar a
    // hora, e o ganho nao paga a mudanca de assinatura so para isto.
    expect(['Bom dia', 'Boa tarde', 'Boa noite']).toContain(getGreeting());
  });
});

describe('rotulos de exibicao', () => {
  it('rotuloCategoria_categoriaGravadaSemAcento_exibeComAcento', () => {
    // O banco guarda sem acento desde o inicio; trocar o valor armazenado
    // quebraria os registros existentes e os filtros que comparam string.
    expect(rotuloCategoria('Alimentacao')).toBe('Alimentação');
    expect(rotuloCategoria('Saude')).toBe('Saúde');
  });

  it('rotuloCategoria_categoriaLivreDigitadaPeloUsuario_passaIntacta', () => {
    expect(rotuloCategoria('Pet')).toBe('Pet');
  });

  it('rotuloTipoConta_poupanca_exibeComCedilhaEAcento', () => {
    expect(rotuloTipoConta('Poupanca')).toBe('Poupança');
  });

  it('rotuloTipoConta_tipoSemMapeamento_passaIntacto', () => {
    expect(rotuloTipoConta('Corrente')).toBe('Corrente');
  });
});
