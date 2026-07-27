-- ============================================================
--  Automind · Migración Multi-Tenant
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
--
--  Modelo:
--    agencies    → Tu empresa (ej: Coperva) — nivel plataforma
--    workspaces  → Cada agencia automotriz que opera la plataforma
--    users       → Pertenecen a un workspace
--    inventario  → Pertenece a un workspace
--    financieras → Pertenecen a un workspace
-- ============================================================

-- ── 1. Tabla agencies — agregar campos multi-tenant ──────────
-- (la tabla agencies ya existe con: id, nombre, ciudad, iniciales, accent, sidebar)
alter table agencies
  add column if not exists owner_email text,
  add column if not exists plan        text default 'pro';

-- ── 2. Tabla workspaces (cada agencia automotriz) ────────────
create table if not exists workspaces (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  nombre      text not null,
  ciudad      text,
  iniciales   text,
  accent      text default '#2f6fed',
  sidebar     text default '#1b2a57',
  status      text default 'active' check (status in ('active','suspended','trial')),
  created_at  timestamptz default now()
);
create index if not exists idx_workspaces_agency on workspaces(agency_id);

-- ── 3. Membresías de agencia (quién puede gestionar workspaces) ─
create table if not exists agency_memberships (
  id         uuid primary key default uuid_generate_v4(),
  agency_id  uuid not null references agencies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'agency_member'
             check (role in ('agency_owner','agency_admin','agency_support','agency_member')),
  created_at timestamptz default now(),
  unique (agency_id, user_id)
);
create index if not exists idx_agency_memberships_user on agency_memberships(user_id);

-- ── 4. Membresías de workspace (rol dentro de cada subcuenta) ──
create table if not exists workspace_memberships (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'workspace_member'
               check (role in ('workspace_owner','workspace_admin','workspace_member','workspace_viewer')),
  created_at   timestamptz default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_memberships_user on workspace_memberships(user_id);
create index if not exists idx_workspace_memberships_ws   on workspace_memberships(workspace_id);

-- ── 5. Agregar workspace_id a tablas existentes ──────────────
-- users
alter table users add column if not exists workspace_id uuid references workspaces(id);
create index if not exists idx_users_workspace on users(workspace_id);

-- inventario
alter table inventario add column if not exists workspace_id uuid references workspaces(id);
create index if not exists idx_inventario_workspace on inventario(workspace_id);

-- financieras
alter table financieras add column if not exists workspace_id uuid references workspaces(id);
create index if not exists idx_financieras_workspace on financieras(workspace_id);

-- ── 6. Migrar datos existentes ───────────────────────────────

-- 6a. Crear la agencia raíz (Coperva / tu empresa)
insert into agencies (id, nombre, ciudad, iniciales, owner_email, plan)
values ('10000000-0000-0000-0000-000000000001', 'Coperva', 'Ciudad de México', 'CP', 'otellez@coperva.com', 'pro')
on conflict (id) do update set owner_email = 'otellez@coperva.com', plan = 'pro';

-- 6b. Migrar agencies actuales → workspaces bajo Coperva
insert into workspaces (id, agency_id, nombre, ciudad, iniciales, accent, sidebar)
select
  id,
  '10000000-0000-0000-0000-000000000001',
  nombre,
  ciudad,
  iniciales,
  accent,
  sidebar
from (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Grupo Automotriz Vallarta', 'Puerto Vallarta', 'GAV', '#2f6fed', '#1b2a57'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'Agencia Monterrey Norte',   'Monterrey',       'AMN', '#1f9d57', '#15233f')
) as t(id, nombre, ciudad, iniciales, accent, sidebar)
on conflict (id) do nothing;

-- 6c. Actualizar workspace_id en users (usar el agency_id que ya tienen)
update users set workspace_id = agency_id where workspace_id is null and agency_id is not null;

-- 6d. Actualizar workspace_id en inventario
update inventario set workspace_id = agency_id where workspace_id is null and agency_id is not null;

-- 6e. Actualizar workspace_id en financieras
update financieras set workspace_id = agency_id where workspace_id is null and agency_id is not null;

-- 6f. Agregar Oscar como agency_owner de Coperva
insert into agency_memberships (agency_id, user_id, role)
select
  '10000000-0000-0000-0000-000000000001',
  au.id,
  'agency_owner'
from auth.users au
where au.email = 'otellez@coperva.com'
on conflict (agency_id, user_id) do update set role = 'agency_owner';

-- ── 7. Funciones helper para RLS ─────────────────────────────

-- Devuelve el agency_id del usuario autenticado (desde agency_memberships)
create or replace function my_agency_id_new()
returns uuid language sql stable security definer as $$
  select agency_id from agency_memberships
  where user_id = auth.uid() limit 1;
$$;

-- Devuelve true si el usuario es agency_owner o agency_admin
create or replace function is_agency_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from agency_memberships
    where user_id = auth.uid()
    and role in ('agency_owner','agency_admin')
  );
$$;

-- Devuelve los workspace_ids accesibles para el usuario autenticado
create or replace function my_workspace_ids()
returns setof uuid language sql stable security definer as $$
  -- Si es agency owner/admin → todos los workspaces de su agencia
  select w.id from workspaces w
  inner join agency_memberships am on am.agency_id = w.agency_id
  where am.user_id = auth.uid()
    and am.role in ('agency_owner','agency_admin','agency_support')
  union
  -- Si es miembro de workspace → solo sus workspaces asignados
  select wm.workspace_id from workspace_memberships wm
  where wm.user_id = auth.uid();
$$;

-- ── 8. RLS para nuevas tablas ────────────────────────────────
alter table agencies           enable row level security;
alter table workspaces         enable row level security;
alter table agency_memberships enable row level security;
alter table workspace_memberships enable row level security;

-- agencies: solo el owner ve su agencia
create policy "agencies_select" on agencies for select
  using (id = my_agency_id_new());

-- workspaces: usuarios ven workspaces a los que tienen acceso
create policy "workspaces_select" on workspaces for select
  using (id = any(select my_workspace_ids()));

create policy "workspaces_insert" on workspaces for insert
  with check (agency_id = my_agency_id_new() and is_agency_admin());

create policy "workspaces_update" on workspaces for update
  using (agency_id = my_agency_id_new() and is_agency_admin());

-- agency_memberships
create policy "agency_mem_select" on agency_memberships for select
  using (agency_id = my_agency_id_new());

-- workspace_memberships
create policy "workspace_mem_select" on workspace_memberships for select
  using (workspace_id = any(select my_workspace_ids()));

-- ── 9. Actualizar RLS de tablas existentes ───────────────────
-- Reemplazar my_agency_id() por workspace-aware policies

drop policy if exists "users_select" on users;
drop policy if exists "users_insert" on users;
drop policy if exists "users_update" on users;
drop policy if exists "users_delete" on users;

create policy "users_select" on users for select
  using (workspace_id = any(select my_workspace_ids()));
create policy "users_insert" on users for insert
  with check (workspace_id = any(select my_workspace_ids()));
create policy "users_update" on users for update
  using (workspace_id = any(select my_workspace_ids()));
create policy "users_delete" on users for delete
  using (workspace_id = any(select my_workspace_ids()));

drop policy if exists "inv_select" on inventario;
drop policy if exists "inv_insert" on inventario;
drop policy if exists "inv_update" on inventario;
drop policy if exists "inv_delete" on inventario;

create policy "inv_select" on inventario for select
  using (workspace_id = any(select my_workspace_ids()));
create policy "inv_insert" on inventario for insert
  with check (workspace_id = any(select my_workspace_ids()));
create policy "inv_update" on inventario for update
  using (workspace_id = any(select my_workspace_ids()));
create policy "inv_delete" on inventario for delete
  using (workspace_id = any(select my_workspace_ids()));

drop policy if exists "fin_select" on financieras;
drop policy if exists "fin_insert" on financieras;
drop policy if exists "fin_update" on financieras;
drop policy if exists "fin_delete" on financieras;

create policy "fin_select" on financieras for select
  using (workspace_id = any(select my_workspace_ids()));
create policy "fin_insert" on financieras for insert
  with check (workspace_id = any(select my_workspace_ids()));
create policy "fin_update" on financieras for update
  using (workspace_id = any(select my_workspace_ids()));
create policy "fin_delete" on financieras for delete
  using (workspace_id = any(select my_workspace_ids()));

-- ── FIN ──────────────────────────────────────────────────────
-- Después de ejecutar este SQL:
-- 1. Verifica que Oscar tenga agency_membership con role='agency_owner'
-- 2. El login mostrará un selector de workspaces para Oscar
-- 3. Los directores/vendedores entran directo a su workspace
