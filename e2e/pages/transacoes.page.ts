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
    // O radio e `sr-only`: continua na arvore de acessibilidade (o esconder e
    // por clip, nao display:none), mas tem tamanho zero na tela — e `check()`
    // recusa com "Element is outside of the viewport", porque nao ha onde
    // clicar. Nem `force` contorna isso.
    //
    // A solucao e clicar onde o usuario clica: o <label> que envolve o radio.
    // Localizado por conter aquele radio especifico, e nao por texto, porque
    // "Saída" tambem aparece no filtro da lista e o modo estrito recusaria
    // dois matches.
    const rotuloTipo = dados.tipo === 'Entrada' ? 'Entrada' : 'Saída'
    const radio = this.page.getByRole('radio', { name: rotuloTipo })
    await this.page.locator('label').filter({ has: radio }).click()
    await expect(radio).toBeChecked()

    // Selecao por `value`, nao por label: o banco guarda a categoria sem
    // acento ("Alimentacao") e a tela renderiza com acento ("Alimentação")
    // via rotuloCategoria. O teste fala a lingua do dado, nao a da exibicao —
    // senao mudar o rotulo de uma categoria quebraria o teste sem nenhuma
    // mudanca de comportamento.
    const seletorCategoria = this.page.getByLabel('Categoria')
    const existeNaLista = await seletorCategoria
      .locator(`option[value="${dados.categoria}"]`)
      .count()

    if (existeNaLista > 0) {
      await seletorCategoria.selectOption({ value: dados.categoria })
    } else {
      // Categoria fora da lista fixa: cai no campo livre.
      await seletorCategoria.selectOption({ value: '__custom__' })
      await this.page.getByLabel('Nome da categoria').fill(dados.categoria)
    }

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

  /**
   * A linha da tabela que contem a descricao.
   *
   * Localiza pela `<tr>`, e nao por `getByText` solto: o texto da descricao
   * tambem aparece em outros nos da pagina (o seletor de categoria, por
   * exemplo, repete rotulos), e o primeiro match podia cair num elemento
   * invisivel. A linha da tabela e a unidade que o usuario ve.
   */
  linha(descricao: string): Locator {
    return this.page.locator('tr', { hasText: descricao }).first()
  }

  async contemDescricao(descricao: string): Promise<boolean> {
    await this.linha(descricao).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
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
    const linha = this.linha(descricao)
    await linha.getByRole('button').last().click()
    await this.page.getByRole('button', { name: /excluir|confirmar/i }).last().click()
    await expect(this.page.getByText(descricao, { exact: false })).toBeHidden({ timeout: 20_000 })
  }
}
