import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Pool } from 'pg'

import { conectarBancoDoWorker, limparTabelas } from './banco-efemero'

/**
 * O primeiro teste de integracao valida a propria migration.
 *
 * Faz sentido ser o primeiro: se o schema nao aplicar, nenhum outro teste
 * significa nada. E, no caso do MyCash, este arquivo tem um papel extra — as
 * seis tabelas centrais nunca foram versionadas, e a migration foi derivada
 * dos tipos e do uso nas rotas, nao extraida do banco. Aqui e onde o Postgres
 * de verdade diz se o SQL esta correto.
 *
 * Isto nao prova que o schema bate com producao (para isso existe
 * supabase/verificacao-schema.sql). Prova que ele aplica e que as regras que
 * escrevemos nele valem.
 */

let db: Pool

beforeAll(async () => {
  db = await conectarBancoDoWorker(process.env.URL_BANCO_TESTE!)
})

// Estado zerado antes de cada caso. Sem isto, o segundo teste herda as linhas
// do primeiro — foi o que aconteceu na primeira execucao desta suite, com
// cinco falhas de email duplicado.
beforeEach(async () => {
  await limparTabelas(db)
})

afterAll(async () => {
  await db?.end()
})

describe('aplicacao das migrations', () => {
  it('migrations_aplicadas_criamAsSeisTabelasCentrais', async () => {
    const { rows } = await db.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `)

    const tabelas = rows.map((r) => r.table_name)

    expect(tabelas).toEqual(
      expect.arrayContaining([
        'usuarios',
        'contas_bancarias',
        'transacoes',
        'metas_financeiras',
        'lembretes',
        'notificacoes',
      ])
    )
  })

  it('migrations_aplicadas_criamOsSeisTiposEnumerados', async () => {
    const { rows } = await db.query<{ typname: string }>(`
      select t.typname
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e'
      order by t.typname
    `)

    expect(rows.map((r) => r.typname)).toEqual([
      'plano_usuario',
      'status_conta',
      'status_meta',
      'tipo_lembrete',
      'tipo_notificacao',
      'tipo_transacao',
    ])
  })

  it('migrationDoPluggy_aplicada_estendeContasETransacoes', async () => {
    // A migration do Pluggy roda por ultimo e faz `alter table` nas tabelas do
    // schema base. Se a ordem quebrar, ela falha — este caso protege a ordem.
    const { rows } = await db.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'contas_bancarias'
        and column_name in ('pluggy_item_id', 'origem')
      order by column_name
    `)

    expect(rows.map((r) => r.column_name)).toEqual(['origem', 'pluggy_item_id'])
  })

  it('migrationDeRls_aplicada_criaAColunaAuthUserId', async () => {
    const { rows } = await db.query(`
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'usuarios'
        and column_name = 'auth_user_id'
    `)

    expect(rows).toHaveLength(1)
  })
})

describe('regras declaradas no schema', () => {
  /** Usuario + conta minimos para os casos abaixo. */
  async function semearContaAtiva() {
    const { rows: u } = await db.query<{ id_usuario: number }>(
      `insert into public.usuarios (nome_completo, email, senha_hash)
       values ('Teste', 'teste@mycash.dev', 'x') returning id_usuario`
    )
    const { rows: c } = await db.query<{ id_conta: number }>(
      `insert into public.contas_bancarias (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual)
       values ($1, 'Nubank', '1', 'Corrente', 1000) returning id_conta`,
      [u[0].id_usuario]
    )
    return { idUsuario: u[0].id_usuario, idConta: c[0].id_conta }
  }

  it('transacoes_valorZeroOuNegativo_rejeitadoPeloCheck', async () => {
    // A regra vive em src/domain/saldo.ts; o check e a rede de seguranca no
    // banco, para o caso de alguem escrever direto por SQL.
    const { idConta } = await semearContaAtiva()

    await expect(
      db.query(
        `insert into public.transacoes (id_conta, tipo, categoria, descricao, valor)
         values ($1, 'Saida', 'Outros', 'invalida', -10)`,
        [idConta]
      )
    ).rejects.toThrow()
  })

  it('transacoes_contaInexistente_rejeitadoPelaChaveEstrangeira', async () => {
    await expect(
      db.query(
        `insert into public.transacoes (id_conta, tipo, categoria, descricao, valor)
         values (999999, 'Saida', 'Outros', 'orfa', 10)`
      )
    ).rejects.toThrow()
  })

  it('usuarios_emailDuplicado_rejeitadoPelaUnicidade', async () => {
    // A unicidade sustenta o trigger handle_new_auth_user, que casa usuario
    // por email ao vincular com o Supabase Auth.
    await db.query(
      `insert into public.usuarios (nome_completo, email, senha_hash)
       values ('A', 'repetido@mycash.dev', 'x')`
    )

    await expect(
      db.query(
        `insert into public.usuarios (nome_completo, email, senha_hash)
         values ('B', 'repetido@mycash.dev', 'x')`
      )
    ).rejects.toThrow()
  })

  it('metas_dataLimiteAnteriorAoInicio_rejeitadoPeloCheck', async () => {
    const { idUsuario } = await semearContaAtiva()

    await expect(
      db.query(
        `insert into public.metas_financeiras (id_usuario, titulo, valor_objetivo, data_inicio, data_limite)
         values ($1, 'Prazo invertido', 1000, '2026-12-31', '2026-09-04')`,
        [idUsuario]
      )
    ).rejects.toThrow()
  })

  it('contas_usuarioApagado_apagaAsContasEmCascata', async () => {
    // Conta orfa sem dono quebraria a RLS, que filtra justamente por usuario.
    const { idUsuario } = await semearContaAtiva()

    await db.query(`delete from public.usuarios where id_usuario = $1`, [idUsuario])

    const { rows } = await db.query(
      `select 1 from public.contas_bancarias where id_usuario = $1`,
      [idUsuario]
    )
    expect(rows).toHaveLength(0)
  })

  it('transacoes_contaApagada_apagaAsTransacoesEmCascata', async () => {
    const { idConta } = await semearContaAtiva()
    await db.query(
      `insert into public.transacoes (id_conta, tipo, categoria, descricao, valor)
       values ($1, 'Saida', 'Alimentacao', 'Mercado', 150)`,
      [idConta]
    )

    await db.query(`delete from public.contas_bancarias where id_conta = $1`, [idConta])

    const { rows } = await db.query(`select 1 from public.transacoes where id_conta = $1`, [idConta])
    expect(rows).toHaveLength(0)
  })

  it('saldoAtual_valorComCentavos_guardadoSemResiduoBinario', async () => {
    // numeric(14,2), e nao float: dinheiro em ponto flutuante acumula residuo
    // (0.1 + 0.2 = 0.30000000000000004) e o saldo e somado a cada lancamento.
    const { idConta } = await semearContaAtiva()

    await db.query(`update public.contas_bancarias set saldo_atual = 0.1 + 0.2 where id_conta = $1`, [
      idConta,
    ])

    const { rows } = await db.query<{ saldo_atual: string }>(
      `select saldo_atual from public.contas_bancarias where id_conta = $1`,
      [idConta]
    )
    expect(Number(rows[0].saldo_atual)).toBe(0.3)
  })

  it('enum_valorForaDaLista_rejeitadoPeloTipo', async () => {
    const { idConta } = await semearContaAtiva()

    await expect(
      db.query(
        `insert into public.transacoes (id_conta, tipo, categoria, descricao, valor)
         values ($1, 'Transferencia', 'Outros', 'tipo inexistente', 10)`,
        [idConta]
      )
    ).rejects.toThrow()
  })
})
