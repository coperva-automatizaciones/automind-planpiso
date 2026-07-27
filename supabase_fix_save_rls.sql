-- Fix completo: guardado de inventario no persiste para usuarios invitados.
-- Causas:
--   1. Columna semaforo_snapshot puede no existir → upsert falla silenciosamente
--   2. my_workspace_ids() solo mira workspace_memberships, no la tabla users
--   3. inv_update/inv_select solo verifican workspace_id, no agency_id (legacy)
--
-- Ejecutar en Supabase SQL Editor → Run.

-- ── 1. Columna semaforo_snapshot ─────────────────────────────────────────────
alter table inventario add column if not exists semaforo_snapshot text;

-- ── 2. Expandir my_workspace_ids() para incluir tabla users ──────────────────
create or replace function my_workspace_ids()
returns setof uuid language sql stable security definer as $$
  -- Agency owner/admin → todos los workspaces de su agencia
  select w.id from workspaces w
  inner join agency_memberships am on am.agency_id = w.agency_id
  where am.user_id = auth.uid()
    and am.role in ('agency_owner','agency_admin','agency_support')
  union
  -- Miembro explícito de workspace
  select wm.workspace_id from workspace_memberships wm
  where wm.user_id = auth.uid()
  union
  -- Usuario registrado en tabla users por workspace_id (flujo de invitación)
  select u.workspace_id from users u
  where u.auth_user_id = auth.uid() and u.workspace_id is not null
  union
  -- Usuario registrado en tabla users por agency_id (compatibilidad legacy)
  select u.agency_id from users u
  where u.auth_user_id = auth.uid() and u.agency_id is not null;
$$;

-- ── 3. Actualizar políticas RLS de inventario ─────────────────────────────────
-- Se agrega "or agency_id = any(...)" para cubrir rows legacy donde
-- workspace_id = agency_id y solo uno de los dos coincide con el usuario.

drop policy if exists "inv_select" on inventario;
drop policy if exists "inv_insert" on inventario;
drop policy if exists "inv_update" on inventario;
drop policy if exists "inv_delete" on inventario;

create policy "inv_select" on inventario for select
  using (
    workspace_id = any(select my_workspace_ids())
    or agency_id  = any(select my_workspace_ids())
  );

create policy "inv_insert" on inventario for insert
  with check (
    workspace_id = any(select my_workspace_ids())
    or agency_id  = any(select my_workspace_ids())
  );

create policy "inv_update" on inventario for update
  using (
    workspace_id = any(select my_workspace_ids())
    or agency_id  = any(select my_workspace_ids())
  );

create policy "inv_delete" on inventario for delete
  using (
    workspace_id = any(select my_workspace_ids())
    or agency_id  = any(select my_workspace_ids())
  );

-- ── 4. Backfill workspace_memberships (workspace_memberships no tiene columna role) ───
insert into workspace_memberships (workspace_id, user_id)
select u.workspace_id, u.auth_user_id
from users u
where u.auth_user_id is not null
  and u.workspace_id is not null
  and exists (select 1 from workspaces w where w.id = u.workspace_id)
on conflict (workspace_id, user_id) do nothing;

-- ── 5. Query de diagnóstico (ejecutar por separado si aún hay problemas) ──────
-- Muestra los workspace_ids de los últimos usuarios invitados:
-- select u.email, u.workspace_id, u.agency_id, u.auth_user_id,
--        exists(select 1 from workspace_memberships wm
--               where wm.user_id = u.auth_user_id) as tiene_membership
-- from users u
-- order by u.created_at desc nulls last limit 20;
