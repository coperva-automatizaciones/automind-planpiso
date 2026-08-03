-- =====================================================================
-- Automind · Super Admin — Script DEFINITIVO
-- Seguro de re-ejecutar en cualquier momento.
-- Cubre TODAS las tablas. Restaura my_workspace_ids() con bypass.
-- =====================================================================
-- ⚠️  Si se vuelve a correr supabase_multitenant.sql, volver a correr ESTE
--     script para restaurar los permisos de super admin.
-- =====================================================================


-- ── 0. Asegurar que is_super_admin() es correcto ──────────────────────
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  );
$$;


-- ── 1. Restaurar my_workspace_ids() CON bypass de super admin ─────────
--    IMPORTANTE: supabase_multitenant.sql sobreescribe esta función sin
--    el bypass. Siempre correr este script después de cualquier migración.
CREATE OR REPLACE FUNCTION my_workspace_ids()
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  -- Super admin → todos los workspaces sin excepción
  SELECT w.id FROM workspaces w WHERE is_super_admin()
  UNION
  -- Agency owner/admin → todos los workspaces de su agencia
  SELECT w.id FROM workspaces w
  INNER JOIN agency_memberships am ON am.agency_id = w.agency_id
  WHERE am.user_id = auth.uid()
    AND am.role IN ('agency_owner','agency_admin','agency_support')
  UNION
  -- Miembro explícito de workspace
  SELECT wm.workspace_id FROM workspace_memberships wm
  WHERE wm.user_id = auth.uid()
  UNION
  -- Usuario registrado por workspace_id (tabla users)
  SELECT u.workspace_id FROM users u
  WHERE u.auth_user_id = auth.uid() AND u.workspace_id IS NOT NULL
  UNION
  -- Usuario registrado por agency_id (legacy)
  SELECT u.agency_id FROM users u
  WHERE u.auth_user_id = auth.uid() AND u.agency_id IS NOT NULL;
$$;


-- ── 2. Agregar super admins ───────────────────────────────────────────
-- automatizacion.ia@coperva.com
INSERT INTO public.super_admins (user_id, email)
SELECT au.id, au.email FROM auth.users au
WHERE au.email = 'automatizacion.ia@coperva.com'
ON CONFLICT (user_id) DO NOTHING;

-- Ricardo Avalos
INSERT INTO public.super_admins (user_id, email)
SELECT au.id, au.email FROM auth.users au
WHERE au.email = 'ricardo.avalos@optimasystems.ai'
ON CONFLICT (user_id) DO NOTHING;


-- ── 3. inventario ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "inv_select"  ON inventario;
DROP POLICY IF EXISTS "inv_insert"  ON inventario;
DROP POLICY IF EXISTS "inv_update"  ON inventario;
DROP POLICY IF EXISTS "inv_delete"  ON inventario;
DROP POLICY IF EXISTS "inventario_select" ON inventario;
DROP POLICY IF EXISTS "inventario_insert" ON inventario;
DROP POLICY IF EXISTS "inventario_update" ON inventario;
DROP POLICY IF EXISTS "inventario_delete" ON inventario;

CREATE POLICY "inv_select" ON inventario FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "inv_insert" ON inventario FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "inv_update" ON inventario FOR UPDATE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "inv_delete" ON inventario FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 4. users ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 5. clientes ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clientes_select"          ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert"          ON public.clientes;
DROP POLICY IF EXISTS "clientes_update"          ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete"          ON public.clientes;
DROP POLICY IF EXISTS "clientes_workspace_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_workspace_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_workspace_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_workspace_delete" ON public.clientes;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR agency_id  = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 6. cliente_historial ──────────────────────────────────────────────
DROP POLICY IF EXISTS "historial_select" ON public.cliente_historial;
DROP POLICY IF EXISTS "historial_insert" ON public.cliente_historial;
DROP POLICY IF EXISTS "historial_update" ON public.cliente_historial;
DROP POLICY IF EXISTS "historial_delete" ON public.cliente_historial;

CREATE POLICY "historial_select" ON public.cliente_historial FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "historial_insert" ON public.cliente_historial FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 7. alert_rules ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alert_rules_select" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_insert" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_update" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_delete" ON public.alert_rules;

CREATE POLICY "alert_rules_select" ON public.alert_rules FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "alert_rules_insert" ON public.alert_rules FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "alert_rules_update" ON public.alert_rules FOR UPDATE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "alert_rules_delete" ON public.alert_rules FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 8. workspaces ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "workspaces_select"              ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert"              ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update"              ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete"              ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_super_admin"  ON public.workspaces;

CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT USING (
  id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT WITH CHECK (
  is_super_admin()
  OR (agency_id = my_agency_id_new() AND is_agency_admin())
);
CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE USING (
  is_super_admin()
  OR agency_id = my_agency_id_new()
);
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE USING (
  is_super_admin()
);


-- ── 9. agencies ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agencies_select"             ON public.agencies;
DROP POLICY IF EXISTS "agencies_insert_super_admin" ON public.agencies;
DROP POLICY IF EXISTS "agencies_update_super_admin" ON public.agencies;
DROP POLICY IF EXISTS "agencies_delete_super_admin" ON public.agencies;
DROP POLICY IF EXISTS "agencies_insert"             ON public.agencies;
DROP POLICY IF EXISTS "agencies_update"             ON public.agencies;
DROP POLICY IF EXISTS "agencies_delete"             ON public.agencies;

CREATE POLICY "agencies_select" ON public.agencies FOR SELECT USING (
  id = my_agency_id_new()
  OR is_super_admin()
);
CREATE POLICY "agencies_insert" ON public.agencies FOR INSERT WITH CHECK (
  is_super_admin()
);
CREATE POLICY "agencies_update" ON public.agencies FOR UPDATE USING (
  is_super_admin()
  OR id = my_agency_id_new()
);
CREATE POLICY "agencies_delete" ON public.agencies FOR DELETE USING (
  is_super_admin()
);


-- ── 10. agency_memberships ────────────────────────────────────────────
DROP POLICY IF EXISTS "agency_mem_select" ON public.agency_memberships;
DROP POLICY IF EXISTS "agency_mem_insert" ON public.agency_memberships;
DROP POLICY IF EXISTS "agency_mem_update" ON public.agency_memberships;
DROP POLICY IF EXISTS "agency_mem_delete" ON public.agency_memberships;

CREATE POLICY "agency_mem_select" ON public.agency_memberships FOR SELECT USING (
  agency_id = my_agency_id_new()
  OR is_super_admin()
);
CREATE POLICY "agency_mem_insert" ON public.agency_memberships FOR INSERT WITH CHECK (
  is_super_admin()
  OR (agency_id = my_agency_id_new() AND is_agency_admin())
);
CREATE POLICY "agency_mem_delete" ON public.agency_memberships FOR DELETE USING (
  is_super_admin()
  OR agency_id = my_agency_id_new()
);


-- ── 11. workspace_memberships ─────────────────────────────────────────
DROP POLICY IF EXISTS "ws_mem_select" ON public.workspace_memberships;
DROP POLICY IF EXISTS "ws_mem_insert" ON public.workspace_memberships;
DROP POLICY IF EXISTS "ws_mem_delete" ON public.workspace_memberships;

CREATE POLICY "ws_mem_select" ON public.workspace_memberships FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "ws_mem_insert" ON public.workspace_memberships FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "ws_mem_delete" ON public.workspace_memberships FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 12. super_admins: solo el propio usuario o super admin puede ver ──
DROP POLICY IF EXISTS "super_admins_self_select" ON public.super_admins;
CREATE POLICY "super_admins_self_select" ON public.super_admins FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());


-- ── 13. alert_log ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alert_log_select"        ON public.alert_log;
DROP POLICY IF EXISTS "alert_log_super_admin"   ON public.alert_log;

CREATE POLICY "alert_log_select" ON public.alert_log FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
-- INSERT sigue siendo service_role únicamente (with check true ya existe)


-- ── 14. financieras ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "fin_select" ON public.financieras;
DROP POLICY IF EXISTS "fin_insert" ON public.financieras;
DROP POLICY IF EXISTS "fin_update" ON public.financieras;
DROP POLICY IF EXISTS "fin_delete" ON public.financieras;

CREATE POLICY "fin_select" ON public.financieras FOR SELECT USING (
  agency_id = my_agency_id_new()
  OR is_super_admin()
);
CREATE POLICY "fin_insert" ON public.financieras FOR INSERT WITH CHECK (
  agency_id = my_agency_id_new()
  OR is_super_admin()
);
CREATE POLICY "fin_update" ON public.financieras FOR UPDATE USING (
  agency_id = my_agency_id_new()
  OR is_super_admin()
);
CREATE POLICY "fin_delete" ON public.financieras FOR DELETE USING (
  agency_id = my_agency_id_new()
  OR is_super_admin()
);


-- ── 15. workspace_financieras ─────────────────────────────────────────
DROP POLICY IF EXISTS "wf_select" ON public.workspace_financieras;
DROP POLICY IF EXISTS "wf_insert" ON public.workspace_financieras;
DROP POLICY IF EXISTS "wf_update" ON public.workspace_financieras;
DROP POLICY IF EXISTS "wf_delete" ON public.workspace_financieras;

CREATE POLICY "wf_select" ON public.workspace_financieras FOR SELECT USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "wf_insert" ON public.workspace_financieras FOR INSERT WITH CHECK (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "wf_update" ON public.workspace_financieras FOR UPDATE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);
CREATE POLICY "wf_delete" ON public.workspace_financieras FOR DELETE USING (
  workspace_id = ANY(SELECT my_workspace_ids())
  OR is_super_admin()
);


-- ── 16. admin_telegram ────────────────────────────────────────────────
-- auth_user_id es TEXT (no UUID), super admin puede ver todos los registros
DROP POLICY IF EXISTS "admin_tg_own"          ON public.admin_telegram;
DROP POLICY IF EXISTS "admin_tg_super_admin"  ON public.admin_telegram;

CREATE POLICY "admin_tg_own" ON public.admin_telegram FOR SELECT
  USING (auth_user_id = (auth.uid())::text OR is_super_admin());


-- ── 17. telegram_link_tokens ──────────────────────────────────────────
DROP POLICY IF EXISTS "tg_tokens_own_select"       ON public.telegram_link_tokens;
DROP POLICY IF EXISTS "tg_tokens_own_insert"       ON public.telegram_link_tokens;
DROP POLICY IF EXISTS "tg_tokens_super_admin"      ON public.telegram_link_tokens;

CREATE POLICY "tg_tokens_own_select" ON public.telegram_link_tokens FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_super_admin()
  );
CREATE POLICY "tg_tokens_own_insert" ON public.telegram_link_tokens FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_super_admin()
  );


-- ── 18. super_admin_audit_log ────────────────────────────────────────
DROP POLICY IF EXISTS "audit_log_select" ON public.super_admin_audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.super_admin_audit_log;

CREATE POLICY "audit_log_select" ON public.super_admin_audit_log FOR SELECT
  USING (is_super_admin());
CREATE POLICY "audit_log_insert" ON public.super_admin_audit_log FOR INSERT
  WITH CHECK (is_super_admin());


-- ── 19. encuesta_prospeccion ──────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'encuesta_prospeccion' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "enc_select" ON public.encuesta_prospeccion;
    DROP POLICY IF EXISTS "enc_insert" ON public.encuesta_prospeccion;
    DROP POLICY IF EXISTS "enc_update" ON public.encuesta_prospeccion;
    DROP POLICY IF EXISTS "enc_delete" ON public.encuesta_prospeccion;
    EXECUTE $q$
      CREATE POLICY "enc_select" ON public.encuesta_prospeccion FOR SELECT USING (is_super_admin() OR workspace_id = ANY(SELECT my_workspace_ids()));
      CREATE POLICY "enc_insert" ON public.encuesta_prospeccion FOR INSERT WITH CHECK (is_super_admin() OR workspace_id = ANY(SELECT my_workspace_ids()));
      CREATE POLICY "enc_update" ON public.encuesta_prospeccion FOR UPDATE USING (is_super_admin() OR workspace_id = ANY(SELECT my_workspace_ids()));
      CREATE POLICY "enc_delete" ON public.encuesta_prospeccion FOR DELETE USING (is_super_admin() OR workspace_id = ANY(SELECT my_workspace_ids()));
    $q$;
  END IF;
END $$;


-- ── 20. Registrar super admins (idempotente) ──────────────────────────
INSERT INTO public.super_admins (user_id, email)
SELECT au.id, au.email FROM auth.users au
WHERE au.email IN (
  'pmo3@coperva.com',
  'otellez@coperva.com',
  'automatizacion.ia@coperva.com',
  'ricardo.avalos@optimasystems.ai'
)
ON CONFLICT (user_id) DO NOTHING;


-- ── VERIFICACIÓN ──────────────────────────────────────────────────────

-- Super admins registrados:
SELECT sa.email, sa.created_at::date AS desde,
       au.last_sign_in_at::date AS ultimo_login
FROM public.super_admins sa
JOIN auth.users au ON au.id = sa.user_id
ORDER BY sa.created_at;

-- Tablas con RLS activo SIN is_super_admin() (debe estar vacío):
SELECT DISTINCT p.tablename
FROM pg_policies p
WHERE p.tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_policies
  WHERE qual ILIKE '%is_super_admin%'
     OR with_check ILIKE '%is_super_admin%'
)
AND p.tablename IN (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
);

-- Función my_workspace_ids correcta (debe tener 5 UNION branches):
SELECT prosrc FROM pg_proc WHERE proname = 'my_workspace_ids';
