import type { TestProject } from 'vitest/node'

import { derrubarBanco, subirBanco } from './banco-efemero'

/**
 * globalSetup do Vitest: roda uma vez por execucao, antes de qualquer worker.
 *
 * O container sobe aqui, e nao em cada arquivo de teste, porque iniciar um
 * Postgres custa segundos — repetir por arquivo transformaria uma suite de
 * segundos numa de minutos.
 *
 * A URL vai para os testes por `provide`, e nao por `process.env`. O
 * globalSetup roda no processo principal e os testes rodam em processos
 * filhos (`pool: 'forks'`): variavel de ambiente definida aqui so chega la se
 * o worker for criado depois, o que o Vitest nao garante — ele pode
 * pre-aquecer o pool. Na maquina de quem desenvolve funcionava; no runner do
 * CI, com outro numero de nucleos, o worker subia sem a variavel e o teste
 * tentava conectar em localhost:5432.
 */
export async function setup(project: TestProject) {
  project.provide('urlBancoTeste', await subirBanco())

  return async () => {
    await derrubarBanco()
  }
}

declare module 'vitest' {
  interface ProvidedContext {
    urlBancoTeste: string
  }
}
