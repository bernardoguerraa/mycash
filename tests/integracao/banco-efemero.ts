import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool } from 'pg'

/**
 * Banco descartavel para os testes de integracao.
 *
 * Estrategia (registrada em docs/Explanacoes/06-adr-testes-de-integracao.md):
 * um container so, um database por worker do Vitest, e truncate entre casos.
 *
 * - **Banco por worker** resolve paralelismo. Quatro forks disputando as
 *   mesmas linhas produziriam falha intermitente, que e o pior tipo: passa
 *   no seu micro e quebra no CI.
 * - **Truncate entre casos** resolve ordem. Sem ele, o segundo teste herda o
 *   que o primeiro deixou — o "I" de Independent das regras F.I.R.S.T.
 * - **Template** evita reaplicar as migrations por worker: `create database
 *   ... template ...` e copia de arquivo no Postgres, nao replay de DDL.
 *
 * Rollback por transacao seria mais barato, mas exigiria que o codigo de
 * producao usasse a conexao da transacao — e as rotas criam o proprio cliente
 * Supabase. Mudar a assinatura de toda a camada de acesso so para servir ao
 * teste inverte a prioridade.
 */

const RAIZ = join(__dirname, '..', '..')

/**
 * Ordem de aplicacao das migrations.
 *
 * Nao e alfabetica nem por data: o schema base precisa existir antes da RLS,
 * que por sua vez cria `auth_user_id`, referenciada pelas policies do Pluggy.
 * Os cabecalhos dos arquivos explicam o encadeamento.
 */
const MIGRATIONS = [
  'supabase/migrations/20260911_schema_base.sql',
  'supabase/migrations/20260619_rls_and_auth_user_id.sql',
  'supabase/migrations/20260417_pluggy_integration.sql',
]

/** Tabelas limpas entre casos, da folha para a raiz. */
const TABELAS = [
  'notificacoes',
  'lembretes',
  'metas_financeiras',
  'transacoes',
  'contas_bancarias',
  // As duas do Pluggy entram explicitamente. `pluggy_connections` referencia
  // `usuarios` e ate sairia no cascade, mas `pluggy_webhook_events` nao tem
  // chave estrangeira nenhuma — ficaria acumulando entre casos.
  'pluggy_connections',
  'pluggy_webhook_events',
  'usuarios',
]

const DB_TEMPLATE = 'mycash_template'

let container: StartedPostgreSqlContainer | null = null
let poolAdmin: Pool | null = null

/**
 * Sobe o container e prepara o database template com o schema aplicado.
 * Chamado uma vez por processo de teste (globalSetup do Vitest).
 */
export async function subirBanco(): Promise<string> {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('postgres')
    .withUsername('postgres')
    .withPassword('postgres')
    // fsync desligado: e um banco descartavel, durabilidade nao importa e a
    // suite fica varias vezes mais rapida.
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'synchronous_commit=off'])
    .start()

  const urlAdmin = container.getConnectionUri()
  poolAdmin = new Pool({ connectionString: urlAdmin })

  await poolAdmin.query(`create database ${DB_TEMPLATE}`)

  const poolTemplate = new Pool({ connectionString: urlParaBanco(urlAdmin, DB_TEMPLATE) })
  try {
    await prepararSchema(poolTemplate)
    await aplicarMigrations(poolTemplate)
  } finally {
    await poolTemplate.end()
  }

  return urlAdmin
}

/** Derruba container e conexoes. */
export async function derrubarBanco(): Promise<void> {
  await poolAdmin?.end()
  poolAdmin = null
  await container?.stop()
  container = null
}

/**
 * O que o Supabase provisiona e as migrations assumem existir.
 *
 * `auth.users` e o `auth.uid()` vem da plataforma, nao do nosso repositorio.
 * Sem eles a migration de RLS falha na chave estrangeira e nas policies. O
 * stub e minimo de proposito: so o suficiente para o schema aplicar.
 */
async function prepararSchema(pool: Pool): Promise<void> {
  await pool.query(`
    create schema if not exists auth;

    create table if not exists auth.users (
      id                   uuid primary key default gen_random_uuid(),
      email                text unique,
      raw_user_meta_data   jsonb default '{}'::jsonb,
      created_at           timestamptz not null default now()
    );

    -- Nos testes ninguem esta "logado": a identidade e nula e a RLS nao
    -- interfere, porque as consultas rodam como superusuario.
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select null::uuid $$;

    create or replace function auth.role() returns text
      language sql stable as $$ select 'service_role'::text $$;
  `)
}

async function aplicarMigrations(pool: Pool): Promise<void> {
  for (const caminho of MIGRATIONS) {
    const sql = readFileSync(join(RAIZ, caminho), 'utf8')
    try {
      await pool.query(sql)
    } catch (erro) {
      // Sem o nome do arquivo, o erro do Postgres nao diz qual migration
      // quebrou — e sao tres, aplicadas em sequencia.
      throw new Error(`Falha ao aplicar ${caminho}:\n${(erro as Error).message}`)
    }
  }
}

/** Troca o nome do database numa URL de conexao. */
function urlParaBanco(url: string, banco: string): string {
  const u = new URL(url)
  u.pathname = `/${banco}`
  return u.toString()
}

/**
 * Cria (uma vez) e devolve o database deste worker, copiado do template.
 *
 * `VITEST_WORKER_ID` e o que separa os forks. Sem ele, dois testes paralelos
 * escreveriam na mesma tabela e o resultado dependeria de quem chegasse
 * primeiro.
 */
export async function conectarBancoDoWorker(urlAdmin: string): Promise<Pool> {
  const worker = process.env.VITEST_WORKER_ID ?? '1'
  const banco = `mycash_teste_${worker}`

  const admin = new Pool({ connectionString: urlAdmin })
  try {
    await admin.query(`drop database if exists ${banco}`)
    await admin.query(`create database ${banco} template ${DB_TEMPLATE}`)
  } finally {
    await admin.end()
  }

  return new Pool({ connectionString: urlParaBanco(urlAdmin, banco) })
}

/**
 * Limpa as tabelas entre casos.
 *
 * `restart identity` reinicia as sequences: sem isso o `id_conta` muda a cada
 * execucao e qualquer assercao sobre id vira intermitente. `cascade` evita ter
 * de acertar a ordem manualmente quando uma FK nova aparecer.
 */
export async function limparTabelas(pool: Pool): Promise<void> {
  await pool.query(`truncate table ${TABELAS.map((t) => `public.${t}`).join(', ')} restart identity cascade`)
}
