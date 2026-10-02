import { defineConfig, devices } from '@playwright/test'

/**
 * Configuracao do Playwright — camada de ponta a ponta.
 *
 * Esta suite nao substitui nenhuma das outras: ela cobre a unica faixa que as
 * demais nao alcancam. O dominio tem 162 testes de unidade e o banco tem 35 de
 * integracao, e os dois passavam quando o dashboard mostrou saldo congelado em
 * producao — a causa era o Data Cache do Next envolvendo o `fetch` que o
 * supabase-js faz por baixo. Nenhum teste sem navegador veria aquilo.
 *
 * Por isso a suite e deliberadamente pequena. Cada caso aqui custa segundos de
 * navegador; validacao de valor negativo, conta bloqueada e arredondamento ja
 * estao provados em milissegundos nas camadas de baixo, e repetir aqui seria
 * pagar caro pelo mesmo resultado.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',

  // Paralelismo entre arquivos. Dentro de um arquivo os casos rodam em serie:
  // eles compartilham a sessao autenticada e tocam os mesmos dados do usuario
  // de teste.
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,

  // `test.only` esquecido num commit faria o CI passar executando um caso so.
  forbidOnly: !!process.env.CI,

  // Uma repeticao no CI, zero local. Nao e para mascarar instabilidade: e para
  // distinguir falha real de ruido de infraestrutura do runner. Teste que so
  // passa na segunda tentativa continua sendo bug, e o relatorio marca como
  // "flaky" em vez de esconder.
  retries: process.env.CI ? 1 : 0,

  // Timeout generoso porque o caminho atravessa Supabase Auth na rede.
  timeout: 60_000,
  expect: {
    // `expect` com auto-retry: o Playwright reconsulta o locator ate o prazo.
    // E o que substitui `waitForTimeout` fixo — espera arbitraria e a origem
    // mais comum de teste intermitente.
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,

    // Trace na primeira repeticao: o artefato de diagnostico que a aula pede.
    // Guarda DOM, rede, console e screenshot por passo; abre com
    // `npx playwright show-trace`. Gravar sempre encheria o disco, e gravar
    // nunca deixaria falha de CI sem evidencia.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Locale pt-BR e fuso de Sao Paulo: o app formata moeda e data por
    // locale. Com o padrao en-US o teste compararia "R$ 1.000,00" com
    // "$1,000.00" e falharia por motivo que nao existe em producao.
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Sobe o servidor Next antes da suite.
   *
   * `reuseExistingServer` fora do CI: se ja houver um `npm run dev` aberto, o
   * Playwright usa aquele em vez de subir outro na mesma porta.
   */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
