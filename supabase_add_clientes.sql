-- Automind · Tabla CRM de Clientes
-- Correr en Supabase SQL Editor

create table if not exists clientes (
  id                   uuid primary key default gen_random_uuid(),
  -- Identificación
  nombre_completo      text not null,
  telefono             text,
  email                text,
  tipo_cliente         text check (tipo_cliente in ('Persona física','Persona moral')),
  -- Origen
  canal_origen         text check (canal_origen in ('Digital','Piso','Referido','Marketplace','Otro')),
  fuente_especifica    text,
  -- Perfil comercial
  interes_vehiculo     text,
  presupuesto_estimado numeric(12,2),
  forma_pago           text check (forma_pago in ('Contado','Crédito','No definido')),
  uso_vehiculo         text check (uso_vehiculo in ('Personal','Trabajo','Familiar')),
  -- Seguimiento
  etapa_proceso        text check (etapa_proceso in (
    'Prospección','Perfilamiento','Presentación','Cotización',
    'Expediente','Pago','Crédito','Cierre','Entrega'
  )) default 'Prospección',
  asesor_id            text,
  probabilidad_cierre  int check (probabilidad_cierre between 0 and 100),
  ultimo_contacto      date,
  -- Ubicación
  ciudad               text,
  estado_rep           text,
  -- Control
  proxima_accion       text,
  fecha_proxima_accion date,
  notas                text,
  -- Multi-tenant
  workspace_id         uuid references workspaces(id) on delete cascade,
  agency_id            uuid references agencies(id)   on delete cascade,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Índices útiles
create index if not exists clientes_workspace_idx on clientes(workspace_id);
create index if not exists clientes_etapa_idx     on clientes(etapa_proceso);
create index if not exists clientes_asesor_idx    on clientes(asesor_id);

-- RLS
alter table clientes enable row level security;

create policy "clientes_workspace_select" on clientes for select
  using (
    workspace_id in (
      select workspace_id from users where auth_user_id = auth.uid()
    ) or
    agency_id in (
      select agency_id from agency_memberships where user_id = auth.uid()
    )
  );

create policy "clientes_workspace_insert" on clientes for insert
  with check (
    workspace_id in (
      select workspace_id from users where auth_user_id = auth.uid()
    ) or
    agency_id in (
      select agency_id from agency_memberships where user_id = auth.uid()
    )
  );

create policy "clientes_workspace_update" on clientes for update
  using (
    workspace_id in (
      select workspace_id from users where auth_user_id = auth.uid()
    ) or
    agency_id in (
      select agency_id from agency_memberships where user_id = auth.uid()
    )
  );

create policy "clientes_workspace_delete" on clientes for delete
  using (
    workspace_id in (
      select workspace_id from users where auth_user_id = auth.uid()
    ) or
    agency_id in (
      select agency_id from agency_memberships where user_id = auth.uid()
    )
  );

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists clientes_updated_at on clientes;
create trigger clientes_updated_at before update on clientes
  for each row execute function set_updated_at();
