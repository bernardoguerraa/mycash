import { expect, test } from '@playwright/test'

import { PaginaDoDashboard } from './pages/dashboard.page'
import { PaginaDeLogin } from './pages/login.page'
import { PaginaDeTransacoes } from './pages/transacoes.page'
import { MOTIVO_SEM_CREDENCIAL, credenciais, descricaoDeTeste } from './apoio/credenciais'

/**
 * Cenario critico 2 — o caminho transacional do produto.
 *
 * `login -> registrar lancamento -> o saldo consolidado refletir o lancamento`
 *
 * No criterio do roteiro da aula isto ocupa o lugar do Core Revenue Path. O
 * MyCash nao gera receita, mas o equivalente funcional e direto: um aplicativo
 * de financas cujo saldo nao bate nao serve para nada. Se esta jornada
 * quebrar, o produto deixa de existir, mesmo com todas as telas abrindo.
 *
 * E o cenario nao e escolha teorica — este fluxo quebrou em producao duas
 * vezes, e nas duas a suite inteira continuou verde:
 *
 * 1. O dashboard mostrava saldo congelado em R$ 2.000 enquanto o banco ja
 *    tinha outro valor. Causa: o Data Cache do Next envolvendo o `fetch` que
 *    o supabase-js faz internamente. Cada URL do PostgREST e uma chave de
 *    cache diferente — por isso parte da tela atualizava e parte nao.
 * 2. O app mobile quebrou com `Cannot read property 'length' of undefined`
 *    porque o bundle ja esperava `serieMensal` e a Vercel servia a rota
 *    antiga.
 *
 * Nos dois casos o dominio estava correto (162 testes de unidade passando) e o
 * Postgres estava correto (35 de integracao passando). O defeito morava entre
 * o navegador e a API — a unica faixa que esta camada alcanca.
 */

const creds = credenciais()

test.describe('saldo consolidado reflete o lancamento', () => {
  // `skip` com motivo legivel em vez de falha obscura: sem credencial o teste
  // diria "Invalid login credentials" e pareceria bug da aplicacao.
  test.skip(!creds, MOTIVO_SEM_CREDENCIAL)

  // Serie, nao paralelo: os casos compartilham a sessao e mexem nos mesmos
  // dados do usuario de teste.
  test.describe.configure({ mode: 'serial' })

  test('lancamentoDeSaida_apsRecarregar_reduzOSaldoConsolidado', async ({ page }) => {
    const login = new PaginaDeLogin(page)
    const dashboard = new PaginaDoDashboard(page)
    const transacoes = new PaginaDeTransacoes(page)

    const descricao = descricaoDeTeste('Saida E2E')
    const valor = 137.42

    // --- Arrange: entra e fotografa o saldo de partida ---
    await login.abrir()
    await login.entrar(creds!.email, creds!.senha)
    await dashboard.abrir()

    const saldoAntes = await dashboard.saldoConsolidado()
    const despesasAntes = await dashboard.despesasDoMes()

    // --- Act: registra a saida pela interface, como o usuario faria ---
    await transacoes.abrir()
    await transacoes.criar({
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao,
      valor,
    })

    expect(await transacoes.contemDescricao(descricao)).toBe(true)

    // --- Assert ---
    await dashboard.abrir()
    // `recarregar` e o passo que expoe o bug de cache: forca releitura do
    // servidor em vez de confiar no que a navegacao do cliente trouxe.
    await dashboard.recarregar()

    const saldoDepois = await dashboard.saldoConsolidado()
    const despesasDepois = await dashboard.despesasDoMes()

    // Centavos comparados com tolerancia de 1 centavo: o valor atravessa
    // `numeric(14,2)` no Postgres, float no JavaScript e formatacao pt-BR.
    expect(saldoDepois).toBeCloseTo(saldoAntes - valor, 2)
    expect(despesasDepois).toBeCloseTo(despesasAntes + valor, 2)

    // --- Teardown: o cenario escreve em banco real e precisa limpar ---
    await transacoes.abrir()
    await transacoes.excluir(descricao)
  })

  test('lancamentoDeEntrada_apsRecarregar_aumentaOSaldoConsolidado', async ({ page }) => {
    // O caminho simetrico. Nao e redundante: `efeitoNoSaldo` decide o sinal
    // pelo `tipo`, e uma troca de sinal invertida passaria no caso anterior.
    const login = new PaginaDeLogin(page)
    const dashboard = new PaginaDoDashboard(page)
    const transacoes = new PaginaDeTransacoes(page)

    const descricao = descricaoDeTeste('Entrada E2E')
    const valor = 2500

    await login.abrir()
    await login.entrar(creds!.email, creds!.senha)
    await dashboard.abrir()

    const saldoAntes = await dashboard.saldoConsolidado()
    const receitasAntes = await dashboard.receitasDoMes()

    await transacoes.abrir()
    await transacoes.criar({
      tipo: 'Entrada',
      categoria: 'Salario',
      descricao,
      valor,
    })

    await dashboard.abrir()
    await dashboard.recarregar()

    expect(await dashboard.saldoConsolidado()).toBeCloseTo(saldoAntes + valor, 2)
    expect(await dashboard.receitasDoMes()).toBeCloseTo(receitasAntes + valor, 2)

    await transacoes.abrir()
    await transacoes.excluir(descricao)
  })

  test('lancamentoExcluido_apsRecarregar_devolveOSaldoAoValorAnterior', async ({ page }) => {
    // Fecha o ciclo: criar e desfazer tem de devolver o saldo ao ponto de
    // partida. O teste de integracao prova isso no banco; aqui prova que a
    // tela conta a mesma historia que o banco — que e justamente onde o
    // incidente do cache morava.
    const login = new PaginaDeLogin(page)
    const dashboard = new PaginaDoDashboard(page)
    const transacoes = new PaginaDeTransacoes(page)

    const descricao = descricaoDeTeste('Ciclo E2E')

    await login.abrir()
    await login.entrar(creds!.email, creds!.senha)
    await dashboard.abrir()

    const saldoInicial = await dashboard.saldoConsolidado()

    await transacoes.abrir()
    await transacoes.criar({ tipo: 'Saida', categoria: 'Outros', descricao, valor: 80.5 })
    await transacoes.excluir(descricao)

    await dashboard.abrir()
    await dashboard.recarregar()

    expect(await dashboard.saldoConsolidado()).toBeCloseTo(saldoInicial, 2)
  })
})
