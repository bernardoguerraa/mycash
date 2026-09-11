import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Config separada da suite de unidade.
 *
 * Motivo: `npm test` precisa continuar rodando em milissegundos e sem Docker.
 * Misturar as duas faria toda execucao de unidade esperar um container subir —
 * e o feedback rapido e justamente o que sustenta o ciclo de TDD.
 *
 * Aqui o custo e assumido: banco real, persistencia real, efeito colateral
 * observavel. Roda com `npm run test:integracao`.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integracao/**/*.test.ts'],
    globalSetup: ['tests/integracao/setup-global.ts'],
    // Subir o container passa de 5s em maquina fria; o padrao de 5s derrubaria
    // a suite antes de ela comecar.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Quatro forks: e o paralelismo que a estrategia de banco por worker
    // sustenta, e o numero que o roteiro da aula usa como meta.
    // No Vitest 4 as opcoes de pool sao de primeiro nivel; `poolOptions` foi
    // removido.
    pool: 'forks',
    maxWorkers: 4,
  },
})
