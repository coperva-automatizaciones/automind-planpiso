-- ============================================================
--  Automind · Financieras a nivel Agencia (v2)
--
--  Modelo corregido:
--    agencies       → define las financieras globales (BBVA, Banorte, etc.)
--    workspaces     → usan las financieras de su agencia
--    inventario     → cada vehículo referencia una financiera
--
--  Una financiera pertenece a la AGENCIA, no al workspace.
--  Un workspace no puede crear sus propias financieras —
--  solo el agency_owner (Oscar) las administra.
-- ============================================================

-- ── 1. Cambiar financieras de workspace_id → agency_id ──────
-- Agregar agency_id si no existe
alter table financieras
  add column if not exists agency_id uuid references agencies(id);

-- Poblar agency_id desde workspace → su agency
update financieras f
set agency_id = w.agency_id
from workspaces w
where f.workspace_id = w.id
  and f.agency_id is null;

-- Fallback: si workspace_id apunta directo a agencies (schema viejo)
update financieras f
set agency_id = f.workspace_id
where f.agency_id is null
  and exists (select 1 from agencies a where a.id = f.workspace_id);

-- ── 2. Tabla workspace_financieras — qué financieras usa cada WS ─
create table if not exists workspace_financieras (
  id             uuid primary key default uuid_generate_v4(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  financiera_id  uuid not null references financieras(id) on delete cascade,
  -- Overrides opcionales por workspace (dejan null para usar los globales)
  tasa_override          numeric,
  plazo_dias_override    int,
  dias_gracia_override   int,
  activa         boolean not null default true,
  created_at     timestamptz default now(),
  unique (workspace_id, financiera_id)
);
create index if not exists idx_wf_workspace    on workspace_financieras(workspace_id);
create index if not exists idx_wf_financiera   on workspace_financieras(financiera_id);

-- ── 3. Seed: vincular financieras existentes con sus workspaces ──
-- Todas las financieras de la agencia quedan disponibles para todos los WS
insert into workspace_financieras (workspace_id, financiera_id)
select
  w.id as workspace_id,
  f.id as financiera_id
from workspaces w
cross join financieras f
where f.agency_id = w.agency_id
  and f.activa = true
on conflict (workspace_id, financiera_id) do nothing;

-- ── 4. RLS para financieras — ahora usa agency_id ────────────
drop policy if exists "fin_select" on financieras;
drop policy if exists "fin_insert" on financieras;
drop policy if exists "fin_update" on financieras;
drop policy if exists "fin_delete" on financieras;

-- Función helper: obtener agency_id del usuario autenticado
create or replace function my_agency_id_for_fins()
returns uuid language sql stable security definer as $$
  -- Agency owners
  select agency_id from agency_memberships
  where user_id = auth.uid() limit 1;
$$;

-- También usuarios de workspace pueden ver las financieras de su agencia
create or replace function can_see_financieras()
returns setof uuid language sql stable security definer as $$
  -- Agency owners: su agencia
  select agency_id from agency_memberships where user_id = auth.uid()
  union
  -- Workspace members: la agencia del workspace al que pertenecen
  select w.agency_id from workspaces w
  inner join users u on u.workspace_id = w.id or u.agency_id = w.id
  where u.auth_user_id = auth.uid();
$$;

create policy "fin_select" on financieras for select
  using (agency_id = any(select can_see_financieras()));

-- Solo agency_owner puede crear/editar/borrar financieras
create policy "fin_insert" on financieras for insert
  with check (agency_id = my_agency_id_for_fins());

create policy "fin_update" on financieras for update
  using (agency_id = my_agency_id_for_fins());

create policy "fin_delete" on financieras for delete
  using (agency_id = my_agency_id_for_fins());

-- ── 5. RLS para workspace_financieras ────────────────────────
alter table workspace_financieras enable row level security;

create policy "wf_select" on workspace_financieras for select
  using (workspace_id = any(select my_workspace_ids()));

create policy "wf_insert" on workspace_financieras for insert
  with check (workspace_id = any(select my_workspace_ids()));

create policy "wf_update" on workspace_financieras for update
  using (workspace_id = any(select my_workspace_ids()));

-- ── 6. Seed financieras a nivel agencia (Coperva = id 10000…) ──
-- Si ya tienes financieras con workspace_id, las actualizamos a agency_id
-- y dejamos workspace_id como referencia pero ya no lo usamos como tenant
insert into financieras (agency_id, nombre, tasa, plazo_dias, dias_gracia_extra, activa)
select
  '10000000-0000-0000-0000-000000000001',
  nombre, tasa, plazo_dias, dias_gracia_extra, true
from (values
  ('Coperva',   0.14::numeric, 90, 0),
  ('BBVA',      0.15::numeric, 60, 0),
  ('Banorte',   0.13::numeric, 90, 15),
  ('Santander', 0.16::numeric, 60, 0),
  ('HSBC',      0.14::numeric, 75, 0)
) as t(nombre, tasa, plazo_dias, dias_gracia_extra)
where not exists (
  select 1 from financieras f2
  where f2.agency_id = '10000000-0000-0000-0000-000000000001'
    and f2.nombre = t.nombre
);

-- Vincular todas las financieras de la agencia a los workspaces existentes
insert into workspace_financieras (workspace_id, financiera_id)
select w.id, f.id
from workspaces w
cross join financieras f
where f.agency_id = w.agency_id
  and f.activa = true
on conflict (workspace_id, financiera_id) do nothing;

-- ── FIN ──────────────────────────────────────────────────────
-- Reglas del modelo:
--   ✓ Solo agency_owner (Oscar) crea/edita financieras
--   ✓ Todos los workspaces de la agencia ven las mismas financieras
--   ✓ Cada workspace puede tener overrides de tasa/plazo en workspace_financieras
--   ✓ El inventario sigue referenciando financiera por nombre (campo texto)
--     — en una versión futura se puede migrar a financiera_id (uuid)
