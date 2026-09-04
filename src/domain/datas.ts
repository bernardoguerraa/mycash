/**
 * Conversao de datas vindas do banco e dos formularios.
 *
 * Existe por causa de um bug concreto: `new Date('2026-09-01')` e interpretado
 * como meia-noite UTC, que no horario de Brasilia (UTC-3) e 31/08 as 21h. O
 * resultado e que todo lancamento do primeiro dia do mes caia no mes anterior
 * — o grafico do painel contava o salario de setembro dentro de agosto.
 *
 * Data com hora explicita (timestamp do Postgres) ja e inequivoca e passa
 * direto; so a forma "YYYY-MM-DD" precisa da ancora local.
 */

const SOMENTE_DATA = /^\d{4}-\d{2}-\d{2}$/

/** Interpreta a data no fuso local, nunca em UTC. */
export function paraDataLocal(valor: string): Date {
  return new Date(SOMENTE_DATA.test(valor) ? `${valor}T00:00:00` : valor)
}

/** Meia-noite local do dia informado — util para comparar dias inteiros. */
export function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate())
}

/** Diferenca em dias inteiros entre duas datas, ignorando a hora. */
export function diferencaEmDias(de: Date, ate: Date): number {
  const UM_DIA = 86_400_000
  return Math.round((inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / UM_DIA)
}

/** Hoje no formato YYYY-MM-DD, que e o que a API espera. */
export function paraISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}
