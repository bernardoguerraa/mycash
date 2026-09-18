import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest'
import type { Pool } from 'pg'

import { conectarBancoDoWorker, limparTabelas } from './banco-efemero'

/**
 * Idempotencia do sync do Open Finance.
 *
 * O `syncPluggyItem` (src/lib/pluggy/sync.ts) reprocessa as mesmas
 * transacoes toda vez que roda: o webhook da Pluggy dispara de novo, o
 * usuario aperta "sincronizar", a pagina 1 volta inteira. Se cada passada
 * inserisse linha nova, o extrato duplicaria e o saldo iria junto.
 *
 * O que impede isso nao e codigo TypeScript — e `unique` no Postgres, com o
 * upsert usando `on conflict`. Por isso o teste vive aqui e nao na suite de
 * unidade: um Fake em memoria teria de reimplementar a semantica de
 * `on conflict ... do update`, e estaria testando o Fake.
 *
 * Os testes falam SQL direto, na mesma forma que o PostgREST gera para
 * `.upsert({...}, { onConflict: 'pluggy_tx_id' })`. Subir o supabase-js aqui
 * exigiria a plataforma inteira; a garantia que interessa e a do banco.
 */

let db: Pool
let idUsuario: number
let idConta: number

beforeAll(async () => {
  db = await conectarBancoDoWorker(inject('urlBancoTeste'))
})

beforeEach(async () => {
  await limparTabelas(db)

  const { rows: u } = await db.query<{ id_usuario: number }>(
    `insert into public.usuarios (nome_completo, email, senha_hash)
     values ('Matheus', 'matheus@mycash.dev', 'x') returning id_usuario`
  )
  idUsuario = u[0].id_usuario

  const { rows: c } = await db.query<{ id_conta: number }>(
    `insert into public.contas_bancarias
       (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual, origem, pluggy_account_id)
     values ($1, 'Nubank', '0001/12345-6', 'Corrente', 1000, 'pluggy', 'pluggy-acc-1')
     returning id_conta`,
    [idUsuario]
  )
  idConta = c[0].id_conta
})

afterAll(async () => {
  await db?.end()
})

/**
 * Mesma escrita que o sync faz por transacao: upsert com `pluggy_tx_id` como
 * chave de conflito.
 *
 * O `do update set` lista todas as colunas do payload, e nao so as que mudam
 * de valor com frequencia: e o que o PostgREST gera para
 * `.upsert(payload, { onConflict: 'pluggy_tx_id' })`. Escrever menos aqui
 * tornaria o teste mais frouxo que a producao — a primeira versao deste
 * arquivo omitia `id_conta` e discordou do banco por isso.
 */
async function sincronizarTransacao(campos: {
  idConta?: number
  pluggyTxId: string
  valor: number
  descricao: string
  categoria?: string
  data?: string
}) {
  return db.query(
    `insert into public.transacoes
       (id_conta, data_transacao, tipo, categoria, descricao, valor, pluggy_tx_id, origem)
     values ($1, $2, 'Saida', $3, $4, $5, $6, 'pluggy')
     on conflict (pluggy_tx_id) do update set
       id_conta = excluded.id_conta,
       data_transacao = excluded.data_transacao,
       tipo = excluded.tipo,
       categoria = excluded.categoria,
       descricao = excluded.descricao,
       valor = excluded.valor`,
    [
      campos.idConta ?? idConta,
      campos.data ?? '2026-09-15',
      campos.categoria ?? 'Supermercado',
      campos.descricao,
      campos.valor,
      campos.pluggyTxId,
    ]
  )
}

async function contarTransacoes(): Promise<number> {
  const { rows } = await db.query<{ total: string }>(`select count(*) as total from public.transacoes`)
  return Number(rows[0].total)
}

describe('transacoes vindas da Pluggy', () => {
  it('sync_mesmaTransacaoDuasVezes_naoDuplicaALinha', async () => {
    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'Mercado' })
    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'Mercado' })

    expect(await contarTransacoes()).toBe(1)
  })

  it('sync_transacaoQueMudouNoBanco_atualizaEmVezDeInserir', async () => {
    // Acontece de verdade: a Pluggy devolve a compra como pendente e depois
    // confirma com outro valor, mantendo o mesmo id.
    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'PENDENTE' })

    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 162.35, descricao: 'Mercado Extra' })

    const { rows } = await db.query<{ valor: string; descricao: string }>(
      `select valor, descricao from public.transacoes where pluggy_tx_id = 'tx-abc'`
    )
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].valor)).toBe(162.35)
    expect(rows[0].descricao).toBe('Mercado Extra')
  })

  it('sync_paginaInteiraReprocessada_mantemUmaLinhaPorTransacao', async () => {
    // O sync pagina de 500 em 500 e nao guarda cursor: um erro no meio faz a
    // execucao seguinte reprocessar a pagina do zero.
    const pagina = ['tx-1', 'tx-2', 'tx-3']

    for (const id of pagina) await sincronizarTransacao({ pluggyTxId: id, valor: 10, descricao: id })
    for (const id of pagina) await sincronizarTransacao({ pluggyTxId: id, valor: 10, descricao: id })

    expect(await contarTransacoes()).toBe(3)
  })

  it('sync_mesmoIdPluggyEmOutraConta_moveALinhaEmVezDeDuplicar', async () => {
    // A unicidade de `pluggy_tx_id` e global, nao por conta — e tem de ser: o
    // id da Pluggy ja identifica a transacao unicamente. Se fosse por conta, a
    // mesma transacao entraria duas vezes quando o usuario reconectasse o
    // banco e a conta ganhasse outro id_conta.
    const { rows: c2 } = await db.query<{ id_conta: number }>(
      `insert into public.contas_bancarias
         (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual, origem, pluggy_account_id)
       values ($1, 'Itau', '0002/99999-9', 'Corrente', 500, 'pluggy', 'pluggy-acc-2')
       returning id_conta`,
      [idUsuario]
    )

    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'Mercado' })
    await sincronizarTransacao({
      idConta: c2[0].id_conta,
      pluggyTxId: 'tx-abc',
      valor: 150,
      descricao: 'Mercado',
    })

    const { rows } = await db.query<{ id_conta: number }>(
      `select id_conta from public.transacoes where pluggy_tx_id = 'tx-abc'`
    )
    expect(rows).toHaveLength(1)
    // O upsert moveu a linha para a segunda conta em vez de criar outra.
    expect(rows[0].id_conta).toBe(c2[0].id_conta)
  })

  it('lancamentosManuais_semIdPluggy_convivemSemColidir', async () => {
    // Detalhe de Postgres que so um banco real mostra: `unique` permite
    // varios NULL. Sem isso, a coluna `pluggy_tx_id unique` deixaria o
    // usuario cadastrar uma unica transacao manual em todo o sistema.
    await db.query(
      `insert into public.transacoes (id_conta, data_transacao, tipo, categoria, descricao, valor, origem)
       values ($1, '2026-09-15', 'Saida', 'Alimentacao', 'Pastel da feira', 12, 'manual'),
              ($1, '2026-09-16', 'Saida', 'Transporte', 'Onibus', 5.5, 'manual')`,
      [idConta]
    )

    expect(await contarTransacoes()).toBe(2)
  })

  it('transacaoDaPluggy_origemGravada_distingueDoLancamentoManual', async () => {
    // A tela de contas usa `origem` para decidir se o registro pode ser
    // editado a mao. Se o default engolisse o valor, transacao sincronizada
    // viraria editavel e o proximo sync desfaria a edicao.
    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'Mercado' })

    const { rows } = await db.query<{ origem: string }>(
      `select origem from public.transacoes where pluggy_tx_id = 'tx-abc'`
    )
    expect(rows[0].origem).toBe('pluggy')
  })

  it('origemForaDaLista_rejeitadaPeloCheck', async () => {
    await expect(
      db.query(
        `insert into public.transacoes (id_conta, data_transacao, tipo, categoria, descricao, valor, origem)
         values ($1, '2026-09-15', 'Saida', 'Outros', 'origem invalida', 10, 'ofx')`,
        [idConta]
      )
    ).rejects.toThrow()
  })
})

describe('contas vindas da Pluggy', () => {
  it('sync_mesmaContaDuasVezes_atualizaSaldoSemCriarOutraConta', async () => {
    // `onConflict: 'pluggy_account_id'` no sync. Duplicar conta duplicaria o
    // saldo consolidado do dashboard.
    const upsert = (saldo: number) =>
      db.query(
        `insert into public.contas_bancarias
           (id_usuario, instituicao, numero_conta, tipo_conta, saldo_atual, origem, pluggy_account_id)
         values ($1, 'Nubank', '0001/12345-6', 'Corrente', $2, 'pluggy', 'pluggy-acc-1')
         on conflict (pluggy_account_id) do update set saldo_atual = excluded.saldo_atual`,
        [idUsuario, saldo]
      )

    await upsert(1500)
    await upsert(1742.9)

    const { rows } = await db.query<{ saldo_atual: string }>(
      `select saldo_atual from public.contas_bancarias where pluggy_account_id = 'pluggy-acc-1'`
    )
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].saldo_atual)).toBe(1742.9)
  })

  it('conexaoApagada_levaAsTransacoesJunto_semOrfa', async () => {
    // Desconectar o banco no app apaga usuario -> contas -> transacoes em
    // cascata. Transacao orfa ficaria invisivel para a RLS e somaria em
    // relatorio sem dono.
    await sincronizarTransacao({ pluggyTxId: 'tx-abc', valor: 150, descricao: 'Mercado' })

    await db.query(`delete from public.contas_bancarias where id_conta = $1`, [idConta])

    expect(await contarTransacoes()).toBe(0)
  })
})

describe('webhook da Pluggy', () => {
  /** Mesmo insert que a rota /api/pluggy/webhook faz ao receber um evento. */
  const registrarEvento = (eventId: string, tipo: string) =>
    db.query(
      `insert into public.pluggy_webhook_events (event_id, event_type, pluggy_item_id, payload)
       values ($1, $2, 'item-1', '{}'::jsonb)
       on conflict (event_id) do nothing`,
      [eventId, tipo]
    )

  it('webhook_eventoReentregue_naoEProcessadoDuasVezes', async () => {
    // A Pluggy reentrega o webhook quando nao recebe 200 a tempo. Sem a
    // unicidade de `event_id`, um timeout nosso viraria sync duplicado.
    await registrarEvento('evt-1', 'item/updated')
    await registrarEvento('evt-1', 'item/updated')

    const { rows } = await db.query<{ total: string }>(
      `select count(*) as total from public.pluggy_webhook_events`
    )
    expect(Number(rows[0].total)).toBe(1)
  })

  it('webhook_eventosDiferentes_ambosRegistrados', async () => {
    await registrarEvento('evt-1', 'item/updated')
    await registrarEvento('evt-2', 'item/error')

    const { rows } = await db.query<{ total: string }>(
      `select count(*) as total from public.pluggy_webhook_events`
    )
    expect(Number(rows[0].total)).toBe(2)
  })
})
