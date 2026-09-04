import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Testes do app, em ambiente `node`.
 *
 * O que e testado aqui e a logica que nao depende do React Native: o cliente
 * da API, os formatadores e os repositorios. As regras de negocio em si vivem
 * em ../src/domain, compartilhadas com o web e testadas la — nao ha por que
 * duplicar a suite.
 *
 * Componentes de tela ficam de fora por enquanto: exigiriam
 * @testing-library/react-native e um runtime de RN, o que muda a natureza dos
 * testes (passam a ser de integracao de UI, o degrau seguinte da piramide).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@dominio': path.resolve(__dirname, '../src/domain'),
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', '.expo/**'],
  },
});
