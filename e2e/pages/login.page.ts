import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Page Object da tela de login.
 *
 * O padrao existe para separar duas responsabilidades que, juntas num arquivo
 * de teste, fazem a suite apodrecer: **como** a pagina e operada (seletor,
 * ordem de clique, espera) e **o que** o teste afirma. Quando o botao
 * "Entrar" muda de lugar, so este arquivo muda; os specs nem sabem.
 *
 * Regra de seletor: papel ARIA e texto visivel, nunca classe CSS nem XPath.
 * As classes aqui sao Tailwind (`btn-primary w-full py-3`) — mudam no primeiro
 * ajuste visual e nao descrevem funcao nenhuma. `getByRole('button', { name:
 * 'Entrar' })` descreve o que o usuario ve e sobrevive a refatoracao de
 * estilo. E, de quebra, um seletor que so funciona se a arvore de
 * acessibilidade estiver correta — teste que falha porque o rotulo sumiu esta
 * acusando um bug de acessibilidade real.
 */
export class PaginaDeLogin {
  readonly campoEmail: Locator
  readonly campoSenha: Locator
  readonly botaoEntrar: Locator
  readonly linkEsqueceuSenha: Locator
  readonly titulo: Locator

  constructor(private readonly page: Page) {
    // getByLabel funciona porque o formulario usa <label htmlFor>. Se alguem
    // trocar o label por um placeholder, este teste quebra — e deve quebrar:
    // placeholder nao e rotulo acessivel, desaparece ao digitar e nao e lido
    // por leitor de tela.
    this.campoEmail = page.getByLabel('E-mail')
    this.campoSenha = page.getByLabel('Senha')
    this.botaoEntrar = page.getByRole('button', { name: 'Entrar' })
    this.linkEsqueceuSenha = page.getByRole('link', { name: /esqueceu a senha/i })
    this.titulo = page.getByRole('heading', { name: /entrar na sua conta/i })
  }

  async abrir() {
    await this.page.goto('/login')
    await expect(this.titulo).toBeVisible()
  }

  async preencher(email: string, senha: string) {
    await this.campoEmail.fill(email)
    await this.campoSenha.fill(senha)
  }

  /**
   * Entra e espera a navegacao concluir.
   *
   * A espera e pela URL do dashboard, e nao por um `waitForTimeout`. Prazo
   * fixo e a causa mais comum de teste intermitente: curto demais quebra em
   * runner lento, longo demais faz a suite inteira arrastar.
   */
  async entrar(email: string, senha: string) {
    await this.preencher(email, senha)
    await this.botaoEntrar.click()
    await this.page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  }

  /** Tenta entrar sem esperar navegacao — para o caminho de credencial invalida. */
  async tentarEntrar(email: string, senha: string) {
    await this.preencher(email, senha)
    await this.botaoEntrar.click()
  }

  /**
   * Mensagem de erro do formulario.
   *
   * Localizada por texto visivel. Asserir sobre o estado interno do React
   * (`useState` do erro) acoplaria o teste a implementacao: migrar para
   * `useActionState` quebraria o teste com a interface intacta. O que importa
   * e que o usuario leia o aviso na tela.
   */
  erro(): Locator {
    return this.page.getByText(/invalid login credentials|credenciais|erro/i).first()
  }

  /** O browser bloqueia o submit de campo `required` vazio; isto le esse estado. */
  async emailEhValido(): Promise<boolean> {
    return this.campoEmail.evaluate((el: HTMLInputElement) => el.validity.valid)
  }
}
