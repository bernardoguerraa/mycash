-- ============================================================================
-- Pluggy (Open Finance) integration
-- Estende tabelas existentes; não recria nada.
-- Rode no Supabase Dashboard → SQL Editor.
-- ============================================================================

-- 1) contas_bancarias: vínculo Pluggy + status de sincronização
alter table public.contas_bancarias
  add column if not exists pluggy_item_id text,
  add column if not exists pluggy_account_id text unique,
  add column if not exists pluggy_status text,
  add column if not exists pluggy_last_error text,
  add column if not exists origem text default 'manual' check (origem in ('manual','pluggy'));

create index if not exists idx_contas_pluggy_item on public.contas_bancarias(pluggy_item_id);

-- 2) transacoes: idempotência via pluggy_tx_id
alter table public.transacoes
  add column if not exists pluggy_tx_id text unique,
  add column if not exists origem text default 'manual' check (origem in ('manual','pluggy')),
  add column if not exists raw_data jsonb;

create index if not exists idx_transacoes_pluggy_tx on public.transacoes(pluggy_tx_id);

-- 3) pluggy_connections: 1 linha por "item" Pluggy (conexão com banco)
-- Um item pode ter N contas; por isso fica separado de contas_bancarias.
create table if not exists public.pluggy_connections (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id_usuario) on delete cascade,
  pluggy_item_id text unique not null,
  connector_id int,
  institution_name text,
  status text default 'UPDATING',
  execution_status text,
  last_updated_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pluggy_conn_usuario on public.pluggy_connections(id_usuario);

-- 4) pluggy_webhook_events: log bruto de webhooks (debug + idempotência)
create table if not exists public.pluggy_webhook_events (
  id bigserial primary key,
  event_id text unique,
  event_type text not null,
  pluggy_item_id text,
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

create index if not exists idx_pluggy_wh_item on public.pluggy_webhook_events(pluggy_item_id);
create index if not exists idx_pluggy_wh_processed on public.pluggy_webhook_events(processed);

-- 5) RLS
alter table public.pluggy_connections enable row level security;

-- Policy: usuário só vê suas próprias conexões.
-- Assumimos que auth.uid() mapeia para usuarios via coluna auth_user_id;
-- se seu mapeamento for diferente, ajuste aqui.
drop policy if exists "own_connections_select" on public.pluggy_connections;
create policy "own_connections_select" on public.pluggy_connections
  for select using (
    id_usuario in (
      select id_usuario from public.usuarios where auth_user_id = auth.uid()
    )
  );

drop policy if exists "own_connections_modify" on public.pluggy_connections;
create policy "own_connections_modify" on public.pluggy_connections
  for all using (
    id_usuario in (
      select id_usuario from public.usuarios where auth_user_id = auth.uid()
    )
  );

-- webhook_events: só service_role escreve/lê
alter table public.pluggy_webhook_events enable row level security;

-- 6) Helper: timestamp de update automático
create or replace function public.pluggy_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_pluggy_conn_touch on public.pluggy_connections;
create trigger trg_pluggy_conn_touch
  before update on public.pluggy_connections
  for each row execute procedure public.pluggy_touch_updated_at();
