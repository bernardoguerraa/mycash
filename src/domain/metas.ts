import { diferencaEmDias, paraDataLocal } from './datas'
import { DataInvalidaError, ValorInvalidoError } from './erros'
import { emCentavos, exigirValorPositivo } from './valores'
import type { StatusMeta } from '@/types/database'

/**
 * Regras das metas financeiras.
 *
 * O "hoje" entra por parametro em vez de vir de `new Date()` interno. Sem
 * isso, `diasRestantes` daria resultado diferente conforme o dia em que a
 * suite roda, e o teste passaria hoje para falhar sozinho amanha — o oposto
 * do R de Repeatable nas regras F.I.R.S.T.
 */

export type Meta = {
  valor_objetivo: number
  valor_atual: number
  data_limite: string
  status: StatusMeta
}

/**
 * Percentual concluido, travado em 100.
 *
 * Passar de 100% quebraria a barra de progresso na tela, e "115% concluida"
 * nao diz nada util a quem esta olhando.
 */
export function progresso(meta: Pick<Meta, 'valor_objetivo' | 'valor_atual'>): number {
  if (meta.valor_objetivo <= 0) return 0
  return Math.min((meta.valor_atual / meta.valor_objetivo) * 100, 100)
}

/** Quanto ainda falta para bater o objetivo; nunca negativo. */
export function quantoFalta(meta: Pick<Meta, 'valor_objetivo' | 'valor_atual'>): number {
  return emCentavos(Math.max(meta.valor_objetivo - meta.valor_atual, 0))
}

/**
 * Aporta um valor e decide o novo estado da meta.
 *
 * A conclusao automatica e regra de negocio, nao detalhe de tela: bater o
 * objetivo conclui a meta, independentemente de quem fez o aporte. Se ficasse
 * no componente, o web e o app precisariam repetir a mesma decisao — e
 * poderiam discordar.
 *
 * Meta ja concluida ou cancelada nao aceita aporte: o valor entraria numa
 * meta que ninguem esta mais acompanhando.
 */
export function aportar(meta: Meta, valor: number): { valor_atual: number; status: StatusMeta } {
  exigirValorPositivo(valor, 'valor do aporte')

  if (meta.status !== 'EmAndamento') {
    throw new ValorInvalidoError('So metas em andamento aceitam aporte.')
  }

  const novoTotal = emCentavos(meta.valor_atual + valor)

  return {
    valor_atual: novoTotal,
    status: novoTotal >= meta.valor_objetivo ? 'Concluida' : 'EmAndamento',
  }
}

/**
 * Dias inteiros entre hoje e a data limite. Negativo quando ja passou.
 *
 * Ambas as datas sao ancoradas a meia-noite local: "YYYY-MM-DD" no construtor
 * do JS vira meia-noite UTC, o que no Brasil (UTC-3) joga o dia para tras e
 * faria uma meta vencer um dia antes do combinado.
 */
export function diasRestantes(dataLimite: string, hoje: Date): number {
  return diferencaEmDias(hoje, paraDataLocal(dataLimite))
}

/** Meta em andamento cujo prazo ja passou. */
export function estaAtrasada(meta: Meta, hoje: Date): boolean {
  return meta.status === 'EmAndamento' && diasRestantes(meta.data_limite, hoje) < 0
}

/** A data limite tem de ser posterior ao inicio; caso contrario nao ha prazo. */
export function validarPrazo(dataInicio: string, dataLimite: string): void {
  const inicio = paraDataLocal(dataInicio)
  const limite = paraDataLocal(dataLimite)

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(limite.getTime())) {
    throw new DataInvalidaError('Informe datas validas no formato AAAA-MM-DD.')
  }

  if (limite <= inicio) {
    throw new DataInvalidaError('A data limite precisa ser posterior a data de inicio.')
  }
}
