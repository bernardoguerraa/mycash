-- ============================================================================
-- Conferencia: a migration 20260911_schema_base.sql bate com producao?
--
-- POR QUE ISTO EXISTE
-- O schema base foi derivado de src/types/database.ts e do uso nas rotas, nao
-- extraido do banco. Antes de tratar a migration como fonte da verdade — e
-- antes de confiar nos testes de integracao que rodam contra ela — vale
-- confirmar que o que esta escrito e o que existe de fato.
--
-- COMO USAR
-- Cole no SQL Editor do Supabase (producao) e rode. Sao consultas de leitura:
-- nada e alterado. Compare cada bloco com a migration e ajuste o arquivo onde
-- divergir.
--
-- ONDE E MAIS PROVAVEL DIVERGIR
--   - tipo de `transacoes.data_transacao` (timestamptz ou date)
--   - enums reais vs colunas text com check
--   - defaults, nullability e checks que so existem no banco
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Colunas, tipos, nullability e defaults das seis tabelas centrais
-- ----------------------------------------------------------------------------
select
  table_name,
  ordinal_position as pos,
  column_name,
  data_type,
  coalesce(character_maximum_length::text, numeric_precision || ',' || numeric_scale, '') as tamanho,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'usuarios', 'contas_bancarias', 'transacoes',
    'metas_financeiras', 'lembretes', 'notificacoes'
  )
order by table_name, ordinal_position;

-- ----------------------------------------------------------------------------
-- 2) Tipos enumerados e seus valores
--
-- Se vier vazio, os "enums" sao na verdade colunas text com check — e a
-- migration precisa trocar os `create type` por constraints.
-- ----------------------------------------------------------------------------
select
  t.typname as enum_nome,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valores
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;

-- ----------------------------------------------------------------------------
-- 3) Chaves primarias, estrangeiras, unicidade e checks
--
-- Confere tambem o ON DELETE de cada FK: a migration assume cascade em todas.
-- ----------------------------------------------------------------------------
select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name  as referencia_tabela,
  ccu.column_name as referencia_coluna,
  rc.delete_rule
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
  and tc.constraint_type = 'FOREIGN KEY'
left join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'usuarios', 'contas_bancarias', 'transacoes',
    'metas_financeiras', 'lembretes', 'notificacoes'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- ----------------------------------------------------------------------------
-- 4) Expressao literal dos CHECK constraints
--
-- A consulta acima mostra que existe um check; esta mostra o que ele diz.
-- ----------------------------------------------------------------------------
select
  rel.relname as tabela,
  con.conname as constraint_nome,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and con.contype = 'c'
  and rel.relname in (
    'usuarios', 'contas_bancarias', 'transacoes',
    'metas_financeiras', 'lembretes', 'notificacoes'
  )
order by rel.relname, con.conname;

-- ----------------------------------------------------------------------------
-- 5) Indices existentes
--
-- Indice a mais em producao nao quebra nada, mas indice que a migration cria
-- e producao nao tem significa que a consulta e mais lenta la do que no teste.
-- ----------------------------------------------------------------------------
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'usuarios', 'contas_bancarias', 'transacoes',
    'metas_financeiras', 'lembretes', 'notificacoes'
  )
order by tablename, indexname;

-- ----------------------------------------------------------------------------
-- 6) RLS: esta ligada e quais policies existem
--
-- Pertence a 20260619_rls_and_auth_user_id, mas vale conferir junto: o teste
-- de integracao sobe um banco sem RLS por padrao, e a diferenca muda o que os
-- testes conseguem enxergar.
-- ----------------------------------------------------------------------------
select
  c.relname as tabela,
  c.relrowsecurity as rls_ligada,
  c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'usuarios', 'contas_bancarias', 'transacoes',
    'metas_financeiras', 'lembretes', 'notificacoes'
  )
order by c.relname;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ----------------------------------------------------------------------------
-- 7) Volume atual por tabela
--
-- Util para dimensionar os testes e para saber o que se perde num drop.
-- ----------------------------------------------------------------------------
select 'usuarios'          as tabela, count(*) from public.usuarios
union all select 'contas_bancarias',  count(*) from public.contas_bancarias
union all select 'transacoes',        count(*) from public.transacoes
union all select 'metas_financeiras', count(*) from public.metas_financeiras
union all select 'lembretes',         count(*) from public.lembretes
union all select 'notificacoes',      count(*) from public.notificacoes;
