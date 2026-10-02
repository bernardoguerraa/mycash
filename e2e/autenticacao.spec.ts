import { expect, test } from '@playwright/test'

import { PaginaDeLogin } from './pages/login.page'

/**
 * Cenario critico 1 — Portal de Autenticacao.
 *
 * E o segundo criterio de selecao do roteiro da aula (Identity & Onboarding):
 * mecanismo de entrada cuja indisponibilidade bloqueia integralmente o acesso
 * a aplicacao. No MyCash nao ha caminho alternativo — toda rota de dado esta
 * atras da sessao do Supabase Auth, e a RLS filtra por usuario. Login fora do
 * ar e o app inteiro fora do ar.
 *
 * Este arquivo roda sem nenhum dado semeado e sem credencial valida: verifica
 * o portao, nao o que esta atras dele. Por isso e o unico que executa em
 * qualquer maquina com `npx playwright test` e nada mais.
 */

test.describe('portal de autenticacao', () => {
  test('login_paginaCarregada_apresentaFormularioAcessivel', async ({ page }) => {
    const login = new PaginaDeLogin(page)

    await login.abrir()

    // Os tres locators sao por rotulo e papel. Se algum falhar, a arvore de
    // acessibilidade regrediu — e isso e bug, nao ajuste de teste.
    await expect(login.campoEmail).toBeVisible()
    await expect(login.campoSenha).toBeVisible()
    await expect(login.botaoEntrar).toBeEnabled()
  })

  test('login_senhaDigitada_naoFicaVisivelNaTela', async ({ page }) => {
    // `type="password"` e o que impede a senha de aparecer para quem olha a
    // tela por cima do ombro. Trocar para `type="text"` num ajuste de
    // "mostrar senha" sem toggle passaria despercebido em code review.
    const login = new PaginaDeLogin(page)
    await login.abrir()

    await login.campoSenha.fill('senha-secreta')

    await expect(login.campoSenha).toHaveAttribute('type', 'password')
  })

  test('login_emailMalformado_bloqueadoPelaValidacaoDoNavegador', async ({ page }) => {
    const login = new PaginaDeLogin(page)
    await login.abrir()

    await login.preencher('isso-nao-e-email', 'qualquercoisa')

    // `type="email"` + `required` fazem o proprio navegador barrar o submit.
    // Verificar aqui garante que a primeira linha de defesa existe antes de
    // qualquer requisicao sair da maquina.
    expect(await login.emailEhValido()).toBe(false)
  })

  test('login_credencialInvalida_exibeErroEPermaneceNoLogin', async ({ page }) => {
    const login = new PaginaDeLogin(page)
    await login.abrir()

    await login.tentarEntrar('nao-existe@mycash.dev', 'senha-errada-123')

    // Duas asserções, e as duas importam:
    // 1. o erro aparece — silencio deixaria o usuario sem saber o que houve;
    // 2. a URL continua em /login — redirecionar para o dashboard com sessao
    //    invalida seria falha de autorizacao, nao de usabilidade.
    await expect(login.erro()).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login_rotaProtegidaSemSessao_redirecionaParaLogin', async ({ page }) => {
    // O teste que realmente fecha o portao: acessar /dashboard direto, sem
    // sessao. Se o middleware falhar, isto passa a renderizar a tela e o
    // vazamento aparece aqui — nenhuma camada abaixo enxerga middleware.
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
  })

  test('recuperarSenha_linkDoLogin_levaAoFluxoDeRecuperacao', async ({ page }) => {
    // Recuperacao de senha entra no mesmo criterio do slide: rotina critica
    // de acesso. Quebrada, o usuario que esqueceu a senha perde a conta.
    const login = new PaginaDeLogin(page)
    await login.abrir()

    await login.linkEsqueceuSenha.click()

    await expect(page).toHaveURL(/recuperar-senha/)
  })
})
