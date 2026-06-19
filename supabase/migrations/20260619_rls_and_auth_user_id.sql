-- ============================================================================
-- RLS base + sincronizacao auth.users <-> public.usuarios
-- Aplica em supabase.com/dashboard -> SQL Editor (cole tudo e clique Run).
-- Idempotente: pode rodar varias vezes sem efeito colateral.
-- IMPORTANTE: aplique este arquivo ANTES do 20260417_pluggy_integration.sql,
-- pois as policies do Pluggy referenciam auth_user_id.
-- ============================================================================

-- 1) Coluna auth_user_id em public.usuarios (link com Supabase Auth)
alter table public.usuarios
  add column if not exists auth_user_id uuid unique
    references auth.users(id) on delete cascade;

create index if not exists idx_usuarios_auth_user_id
  on public.usuarios(auth_user_id);

-- 2) Trigger: cria automaticamente a linha em public.usuarios
-- quando um novo registro aparece em auth.users (signup, OAuth, magic link).
-- SECURITY DEFINER bypassa RLS na criacao.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se ja existe um usuarios com esse email (legado, sem auth_user_id),
  -- apenas linka o auth_user_id. Caso contrario, insere uma nova linha.
  update public.usuarios
    set auth_user_id = new.id
    where email = new.email
      and auth_user_id is null;

  if not found then
    insert into public.usuarios (auth_user_id, nome_completo, email, senha_hash)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'nome_completo',
               split_part(new.email, '@', 1)),
      new.email,
      'managed_by_supabase_auth'
    );
  end if;

  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- 3) Backfill: linka usuarios existentes (sem auth_user_id) com auth.users
-- via email. Roda uma vez; idempotente.
update public.usuarios u
set auth_user_id = au.id
from auth.users au
where lower(u.email) = lower(au.email)
  and u.auth_user_id is null;

-- 4) Habilita RLS em todas as tabelas base
alter table public.usuarios          enable row level security;
alter table public.contas_bancarias  enable row level security;
alter table public.transacoes        enable row level security;
alter table public.metas_financeiras enable row level security;
alter table public.lembretes         enable row level security;
alter table public.notificacoes      enable row level security;

-- 5) Helper: id_usuario do usuario logado (evita repetir o subquery)
create or replace function public.current_id_usuario()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id_usuario from public.usuarios where auth_user_id = auth.uid()
$$;

-- 6) Policies — public.usuarios
drop policy if exists "usuarios_own_select" on public.usuarios;
create policy "usuarios_own_select" on public.usuarios
  for select using (auth_user_id = auth.uid());

drop policy if exists "usuarios_own_update" on public.usuarios;
create policy "usuarios_own_update" on public.usuarios
  for update using (auth_user_id = auth.uid())
            with check (auth_user_id = auth.uid());

-- INSERT em usuarios: apenas o trigger (security definer) faz isso.
-- Nao expomos INSERT direto pelo client.

-- 7) Policies — public.contas_bancarias
drop policy if exists "contas_own" on public.contas_bancarias;
create policy "contas_own" on public.contas_bancarias
  for all
  using (id_usuario = public.current_id_usuario())
  with check (id_usuario = public.current_id_usuario());

-- 8) Policies — public.transacoes (via id_conta -> contas_bancarias)
drop policy if exists "transacoes_own" on public.transacoes;
create policy "transacoes_own" on public.transacoes
  for all
  using (
    id_conta in (
      select id_conta from public.contas_bancarias
      where id_usuario = public.current_id_usuario()
    )
  )
  with check (
    id_conta in (
      select id_conta from public.contas_bancarias
      where id_usuario = public.current_id_usuario()
    )
  );

-- 9) Policies — public.metas_financeiras
drop policy if exists "metas_own" on public.metas_financeiras;
create policy "metas_own" on public.metas_financeiras
  for all
  using (id_usuario = public.current_id_usuario())
  with check (id_usuario = public.current_id_usuario());

-- 10) Policies — public.lembretes
drop policy if exists "lembretes_own" on public.lembretes;
create policy "lembretes_own" on public.lembretes
  for all
  using (id_usuario = public.current_id_usuario())
  with check (id_usuario = public.current_id_usuario());

-- 11) Policies — public.notificacoes
drop policy if exists "notificacoes_own" on public.notificacoes;
create policy "notificacoes_own" on public.notificacoes
  for all
  using (id_usuario = public.current_id_usuario())
  with check (id_usuario = public.current_id_usuario());

-- ============================================================================
-- Apos rodar este script:
--   1. Confirme que as tabelas em Table Editor mostram badge verde
--      (RLS enabled) em vez de UNRESTRICTED
--   2. Aplique tambem o 20260417_pluggy_integration.sql para criar
--      pluggy_connections e pluggy_webhook_events
-- ============================================================================
