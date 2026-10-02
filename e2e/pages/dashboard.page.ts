import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Page Object do dashboard.
 *
 * Os cartoes de resumo sao localizados por `role=group` + nome acessivel, que
 * e exatamente o que `aria-label={stat.label}` declara em
 * `src/app/(dashboard)/dashboard/page.tsx`. Antes deste trabalho eles eram
 * `<div class="card card-hover p-5 ...">` — invisiveis para leitor de tela e
 * impossiveis de localizar sem prender o teste a classe do Tailwind.
 */
export class PaginaDoDashboard {
  readonly saudacao: Locator

  constructor(private readonly page: Page) {
    this.saudacao = page.getByRole('heading', { level: 2 })
  }

  async abrir() {
    await this.page.goto('/dashboard')
    await expect(this.cartao('Saldo Total')).toBeVisible()
  }

  /** O cartao inteiro, pelo nome acessivel. */
  cartao(rotulo: string): Locator {
    return this.page.getByRole('group', { name: rotulo })
  }

  /**
   * Valor exibido num cartao, como string ja formatada ("R$ 1.250,00").
   *
   * Le o texto renderizado, e nao o estado do React nem a resposta da API. E a
   * diferenca que o slide 1.6 descreve: asserir sobre estado interno acopla o
   * teste a implementacao, e o dashboard migrou de Client para Server
   * Component no meio do projeto. Teste de comportamento sobrevive a isso.
   */
  async valorDoCartao(rotulo: string): Promise<string> {
    const texto = await this.cartao(rotulo).locator('[data-valor]').innerText()
    return texto.trim()
  }

  /**
   * O mesmo valor convertido para numero.
   *
   * "R$ 1.250,00" -> 1250. Converter aqui, e nao no spec, mantem a asserção do
   * teste legivel: `expect(saldoDepois).toBe(saldoAntes - 150)` em vez de uma
   * expressao de parsing no meio do Assert.
   */
  async saldoConsolidado(): Promise<number> {
    return this.paraNumero(await this.valorDoCartao('Saldo Total'))
  }

  async receitasDoMes(): Promise<number> {
    return this.paraNumero(await this.valorDoCartao('Receitas do Mês'))
  }

  async despesasDoMes(): Promise<number> {
    return this.paraNumero(await this.valorDoCartao('Despesas do Mês'))
  }

  /** "R$ 1.250,00" ou "-R$ 80,50" -> number. */
  private paraNumero(formatado: string): number {
    const negativo = /^-|^−/.test(formatado.trim())
    const digitos = formatado
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
    const valor = Number.parseFloat(digitos.replace(/^-/, ''))
    if (Number.isNaN(valor)) {
      throw new Error(`Valor do cartao nao reconhecido: "${formatado}"`)
    }
    return negativo ? -valor : valor
  }

  /**
   * Forca releitura do servidor.
   *
   * `reload()` e deliberado: este e o ponto exato do incidente de producao.
   * O saldo ficava congelado porque o Data Cache do Next guardava o `fetch`
   * que o supabase-js faz por baixo, e cada URL do PostgREST era uma chave
   * diferente — por isso uma parte da tela atualizava e outra nao. Um teste
   * que so olhasse o estado logo apos a mutacao passaria sem ver o bug.
   */
  async recarregar() {
    await this.page.reload()
    await expect(this.cartao('Saldo Total')).toBeVisible()
  }

  menu(nome: string): Locator {
    return this.page.getByRole('link', { name: nome })
  }

  async irPara(nome: string) {
    await this.menu(nome).click()
  }
}
