-- ============================================================================
-- Schema base do MyCash: as seis tabelas centrais
--
-- POR QUE ESTA MIGRATION EXISTE
-- As tabelas `usuarios`, `contas_bancarias`, `transacoes`, `metas_financeiras`,
-- `lembretes` e `notificacoes` foram criadas a mao pelo dashboard do Supabase
-- e nunca versionadas. Na pratica o projeto nao podia ser recriado do zero, e
-- um drop acidental nao teria de onde voltar.
--
-- O gatilho imediato e o teste de integracao: o Testcontainers sobe um
-- Postgres vazio, entao sem esta migration nao ha schema contra o que testar.
--
-- ORDEM DE APLICACAO (do zero)
--   1. 20260911_schema_base.sql          <- este arquivo
--   2. 20260619_rls_and_auth_user_id.sql
--   3. 20260417_pluggy_integration.sql
-- As datas nos nomes nao refletem a ordem: as outras duas ja existiam quando
-- esta foi escrita. O cabecalho de cada uma manda no encadeamento.
--
-- COMO ESTE ARQUIVO FOI DERIVADO
-- De `src/types/database.ts` (352 linhas, tipado) somado ao uso real nas
-- rotas de `/api/*`. Nao foi extraido do banco de producao — o acesso
-- administrativo nao estava disponivel. Antes de tratar este arquivo como
-- fonte da verdade, rode `supabase/verificacao-schema.sql` no SQL Editor de
-- producao e confira as divergencias. Os pontos de inferencia estao marcados
-- com "INFERIDO" abaixo.
--
-- Idempotente: pode rodar varias vezes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tipos enumerados
--
-- Sao enums de verdade, e nao `text` com check, porque `Database['public']
-- ['Enums']` em src/types/database.ts declara os seis com nome snake_case —
-- o formato que o gerador do Supabase usa para tipos reais do Postgres.
-- As colunas do Pluggy (`origem`) continuam text + check, como na migration
-- 20260417.
--
-- `create type` nao aceita `if not exists`, dai o bloco condicional.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plano_usuario') then
    create type public.plano_usuario as enum ('Free', 'Premium');
  end if;

  if not exists (select 1 from pg_type where typname = 'status_conta') then
    create type public.status_conta as enum ('Ativo', 'Inativo', 'Bloqueado');
  end if;

  if not exists (select 1 from pg_type where typname = 'tipo_transacao') then
    create type public.tipo_transacao as enum ('Entrada', 'Saida');
  end if;

  if not exists (select 1 from pg_type where typname = 'status_meta') then
    create type public.status_meta as enum ('EmAndamento', 'Concluida', 'Cancelada');
  end if;

  if not exists (select 1 from pg_type where typname = 'tipo_lembrete') then
    create type public.tipo_lembrete as enum ('ContaPagar', 'ContaReceber');
  end if;

  if not exists (select 1 from pg_type where typname = 'tipo_notificacao') then
    create type public.tipo_notificacao as enum ('Sistema', 'Meta', 'Lembrete', 'Alerta');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 2) usuarios
--
-- `auth_user_id` NAO e criada aqui: ela pertence a 20260619_rls_and_auth_user_id,
-- que tambem cria o trigger de sincronizacao com auth.users. Duplicar a coluna
-- em dois arquivos faria com que mexer numa esquecesse a outra.
--
-- `email` e unico porque tanto o trigger `handle_new_auth_user` quanto o
-- backfill daquela migration casam usuario por email — sem a restricao, um
-- email repetido faria o backfill linkar a linha errada.
--
-- `senha_hash` e not null por historico: o cadastro proprio do sistema vinha
-- antes do Supabase Auth. Hoje o trigger grava a constante
-- 'managed_by_supabase_auth' para contas criadas pelo Auth.
-- ----------------------------------------------------------------------------

create table if not exists public.usuarios (
  id_usuario    bigserial primary key,
  nome_completo text        not null,
  email         text        not null unique,
  senha_hash    text        not null,
  data_cadastro timestamptz not null default now(),
  plano         public.plano_usuario not null default 'Free',
  status_conta  public.status_conta  not null default 'Ativo'
);

-- ----------------------------------------------------------------------------
-- 3) contas_bancarias
--
-- As colunas do Pluggy (pluggy_item_id, pluggy_account_id, pluggy_status,
-- pluggy_last_error, origem) ficam em 20260417_pluggy_integration.
--
-- `saldo_atual` e numeric(14,2), nao float: dinheiro em ponto flutuante
-- acumula residuo binario (0.1 + 0.2 = 0.30000000000000004), e o saldo e
-- somado a cada lancamento pelo dominio.
--
-- `on delete cascade`: apagar o usuario apaga as contas dele. Deixar contas
-- orfas sem dono nenhum quebraria a RLS, que filtra justamente por usuario.
-- ----------------------------------------------------------------------------

create table if not exists public.contas_bancarias (
  id_conta     bigserial primary key,
  id_usuario   bigint        not null references public.usuarios(id_usuario) on delete cascade,
  instituicao  text          not null,
  numero_conta text          not null,
  tipo_conta   text          not null,
  saldo_atual  numeric(14,2) not null default 0,
  ultima_sync  timestamptz   not null default now()
);

create index if not exists idx_contas_id_usuario
  on public.contas_bancarias(id_usuario);

-- ----------------------------------------------------------------------------
-- 4) transacoes
--
-- INFERIDO: `data_transacao` como timestamptz, e nao date. As rotas comparam
-- a coluna com `.toISOString()` completo (src/app/api/dashboard/route.ts faz
-- `.gte('data_transacao', inicioSerie.toISOString())`) e a sincronizacao do
-- Pluggy traz horario junto. Se em producao for `date`, ajuste aqui — a
-- diferenca aparece no recorte por periodo.
--
-- Nao ha vinculo direto com `usuarios`: a transacao pertence a uma conta, e a
-- conta a um usuario. A RLS chega ate o dono por esse caminho.
--
-- `valor` e sempre positivo; o sinal vem de `tipo`. Permitir negativo criaria
-- duas representacoes para a mesma coisa (saida de 50 e entrada de -50) e o
-- saldo passaria a depender de qual foi gravada. A regra vive em
-- src/domain/saldo.ts; o check abaixo e a rede de seguranca no banco.
-- ----------------------------------------------------------------------------

create table if not exists public.transacoes (
  id_transacao   bigserial primary key,
  id_conta       bigint        not null references public.contas_bancarias(id_conta) on delete cascade,
  data_transacao timestamptz   not null default now(),
  tipo           public.tipo_transacao not null,
  categoria      text          not null,
  descricao      text          not null,
  valor          numeric(14,2) not null check (valor > 0)
);

create index if not exists idx_transacoes_id_conta
  on public.transacoes(id_conta);

-- O painel e a tela de Transacoes filtram por periodo em ordem decrescente.
create index if not exists idx_transacoes_data
  on public.transacoes(data_transacao desc);

-- ----------------------------------------------------------------------------
-- 5) metas_financeiras
--
-- `data_inicio` e `data_limite` sao `date`: a API envia e recebe 'YYYY-MM-DD'
-- e nenhuma regra usa horario. Guardar como timestamptz obrigaria a converter
-- fuso a cada leitura — foi exatamente essa conversao que fez o grafico do
-- painel contar o dia 1 no mes anterior.
--
-- O check de prazo espelha `validarPrazo` em src/domain/metas.ts.
-- ----------------------------------------------------------------------------

create table if not exists public.metas_financeiras (
  id_meta        bigserial primary key,
  id_usuario     bigint        not null references public.usuarios(id_usuario) on delete cascade,
  titulo         text          not null,
  valor_objetivo numeric(14,2) not null check (valor_objetivo > 0),
  valor_atual    numeric(14,2) not null default 0 check (valor_atual >= 0),
  data_inicio    date          not null default current_date,
  data_limite    date          not null,
  status         public.status_meta not null default 'EmAndamento',
  constraint metas_prazo_valido check (data_limite > data_inicio)
);

create index if not exists idx_metas_id_usuario
  on public.metas_financeiras(id_usuario);

-- ----------------------------------------------------------------------------
-- 6) lembretes
-- ----------------------------------------------------------------------------

create table if not exists public.lembretes (
  id_lembrete     bigserial primary key,
  id_usuario      bigint        not null references public.usuarios(id_usuario) on delete cascade,
  descricao       text          not null,
  data_vencimento date          not null,
  valor_previsto  numeric(14,2) not null check (valor_previsto > 0),
  tipo            public.tipo_lembrete not null,
  ativo           boolean       not null default true
);

create index if not exists idx_lembretes_id_usuario
  on public.lembretes(id_usuario);

-- O painel busca lembretes ativos a vencer, ordenados por data.
create index if not exists idx_lembretes_vencimento
  on public.lembretes(data_vencimento) where ativo;

-- ----------------------------------------------------------------------------
-- 7) notificacoes
-- ----------------------------------------------------------------------------

create table if not exists public.notificacoes (
  id_notificacao    bigserial primary key,
  id_usuario        bigint      not null references public.usuarios(id_usuario) on delete cascade,
  mensagem          text        not null,
  data_notificacao  timestamptz not null default now(),
  lida              boolean     not null default false,
  tipo              public.tipo_notificacao not null
);

create index if not exists idx_notificacoes_id_usuario
  on public.notificacoes(id_usuario);

-- O sino do app conta as nao lidas a cada foco de tela.
create index if not exists idx_notificacoes_nao_lidas
  on public.notificacoes(id_usuario) where not lida;
