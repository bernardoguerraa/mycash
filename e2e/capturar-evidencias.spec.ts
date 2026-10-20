import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

import { PaginaDoDashboard } from './pages/dashboard.page'
import { PaginaDeLogin } from './pages/login.page'
import { PaginaDeTransacoes } from './pages/transacoes.page'
import { MOTIVO_SEM_CREDENCIAL, credenciais, descricaoDeTeste } from './apoio/credenciais'

/**
 * Captura as evidencias visuais do relatorio parcial.
 *
 *   npx playwright test e2e/capturar-evidencias.spec.ts
 *
 * Nao e teste de regressao: e um roteiro automatizado que percorre o processo
 * de negocio principal e grava um print de cada etapa em docs/evidencias/.
 * Reaproveita os mesmos Page Objects da suite E2E, entao as capturas nao
 * podem divergir do que os testes exercitam — se a tela muda, os dois quebram
 * juntos.
 *
 * Gerar print por script em vez de tirar a mao tem uma razao pratica: o
 * relatorio precisa ser refeito a cada entrega, e captura manual envelhece
 * sem ninguem perceber.
 */

const DIR = 'docs/evidencias'
const creds = credenciais()

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true })
})

test.describe('evidencias do processo de negocio', () => {
  test.skip(!creds, MOTIVO_SEM_CREDENCIAL)
  test.describe.configure({ mode: 'serial' })

  test('captura o fluxo completo de lancamento', async ({ page }) => {
    // Viewport fixo: print com largura variavel desalinha as figuras do
    // relatorio e muda o recorte entre execucoes.
    await page.setViewportSize({ width: 1440, height: 900 })

    const login = new PaginaDeLogin(page)
    const dashboard = new PaginaDoDashboard(page)
    const transacoes = new PaginaDeTransacoes(page)
    const descricao = descricaoDeTeste('Evidencia relatorio')

    // --- Etapa 1: tela de login ---
    await login.abrir()
    await page.screenshot({ path: `${DIR}/01-login.png`, fullPage: false })

    // --- Etapa 2: caminho alternativo — credencial invalida ---
    await login.tentarEntrar('nao-existe@mycash.dev', 'senha-errada-123')
    await expect(login.erro()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: `${DIR}/02-login-erro.png`, fullPage: false })

    // --- Etapa 3: dashboard autenticado (caminho feliz) ---
    await page.reload()
    await login.entrar(creds!.email, creds!.senha)
    await dashboard.abrir()
    // O Recharts anima a entrada do grafico. Sem esta pausa o print pega a
    // curva pela metade, e tira o cursor de cima para o tooltip nao aparecer
    // sobreposto aos dados.
    await page.mouse.move(0, 0)
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${DIR}/03-dashboard.png`, fullPage: true })

    const saldoAntes = await dashboard.saldoConsolidado()

    // --- Etapa 4: lista de transacoes ---
    await transacoes.abrir()
    await page.screenshot({ path: `${DIR}/04-transacoes-lista.png`, fullPage: false })

    // --- Etapa 5: formulario de lancamento ---
    await transacoes.abrirModal()
    await transacoes.preencher({
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao,
      valor: 137.42,
    })
    await page.screenshot({ path: `${DIR}/05-modal-lancamento.png`, fullPage: false })

    // --- Etapa 6: transacao persistida na lista ---
    await transacoes.salvar()
    expect(await transacoes.contemDescricao(descricao)).toBe(true)
    await page.screenshot({ path: `${DIR}/06-transacao-criada.png`, fullPage: false })

    // --- Etapa 7: o saldo consolidado refletindo o lancamento ---
    await dashboard.abrir()
    await dashboard.recarregar()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(1800)
    const saldoDepois = await dashboard.saldoConsolidado()
    expect(saldoDepois).toBeCloseTo(saldoAntes - 137.42, 2)
    await page.screenshot({ path: `${DIR}/07-saldo-atualizado.png`, fullPage: false })

    console.log(`\nSaldo antes:  R$ ${saldoAntes.toFixed(2)}`)
    console.log(`Saldo depois: R$ ${saldoDepois.toFixed(2)}`)
    console.log(`Delta:        R$ ${(saldoAntes - saldoDepois).toFixed(2)}\n`)

    // --- Etapa 8: demais telas do dominio ---
    for (const [rota, arquivo] of [
      ['/contas', '08-contas'],
      ['/metas', '09-metas'],
      ['/lembretes', '10-lembretes'],
      ['/notificacoes', '11-notificacoes'],
    ] as const) {
      await page.goto(rota)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: `${DIR}/${arquivo}.png`, fullPage: false })
    }

    // --- Teardown: o print nao justifica deixar lixo no banco ---
    await transacoes.abrir()
    await transacoes.excluir(descricao)
  })

  test('captura o tema claro', async ({ page }) => {
    // O tema alternavel foi um dos entregaveis; print no escuro so nao mostra.
    await page.setViewportSize({ width: 1440, height: 900 })
    const login = new PaginaDeLogin(page)
    const dashboard = new PaginaDoDashboard(page)

    await login.abrir()
    await login.entrar(creds!.email, creds!.senha)
    await dashboard.abrir()

    const alternar = page.getByRole('button', { name: /tema|claro|escuro/i }).first()
    if (await alternar.count() > 0) {
      await alternar.click()
      await page.mouse.move(0, 0)
      await page.waitForTimeout(1800)
      await page.screenshot({ path: `${DIR}/12-tema-claro.png`, fullPage: false })
    }
  })
})
