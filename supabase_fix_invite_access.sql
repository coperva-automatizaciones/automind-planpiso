-- Fix: usuarios invitados no podían acceder tras registrarse
-- Causa: users_select RLS requería workspace_memberships, pero el invite
--        solo crea registro en users. El usuario no podía ver su propio record.
--
-- Ejecutar en Supabase SQL Editor.

-- 1. Recrear users_select para que el usuario SIEMPRE pueda ver su propio registro
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  USING (
    auth_user_id = auth.uid()                          -- propio registro (login inicial)
    OR workspace_id = ANY(SELECT my_workspace_ids())   -- compañeros del workspace
  );

-- 2. Recrear users_update igual (necesario para SetPasswordScreen)
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR workspace_id = ANY(SELECT my_workspace_ids())
  );

-- 3. Asegurar que todos los usuarios invitados tengan registro en workspace_memberships
--    (Esto cubre usuarios ya invitados antes de este fix)
INSERT INTO workspace_memberships (workspace_id, user_id)
SELECT u.workspace_id, u.auth_user_id
FROM users u
WHERE u.auth_user_id IS NOT NULL
  AND u.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workspace_memberships wm
    WHERE wm.workspace_id = u.workspace_id
      AND wm.user_id = u.auth_user_id
  )
ON CONFLICT (workspace_id, user_id) DO NOTHING;
