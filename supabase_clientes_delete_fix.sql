-- =====================================================================
-- Automind · Fix DELETE en clientes — política RLS permisiva para todos los roles
-- Problema: DELETE se bloqueaba silenciosamente para agency owners y super admins.
-- Ejecutar en: Supabase → SQL Editor
-- Seguro re-ejecutar.
-- =====================================================================

-- Eliminar cualquier variante de política DELETE en clientes
DROP POLICY IF EXISTS "clientes_workspace_delete" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete"            ON public.clientes;

-- Recrear con cobertura completa:
--   • workspace users (JWT vía users.auth_user_id)
--   • agency owners (vía agency_memberships)
--   • super admins (vía is_super_admin())
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE
  USING (
    -- Usuario normal del workspace
    workspace_id IN (
      SELECT workspace_id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    -- Agency owner que entró a un workspace (no está en users de ese workspace)
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN agency_memberships am ON am.agency_id = w.agency_id
      WHERE am.user_id = auth.uid()
    )
    OR
    -- Fallback legacy: agency_id directo en clientes
    agency_id IN (
      SELECT agency_id FROM agency_memberships WHERE user_id = auth.uid()
    )
    OR
    -- Super admin
    EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );

-- Verificar resultado
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clientes' AND cmd = 'DELETE';
