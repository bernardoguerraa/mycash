import { derrubarBanco, subirBanco } from './banco-efemero'

/**
 * globalSetup do Vitest: roda uma vez por execucao, antes de qualquer worker.
 *
 * O container sobe aqui, e nao em cada arquivo de teste, porque iniciar um
 * Postgres custa segundos — repetir por arquivo transformaria uma suite de
 * segundos numa de minutos. A URL vai para os workers por variavel de
 * ambiente, que e o canal que o Vitest garante entre processos.
 */
export async function setup() {
  const url = await subirBanco()
  process.env.URL_BANCO_TESTE = url
  return async () => {
    await derrubarBanco()
  }
}
