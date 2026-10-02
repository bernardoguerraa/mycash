import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export type NovaTransacao = {
  tipo: 'Entrada' | 'Saida'
  categoria: string
  descricao: string
  /** Em reais, com ponto decimal: 150.5 vira "150,50" no campo. */
  valor: number
  /** AAAA-MM-DD. Default: hoje. */
  data?: string
}

/**
 * Page Object da tela de transacoes, incluindo o modal de cadastro.
 *
 * O modal ganhou `htmlFor`/`id` nos rotulos durante este trabalho. Antes os
 * `<label>` eram texto solto ao lado do campo: visualmente pareciam rotulo,
 * mas nao eram — leitor de tela anunciava "caixa de edicao" sem dizer de que,
 * e `getByLabel('Valor (R$)')` nao encontrava nada. O teste E2E expos um bug
 * de acessibilidade que ninguem tinha notado.
 */
export class PaginaDeTransacoes {
  readonly botaoNova: Locator
  readonly campoBusca: Locator

  constructor(private readonly page: Page) {
    this.botaoNova = page.getByRole('button', { name: 'Nova Transação' }).first()
    this.campoBusca = page.getByPlaceholder(/buscar/i)
  }

  async abrir() {
    await this.page.goto('/transacoes')
    await expect(this.botaoNova).toBeVisible()
  }

  // --- Modal -----------------------------------------------------------------

  private get modal(): Locator {
    return this.page.getByRole('dialog').or(this.page.locator('form').filter({ has: this.page.getByLabel('Valor (R$)') }))
  }

  async abrirModal() {
    await this.botaoNova.click()
    await expect(this.page.getByLabel('Valor (R$)')).toBeVisible()
  }

  /**
   * Preenche o formulario.
   *
   * O campo de valor recebe o texto com virgula, como o usuario brasileiro
   * digita. Nao e detalhe: `parseValor` trata virgula e ponto, e esse
   * comportamento esta coberto por teste de unidade — aqui o que se verifica e
   * que o caminho da tecla ate o banco preserva o numero.
   */
  async preencher(dados: NovaTransacao) {
    // Tipo e um radio com `className="sr-only"` dentro de um <label>: o input
    // real e invisivel, entao clicar no rotulo e o que o usuario faz.
    const rotuloTipo = dados.tipo === 'Entrada' ? 'Entrada' : 'Saída'
    await this.page.getByText(rotuloTipo, { exact: true }).click()

    await this.page.getByLabel('Categoria').selectOption({ label: dados.categoria }).catch(async () => {
      // Categoria fora da lista fixa: cai no campo livre.
      await this.page.getByLabel('Categoria').selectOption({ value: '__custom__' })
      await this.page.getByLabel('Nome da categoria').fill(dados.categoria)
    })

    await this.page.getByLabel('Descrição').fill(dados.descricao)
    await this.page.getByLabel('Valor (R$)').fill(dados.valor.toFixed(2).replace('.', ','))

    if (dados.data) {
      await this.page.getByLabel('Data').fill(dados.data)
    }
  }

  /** Salva e espera o modal fechar — sinal de que a API respondeu. */
  async salvar() {
    await this.page.getByRole('button', { name: /^(Criar|Salvar)/ }).click()
    await expect(this.page.getByLabel('Valor (R$)')).toBeHidden({ timeout: 20_000 })
  }

  async criar(dados: NovaTransacao) {
    await this.abrirModal()
    await this.preencher(dados)
    await this.salvar()
  }

  // --- Lista -----------------------------------------------------------------

  /** Uma linha da lista, localizada pela descricao visivel. */
  linha(descricao: string): Locator {
    return this.page.getByText(descricao, { exact: false }).first()
  }

  async contemDescricao(descricao: string): Promise<boolean> {
    return this.linha(descricao).isVisible()
  }

  /**
   * Exclui pela descricao e confirma no modal.
   *
   * Existe para o teardown do cenario: o teste cria dado real num banco real,
   * e deixar lixo acumulado faria a proxima execucao partir de outro estado —
   * o "I" de Independent das F.I.R.S.T. vale aqui tambem, so que o custo de
   * ignorar e maior, porque nao ha truncate que salve um banco compartilhado.
   */
  async excluir(descricao: string) {
    const linha = this.page.locator('tr', { hasText: descricao }).first()
    await linha.getByRole('button').last().click()
    await this.page.getByRole('button', { name: /excluir|confirmar/i }).last().click()
    await expect(this.page.getByText(descricao, { exact: false })).toBeHidden({ timeout: 20_000 })
  }
}
