-- =====================================================================
-- Automind · Diagnóstico de permisos Super Admin (Ricardo / Richard)
-- Corre cada bloque por separado en Supabase SQL Editor
-- =====================================================================

-- ── BLOQUE 1: ¿Está registrado como super admin? ─────────────────
SELECT
  sa.user_id,
  sa.email,
  sa.created_at::date AS registrado,
  au.last_sign_in_at::date AS ultimo_login,
  au.email AS email_auth  -- debe coincidir con sa.email
FROM public.super_admins sa
JOIN auth.users au ON au.id = sa.user_id
ORDER BY sa.created_at;

-- Si NO aparece → correr BLOQUE 5 para registrarlo.
-- Si aparece pero sa.email ≠ au.email → el email cambió; re-insertar.


-- ── BLOQUE 2: Verificar que is_super_admin() está definida ───────
SELECT prosrc FROM pg_proc WHERE proname = 'is_super_admin';
-- Debe retornar el cuerpo de la función. Si está vacío → falta la función.


-- ── BLOQUE 3: Tablas con RLS activo SIN bypass de super admin ────
-- Cualquier tabla que aparezca aquí bloqueará a Ricardo.
SELECT DISTINCT p.tablename
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename NOT IN (
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual        ILIKE '%is_super_admin%'
        OR with_check ILIKE '%is_super_admin%'
      )
  )
ORDER BY p.tablename;

-- Si aparecen tablas aquí → son el problema. Correr BLOQUE 6 como parche.


-- ── BLOQUE 4: Ver todas las políticas activas para super admin ────
SELECT tablename, policyname, cmd,
       LEFT(qual::text, 80)        AS condicion,
       LEFT(with_check::text, 80)  AS with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual        ILIKE '%is_super_admin%'
    OR with_check ILIKE '%is_super_admin%'
  )
ORDER BY tablename, cmd;


-- ── BLOQUE 5: FIX — Registrar a Ricardo si no está ───────────────
-- Solo corre esto si BLOQUE 1 no muestra a Ricardo.
INSERT INTO public.super_admins (user_id, email)
SELECT au.id, au.email
FROM auth.users au
WHERE au.email IN (
  'ricardo.avalos@optimasystems.ai'
  -- Agregar aquí cualquier email alternativo que use
)
ON CONFLICT (user_id) DO NOTHING;


-- ── BLOQUE 6: PARCHE — Re-aplicar RLS completo ───────────────────
-- Corre supabase_superadmin_definitivo.sql completo para restaurar
-- todo. Este bloque solo es un recordatorio.
-- → Abrir ese archivo y ejecutarlo en su totalidad.
