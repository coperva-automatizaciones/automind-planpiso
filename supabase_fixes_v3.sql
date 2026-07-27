-- ============================================================
--  Automind · Fixes de auditoría (v3) — Junio 2026
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
--
--  ORDEN DE EJECUCIÓN de los scripts del repo:
--    1. supabase_schema.sql          (base)
--    2. supabase_multitenant.sql     (workspaces + RLS multi-tenant)
--    3. supabase_alerts.sql          (alert_rules + alert_log)
--    4. supabase_financieras_v2.sql  (financieras a nivel agencia — CANÓNICO)
--    5. supabase_fixes_v3.sql        (este archivo)
--
--  ⚠️ supabase_financieras.sql (v1) está OBSOLETO — no ejecutarlo,
--     restauraría un RLS contradictorio con el modelo multi-tenant.
--
--  Este script es idempotente: se puede ejecutar varias veces.
-- ============================================================

-- ── 1. Columna semaforo_snapshot ─────────────────────────────
-- db.js la lee y escribe para detectar cambios de semáforo.
-- Sin ella, CADA guardado/importación disparaba un email de alerta
-- (semaforoFrom siempre era null → "cambio" siempre detectado).
alter table inventario add column if not exists semaforo_snapshot text;

-- ── 2. my_workspace_ids: incluir el workspace de la tabla users ──
-- invite-user.ts solo inserta en `users` (nunca en workspace_memberships).
-- Bajo el RLS multitenant original, un usuario invitado NO podía ver
-- inventario/usuarios de su propio workspace. Esta versión deriva el
-- acceso también desde users.workspace_id / users.agency_id.
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
  -- Usuario registrado en la tabla users (flujo de invitación actual)
  select u.workspace_id from users u
  where u.auth_user_id = auth.uid() and u.workspace_id is not null
  union
  select u.agency_id from users u
  where u.auth_user_id = auth.uid() and u.agency_id is not null;
$$;

-- ── 3. Backfill de workspace_memberships desde users ─────────
-- Alinea el modelo de membresías con los usuarios ya invitados.
insert into workspace_memberships (workspace_id, user_id, role)
select u.workspace_id, u.auth_user_id, 'workspace_member'
from users u
where u.auth_user_id is not null
  and u.workspace_id is not null
  and exists (select 1 from workspaces w where w.id = u.workspace_id)
on conflict (workspace_id, user_id) do nothing;

-- ── 4. agencies_select: permitir leer la agencia del workspace ──
-- db.js (loadAgencyData) cae en un fallback que lee `agencies`;
-- la política original solo dejaba leer al agency owner.
drop policy if exists "agencies_select" on agencies;
create policy "agencies_select" on agencies for select
  using (
    id = my_agency_id_new()
    or id in (
      select w.agency_id from workspaces w
      where w.id in (select my_workspace_ids())
    )
    -- compat: workspaces "viejos" cuyo id vive directamente en agencies
    or id in (select my_workspace_ids())
  );

-- ── 5. Escrituras sobre users restringidas por rol ───────────
-- Antes cualquier miembro del workspace (p.ej. un vendedor) podía
-- editar/borrar a su director vía API directa.
create or replace function is_workspace_manager(ws uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from users me
    where me.auth_user_id = auth.uid()
      and me.rol in ('director','gerente')
      and (me.workspace_id = ws or me.agency_id = ws)
  ) or exists (
    select 1 from agency_memberships am
    join workspaces w on w.agency_id = am.agency_id
    where am.user_id = auth.uid()
      and w.id = ws
      and am.role in ('agency_owner','agency_admin')
  );
$$;

drop policy if exists "users_insert" on users;
drop policy if exists "users_update" on users;
drop policy if exists "users_delete" on users;

create policy "users_insert" on users for insert
  with check (
    workspace_id = any(select my_workspace_ids())
    and is_workspace_manager(workspace_id)
  );
create policy "users_update" on users for update
  using (
    workspace_id = any(select my_workspace_ids())
    and (is_workspace_manager(workspace_id) or auth_user_id = auth.uid())
  );
create policy "users_delete" on users for delete
  using (
    workspace_id = any(select my_workspace_ids())
    and is_workspace_manager(workspace_id)
  );

-- ── 6. alert_log: solo el service role puede insertar ────────
-- `with check (true)` permitía a cualquier usuario autenticado
-- insertar registros falsos en el historial de alertas.
-- (la Edge Function usa service_role, que ignora RLS de todas formas)
drop policy if exists "alert_log_insert" on alert_log;
create policy "alert_log_insert" on alert_log for insert
  with check (false);

-- ── FIN ──────────────────────────────────────────────────────
-- Después de ejecutar:
-- 1. Re-desplegar las Edge Functions actualizadas:
--      supabase functions deploy invite-user
--      supabase functions deploy send-alert
--    (o pegar el contenido de invite-user.ts / send-alert.ts en el editor
--     de Edge Functions del dashboard)
-- 2. Verificar que SUPABASE_ANON_KEY esté configurado como secret de las
--    Edge Functions (send-alert ahora lo usa para validar el JWT).
-- 3. Probar: login de un usuario invitado → debe ver su inventario.
