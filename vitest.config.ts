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
    /**
     * Cobertura medida sobre `src/domain` — a camada que a suite de unidade
     * tem como alvo. Apontar para `src/` inteiro produziria um numero baixo e
     * sem significado: paginas e componentes do Next nao sao exercitados por
     * teste de unidade, e diluir o denominador com eles so esconderia buraco
     * real no dominio.
     *
     * `tipos.ts`, `portas.ts` e `erros.ts` ficam fora do denominador:
     * declaracoes de tipo somem na compilacao e as classes de erro sao
     * medidas indiretamente pelos casos que as disparam.
     *
     * O limite abaixo e trava, nao meta. Cobertura alta nao prova que o teste
     * verifica alguma coisa — a Lei de Goodhart vale aqui, e quem responde por
     * isso e o Stryker (92% de score de mutacao). O relatorio serve para achar
     * ramo que nunca foi executado.
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/domain/**/*.ts'],
      exclude: [
        'src/domain/**/*.{test,spec}.ts',
        'src/domain/tipos.ts',
        'src/domain/portas.ts',
        'src/domain/erros.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
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
          // tests/integracao tem config propria e exige Docker; `npm test`
          // precisa continuar rodando em milissegundos e sem container.
          exclude: ['src/domain/**', 'tests/integracao/**', 'node_modules/**'],
        },
      },
    ],
  },
})
