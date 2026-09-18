import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest'
import type { Pool } from 'pg'

import { criarServicoDeLancamentos, type ServicoDeLancamentos } from '@/domain/lancamentos'
import { ContaBloqueadaError, ValorInvalidoError } from '@/domain/erros'
import { conectarBancoDoWorker, limparTabelas } from './banco-efemero'
import { ContasPostgres, TransacoesPostgres } from './adaptadores-postgres'

/**
 * Integracao do caso de uso de lancamento com persistencia real.
 *
 * A diferenca para `src/domain/lancamentos.test.ts` e a fronteira: la os
 * repositorios sao Fakes em memoria e o alvo e a regra; aqui sao adaptadores
 * Postgres de verdade e o alvo e o encaixe — tipo numerico, chave estrangeira,
 * arredondamento de `numeric`, cascade.
 *
 * E o "ponto cego da unidade" que a Aula 02 descreve: com dublês perfeitos as
 * engrenagens giram, mas nada garante que elas se encaixem quando existe I/O.
 * Exemplo concreto que so aparece aqui: o driver `pg` devolve `numeric` como
 * string, nao como number. O Fake nunca revelaria isso.
 */

let db: Pool
let servico: ServicoDeLancamentos
let idConta: number
let idContaBloqueada: number

beforeAll(async () => {
  db = await conectarBancoDoWorker(inject('urlBancoTeste'))
})

beforeEach(async () => {
  await limparTabelas(db)

  const { rows: u } = await db.query<{ id_usuario: number }>(
    `insert into public.usuarios (nome_completo, email, senha_hash)
     values ('Matheus', 'matheus@mycash.dev', 'x') returning id_usuario`
  )

  const { rows: contas } = await db.query<{ id_conta: number }>(
    `insert into public.contas_bancarias (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual)
     values ($1, 'Nubank', '1', 'Corrente', 1000)
     returning id_conta`,
    [u[0].id_usuario]
  )
  idConta = contas[0].id_conta

  // Conta bloqueada: o status vive em `usuarios`, entao a conta e de um
  // segundo usuario com status_conta = 'Bloqueado'.
  const { rows: u2 } = await db.query<{ id_usuario: number }>(
    `insert into public.usuarios (nome_completo, email, senha_hash, status_conta)
     values ('Bloqueado', 'bloqueado@mycash.dev', 'x', 'Bloqueado') returning id_usuario`
  )
  const { rows: c2 } = await db.query<{ id_conta: number }>(
    `insert into public.contas_bancarias (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual)
     values ($1, 'Banco Antigo', '2', 'Corrente', 500) returning id_conta`,
    [u2[0].id_usuario]
  )
  idContaBloqueada = c2[0].id_conta

  servico = criarServicoDeLancamentos(new ContasPostgres(db), new TransacoesPostgres(db))
})

afterAll(async () => {
  await db?.end()
})

/** Saldo lido direto do banco, para a fase de Assert. */
async function saldoDe(id: number): Promise<number> {
  const { rows } = await db.query<{ saldo_atual: string }>(
    `select saldo_atual from public.contas_bancarias where id_conta = $1`,
    [id]
  )
  return Number(rows[0].saldo_atual)
}

const LANCAMENTO = {
  tipo: 'Saida' as const,
  valor: 150,
  descricao: 'Mercado',
  categoria: 'Alimentacao',
  data_transacao: '2026-09-11',
}

describe('criar', () => {
  it('criar_saidaEmContaAtiva_persisteEReduzOSaldoNoBanco', async () => {
    // Act
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta })

    // Assert: a linha existe e o efeito colateral chegou na conta.
    const { rows } = await db.query(`select * from public.transacoes where id_transacao = $1`, [
      criada.id_transacao,
    ])
    expect(rows).toHaveLength(1)
    expect(await saldoDe(idConta)).toBe(850)
  })

  it('criar_entrada_aumentaOSaldoNoBanco', async () => {
    await servico.criar({ ...LANCAMENTO, id_conta: idConta, tipo: 'Entrada', valor: 3200 })

    expect(await saldoDe(idConta)).toBe(4200)
  })

  it('criar_valorComCentavos_gravaSemResiduoBinario', async () => {
    // `numeric(14,2)` no banco vs float no JavaScript: so o teste com
    // persistencia real mostra o que foi efetivamente gravado.
    await servico.criar({ ...LANCAMENTO, id_conta: idConta, valor: 0.1 })
    await servico.criar({ ...LANCAMENTO, id_conta: idConta, valor: 0.2 })

    expect(await saldoDe(idConta)).toBe(999.7)
  })

  it('criar_valorZero_recusaESemDeixarLinhaNoBanco', async () => {
    await expect(
      servico.criar({ ...LANCAMENTO, id_conta: idConta, valor: 0 })
    ).rejects.toThrow(ValorInvalidoError)

    const { rows } = await db.query(`select 1 from public.transacoes`)
    expect(rows).toHaveLength(0)
    expect(await saldoDe(idConta)).toBe(1000)
  })

  it('criar_emContaDeUsuarioBloqueado_recusaESemTocarNoSaldo', async () => {
    await expect(
      servico.criar({ ...LANCAMENTO, id_conta: idContaBloqueada })
    ).rejects.toThrow(ContaBloqueadaError)

    expect(await saldoDe(idContaBloqueada)).toBe(500)
  })
})

describe('editar', () => {
  it('editar_valorMaior_ajustaApenasADiferencaNoBanco', async () => {
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta }) // 850

    await servico.editar(criada.id_transacao, { valor: 200 })

    expect(await saldoDe(idConta)).toBe(800)
  })

  it('editar_trocaDeTipo_inverteOEfeitoNoBanco', async () => {
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta }) // 850

    await servico.editar(criada.id_transacao, { tipo: 'Entrada' })

    expect(await saldoDe(idConta)).toBe(1150)
  })

  it('editar_apenasADescricao_naoMexeNoSaldo', async () => {
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta })

    await servico.editar(criada.id_transacao, { descricao: 'Mercado do bairro' })

    expect(await saldoDe(idConta)).toBe(850)
  })
})

describe('excluir', () => {
  it('excluir_saida_removeALinhaEDevolveOSaldo', async () => {
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta })

    await servico.excluir(criada.id_transacao)

    const { rows } = await db.query(`select 1 from public.transacoes`)
    expect(rows).toHaveLength(0)
    expect(await saldoDe(idConta)).toBe(1000)
  })

  it('excluir_duasVezes_naoDebitaDuasVezes', async () => {
    // Toque duplo na tela nao pode devolver o valor duas vezes.
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta })

    await servico.excluir(criada.id_transacao)
    await servico.excluir(criada.id_transacao)

    expect(await saldoDe(idConta)).toBe(1000)
  })
})

describe('integridade referencial', () => {
  it('contaApagada_comLancamentos_removeTudoEmCascata', async () => {
    // Comportamento do banco, nao do dominio: so um Postgres real prova.
    await servico.criar({ ...LANCAMENTO, id_conta: idConta })

    await db.query(`delete from public.contas_bancarias where id_conta = $1`, [idConta])

    const { rows } = await db.query(`select 1 from public.transacoes where id_conta = $1`, [idConta])
    expect(rows).toHaveLength(0)
  })
})

describe('sequencia completa', () => {
  it('criarEditarExcluir_emSequencia_saldoVoltaAoInicial', async () => {
    const criada = await servico.criar({ ...LANCAMENTO, id_conta: idConta })
    await servico.editar(criada.id_transacao, { valor: 275.5, tipo: 'Entrada' })
    await servico.excluir(criada.id_transacao)

    expect(await saldoDe(idConta)).toBe(1000)
  })
})
