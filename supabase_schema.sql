-- ============================================================
--  Automind · Plan Piso — Supabase Schema
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 0. Extensiones ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. Agencias (tenants) ───────────────────────────────────
create table if not exists agencies (
  id        uuid primary key default uuid_generate_v4(),
  nombre    text not null,
  ciudad    text,
  iniciales text,
  accent    text default '#2f6fed',
  sidebar   text default '#1b2a57',
  created_at timestamptz default now()
);

-- ── 2. Usuarios ─────────────────────────────────────────────
-- Nota: el email aquí debe coincidir con el email de Supabase Auth
create table if not exists users (
  id           text primary key,           -- ej: "D1", "G1", "V3"
  agency_id    uuid not null references agencies(id) on delete cascade,
  auth_user_id uuid unique,                -- vinculado a auth.users.id al registrarse
  nombre       text not null,
  email        text not null unique,
  tel          text,
  rol          text not null check (rol in ('director','gerente','vendedor')),
  reporta_a    text references users(id),
  fecha_ingreso date,
  created_at   timestamptz default now()
);

-- ── 3. Inventario (vehículos) ────────────────────────────────
create table if not exists inventario (
  id                 text primary key,     -- ej: "INV-001"
  agency_id          uuid not null references agencies(id) on delete cascade,
  vin                text,
  marca              text,
  modelo             text,
  anio               int,
  color_exterior     text,
  color_interior     text,
  estatus            text default 'NUEVOS',
  inv                text,
  monto_financiado   numeric default 0,
  pct_interes        numeric default 0,
  dias_gracia_base   int default 0,
  dias_gracia_extra  int default 0,
  plazo_dias         int default 0,
  fecha_factura      date,
  fecha_llegada      date,
  foto_url           text,
  vendedor_id        text references users(id),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Actualiza updated_at automáticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_inventario_updated
  before update on inventario
  for each row execute procedure set_updated_at();

-- ── 4. Índices ───────────────────────────────────────────────
create index if not exists idx_users_agency      on users(agency_id);
create index if not exists idx_inventario_agency on inventario(agency_id);
create index if not exists idx_inventario_vend   on inventario(vendedor_id);

-- ── 5. Row Level Security ────────────────────────────────────
alter table agencies   enable row level security;
alter table users      enable row level security;
alter table inventario enable row level security;

-- Función helper: devuelve el agency_id del usuario autenticado
create or replace function my_agency_id()
returns uuid language sql stable as $$
  select agency_id from users where auth_user_id = auth.uid() limit 1;
$$;

-- agencies: cada usuario sólo ve su agencia
create policy "agency_select" on agencies for select
  using (id = my_agency_id());

-- users: cada usuario sólo ve usuarios de su agencia
create policy "users_select" on users for select
  using (agency_id = my_agency_id());

create policy "users_insert" on users for insert
  with check (agency_id = my_agency_id());

create policy "users_update" on users for update
  using (agency_id = my_agency_id());

create policy "users_delete" on users for delete
  using (agency_id = my_agency_id());

-- inventario: sólo su agencia
create policy "inv_select" on inventario for select
  using (agency_id = my_agency_id());

create policy "inv_insert" on inventario for insert
  with check (agency_id = my_agency_id());

create policy "inv_update" on inventario for update
  using (agency_id = my_agency_id());

create policy "inv_delete" on inventario for delete
  using (agency_id = my_agency_id());

-- ── 6. Seed — Agencia Demo 1: Grupo Automotriz Vallarta ──────
-- INSTRUCCIONES: después de crear los usuarios en Supabase Auth
-- (Authentication → Users → Invite user), copia aquí sus UUIDs
-- y actualiza los auth_user_id con UPDATE.

insert into agencies (id, nombre, ciudad, iniciales, accent, sidebar) values
  ('00000000-0000-0000-0000-000000000001', 'Grupo Automotriz Vallarta', 'Puerto Vallarta', 'GAV', '#2f6fed', '#1b2a57'),
  ('00000000-0000-0000-0000-000000000002', 'Agencia Monterrey Norte',   'Monterrey',       'AMN', '#1f9d57', '#15233f')
on conflict (id) do nothing;

-- Agencia 1 — usuarios
insert into users (id, agency_id, nombre, email, tel, rol, reporta_a, fecha_ingreso) values
  ('GAV-D1', '00000000-0000-0000-0000-000000000001', 'Carlos Mendoza',     'cmendoza@grupovallarta.mx',  '322 100 0001', 'director', null,       '2022-01-10'),
  ('GAV-G1', '00000000-0000-0000-0000-000000000001', 'Ana Torres',         'atorres@grupovallarta.mx',   '322 100 0002', 'gerente',  'GAV-D1',   '2022-03-15'),
  ('GAV-G2', '00000000-0000-0000-0000-000000000001', 'Roberto Salinas',    'rsalinas@grupovallarta.mx',  '322 100 0003', 'gerente',  'GAV-D1',   '2022-05-20'),
  ('GAV-V1', '00000000-0000-0000-0000-000000000001', 'Luis Hernández',     'lhernandez@grupovallarta.mx','322 100 0004', 'vendedor', 'GAV-G1',   '2023-01-08'),
  ('GAV-V2', '00000000-0000-0000-0000-000000000001', 'María González',     'mgonzalez@grupovallarta.mx', '322 100 0005', 'vendedor', 'GAV-G1',   '2023-02-14'),
  ('GAV-V3', '00000000-0000-0000-0000-000000000001', 'Jorge Ramírez',      'jramirez@grupovallarta.mx',  '322 100 0006', 'vendedor', 'GAV-G2',   '2023-03-22'),
  ('GAV-V4', '00000000-0000-0000-0000-000000000001', 'Sofía Castillo',     'scastillo@grupovallarta.mx', '322 100 0007', 'vendedor', 'GAV-G2',   '2023-06-01'),
  ('GAV-V5', '00000000-0000-0000-0000-000000000001', 'Diego Morales',      'dmorales@grupovallarta.mx',  '322 100 0008', 'vendedor', 'GAV-G2',   '2023-09-12')
on conflict (id) do nothing;

-- Agencia 2 — usuarios
insert into users (id, agency_id, nombre, email, tel, rol, reporta_a, fecha_ingreso) values
  ('AMN-D1', '00000000-0000-0000-0000-000000000002', 'Fernando Ruiz',      'fruiz@agenciamty.mx',        '81 200 0001', 'director', null,       '2021-06-01'),
  ('AMN-G1', '00000000-0000-0000-0000-000000000002', 'Patricia Vega',      'pvega@agenciamty.mx',        '81 200 0002', 'gerente',  'AMN-D1',   '2021-08-15'),
  ('AMN-V1', '00000000-0000-0000-0000-000000000002', 'Marco Gutiérrez',    'mgutierrez@agenciamty.mx',   '81 200 0003', 'vendedor', 'AMN-G1',   '2022-02-10'),
  ('AMN-V2', '00000000-0000-0000-0000-000000000002', 'Claudia Flores',     'cflores@agenciamty.mx',      '81 200 0004', 'vendedor', 'AMN-G1',   '2022-04-05'),
  ('AMN-V3', '00000000-0000-0000-0000-000000000002', 'Andrés López',       'alopez@agenciamty.mx',       '81 200 0005', 'vendedor', 'AMN-G1',   '2022-07-20')
on conflict (id) do nothing;

-- ── FIN ──────────────────────────────────────────────────────
-- Inventario de prueba se puede importar desde la app
-- o correr supabase_seed_inventario.sql (opcional)
