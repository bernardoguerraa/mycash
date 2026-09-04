import { defineConfig } from 'vitest/config'
import path from 'path'

const alias = { '@': path.resolve(__dirname, './src') }

/**
 * Dois ambientes na mesma suite.
 *
 * O dominio (src/domain) e TypeScript puro: nao toca em DOM, entao roda em
 * `node` e nao paga o custo de montar um documento a cada arquivo. O resto
 * (adaptadores e, mais adiante, componentes com Testing Library) roda em
 * happy-dom.
 *
 * A separacao tambem funciona como barreira: se um teste de dominio um dia
 * precisar de `document`, ele quebra — e essa quebra e o sinal de que a regra
 * de negocio vazou para a camada errada.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    globals: true,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'dominio',
          globals: true,
          environment: 'node',
          include: ['src/domain/**/*.{test,spec}.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'adaptadores',
          globals: true,
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/domain/**', 'node_modules/**'],
        },
      },
    ],
  },
})
