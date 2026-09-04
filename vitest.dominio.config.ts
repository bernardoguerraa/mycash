import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Config usada apenas pelo teste de mutacao (stryker.config.json).
 *
 * O runner do Stryker nao seleciona um `project` da config principal, entao o
 * dominio ganha uma config propria e enxuta: so os testes puros, ambiente
 * node, sem happy-dom. Mutar o adaptador exigiria banco e rede, e o resultado
 * diria mais sobre a infraestrutura do que sobre as assercoes.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/domain/**/*.{test,spec}.ts'],
  },
})
