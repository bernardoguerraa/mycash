import { diferencaEmDias, paraDataLocal } from './datas'
import { emCentavos } from './valores'
import type { TipoLembrete, TipoTransacao } from '@/types/database'

/**
 * Agregacoes do painel: totais do mes, serie de seis meses e agrupamento de
 * lembretes por vencimento.
 *
 * Como em metas.ts, o "agora" entra por parametro. Sao as funcoes que mais
 * dependem de calendario, e portanto as que mais falhariam de forma
 * intermitente se lessem o relogio por conta propria — o teste passaria o mes
 * inteiro e quebraria na virada.
 */

export type LancamentoResumo = {
  tipo: TipoTransacao
  valor: number
  data_transacao: string
}

export type PontoMensal = {
  mes: string
  ano: number
  entradas: number
  saidas: number
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Soma o modulo dos lancamentos de um tipo. */
export function totalPorTipo(lancamentos: LancamentoResumo[], tipo: TipoTransacao): number {
  return emCentavos(
    lancamentos
      .filter((l) => l.tipo === tipo)
      .reduce((soma, l) => soma + Math.abs(l.valor || 0), 0)
  )
}

/**
 * Serie dos seis meses que terminam no mes de referencia.
 *
 * Mes sem lancamento fica zerado de proposito. O grafico do web preenche os
 * meses anteriores com uma aproximacao do mes corrente, o que desenha
 * movimento que nunca existiu — um grafico que inventa dado e pior do que um
 * grafico vazio, porque parece verdadeiro.
 */
export function serieMensal(lancamentos: LancamentoResumo[], referencia: Date): PontoMensal[] {
  const serie = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date(referencia.getFullYear(), referencia.getMonth() - (5 - i), 1)
    return {
      mes: MESES[mes.getMonth()],
      ano: mes.getFullYear(),
      chave: chaveDoMes(mes.getFullYear(), mes.getMonth()),
      entradas: 0,
      saidas: 0,
    }
  })

  const porChave = new Map(serie.map((ponto) => [ponto.chave, ponto]))

  for (const lancamento of lancamentos) {
    // paraDataLocal e obrigatorio aqui: com `new Date` cru, todo lancamento do
    // primeiro dia do mes caia no balde do mes anterior.
    const data = paraDataLocal(lancamento.data_transacao)

    // Data invalida produz chave NaN, que nao existe no Map — o proprio
    // `!balde` descarta o lancamento. Um guard explicito de NaN aqui seria
    // codigo inalcancavel (o teste de mutacao o apontou como sobrevivente).
    const balde = porChave.get(chaveDoMes(data.getFullYear(), data.getMonth()))
    if (!balde) continue

    const modulo = Math.abs(lancamento.valor || 0)
    if (lancamento.tipo === 'Entrada') balde.entradas += modulo
    else balde.saidas += modulo
  }

  return serie.map(({ mes, ano, entradas, saidas }) => ({
    mes,
    ano,
    entradas: emCentavos(entradas),
    saidas: emCentavos(saidas),
  }))
}

/** Ano e mes num inteiro unico, para servir de chave sem ambiguidade. */
function chaveDoMes(ano: number, mes: number): number {
  return ano * 12 + mes
}

// ============================================================================
// Lembretes
// ============================================================================

export type GrupoVencimento = 'vencidos' | 'proximos' | 'futuros'

/**
 * Classifica um vencimento em vencido, proximo (ate 7 dias) ou futuro.
 *
 * Vence hoje conta como "proximo", nao como "vencido": ainda da tempo de
 * pagar, e mandar para a lista de vencidos assustaria sem motivo.
 */
export function grupoDeVencimento(dataVencimento: string, hoje: Date): GrupoVencimento {
  const dias = diferencaEmDias(hoje, paraDataLocal(dataVencimento))

  if (dias < 0) return 'vencidos'
  if (dias <= 7) return 'proximos'
  return 'futuros'
}

/** Soma os lembretes ativos de um tipo — o previsto a pagar ou a receber. */
export function totalPrevisto(
  lembretes: { tipo: TipoLembrete; valor_previsto: number; ativo: boolean }[],
  tipo: TipoLembrete
): number {
  return emCentavos(
    lembretes
      .filter((l) => l.ativo && l.tipo === tipo)
      .reduce((soma, l) => soma + (l.valor_previsto || 0), 0)
  )
}
