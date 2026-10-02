#!/bin/sh
# =============================================================================
# Aplica o schema versionado no servico `db` do compose.
#
# Vive em arquivo proprio, e nao embutido no compose.yaml, por um motivo
# concreto: o Compose interpola `$` antes de o shell ver o conteudo. Num
# script inline, `$f` do laco virava string vazia e o `$$` que delimita corpo
# de funcao no PL/pgSQL virava um `$` solitario, quebrando o SQL. Script em
# arquivo montado nao passa pelo interpolador.
#
# Idempotente: as migrations usam `if not exists`, entao rodar de novo num
# banco ja migrado nao falha. E o que permite deixar o servico no
# `docker compose up` sem precisar lembrar de pular este passo.
# =============================================================================
set -eu

PGUSER="${POSTGRES_USER:-mycash}"
PGDATABASE="${POSTGRES_DB:-mycash}"
PGHOST="${POSTGRES_HOST:-db}"

executar() {
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 "$@"
}

# -----------------------------------------------------------------------------
# O schema `auth` vem da plataforma Supabase, nao do repositorio.
#
# As migrations de RLS referenciam auth.uid() e auth.users, que no projeto
# hospedado sao criados pelo proprio Supabase. Num Postgres cru eles nao
# existem, entao precisam de stub antes — e o mesmo stub que
# tests/integracao/banco-efemero.ts cria para o Testcontainers.
# -----------------------------------------------------------------------------
echo "==> stub do schema auth (plataforma Supabase, fora do repo)"
executar <<'SQL'
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
  language sql stable as $fn$ select null::uuid $fn$;

create or replace function auth.role() returns text
  language sql stable as $fn$ select 'authenticated'::text $fn$;
SQL

# -----------------------------------------------------------------------------
# Ordem fixa e obrigatoria.
#
# schema_base cria as seis tabelas centrais; as outras duas fazem
# `alter table` nelas. Inverter a ordem faz a migration do Pluggy falhar em
# tabela inexistente — e existe um teste de integracao que protege exatamente
# isso (schema.test.ts, 'migrationDoPluggy_aplicada_estendeContasETransacoes').
#
# Este laco e o unico lugar executavel onde essa ordem esta declarada. Antes
# ela vivia em comentario e na memoria de quem rodou no painel do Supabase.
# -----------------------------------------------------------------------------
MIGRATIONS="
/migrations/20260911_schema_base.sql
/migrations/20260619_rls_and_auth_user_id.sql
/migrations/20260417_pluggy_integration.sql
"

for arquivo in $MIGRATIONS; do
  echo "==> $arquivo"
  executar -f "$arquivo"
done

echo "==> schema aplicado com sucesso"
