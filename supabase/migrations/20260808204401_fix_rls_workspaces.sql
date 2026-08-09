-- ═══════════════════════════════════════════════════════════════════════════
-- Reactivar RLS en public.workspaces y corregir la causa que llevó a apagarla
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SÍNTOMA
--   workspaces era la única tabla del esquema sin Row Level Security. Con la
--   anon key pública —que va en config.js y sirve a cualquier visitante— se
--   leían todos los workspaces sin autenticarse.
--
-- POR QUÉ SE APAGÓ
--   No fue por el super admin, aunque así se contó. Verificado en local: con
--   RLS activa el super admin lee y escribe sin problema, porque las políticas
--   cortan antes con `OR is_super_admin()`.
--
--   Lo que sí se rompía era **crear un workspace siendo agency owner**:
--
--     db.js → createWorkspace()
--       client.from("workspaces").insert({...}).select().single()
--                                              ^^^^^^^^
--
--   El `.select()` traduce a `Prefer: return=representation`, es decir
--   INSERT ... RETURNING. Postgres aplica la política de SELECT a la fila
--   devuelta, y la política era:
--
--     USING ( id IN (SELECT my_workspace_ids()) OR is_super_admin() )
--
--   `my_workspace_ids()` CONSULTA workspaces y está declarada STABLE, así que
--   ve el snapshot del inicio de la sentencia — donde la fila recién insertada
--   todavía no existe. La política daba falso y el RETURNING fallaba con
--   42501, aunque el WITH CHECK del INSERT sí pasaba.
--
--   Comprobado empíricamente:
--     INSERT sin  return=representation  → 201
--     INSERT con  return=representation  → 403
--
--   Apagar RLS hacía desaparecer el síntoma. También la protección.
--
-- EL ARREGLO
--   Reescribir workspaces_select para que ninguna rama consulte workspaces.
--   Cada rama compara columnas de la fila evaluada contra otras tablas, así
--   que una fila nueva es evaluable de inmediato, dentro de la misma sentencia.
--
-- VERIFICADO EN LOCAL, con las seis cuentas del seed:
--   lectura      anónimo []  ·  cada rol solo lo suyo  ·  super admin todo
--   escritura    owner crea workspace con .select() → 201  (antes 403)
--                super admin crea agencia → 201
--   aislamiento  vendedor no alcanza otra agencia  ·  anónimo no ve nada
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Política de lectura sin autorreferencia ────────────────────────────
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;

CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT
  USING (
    -- Super admin: acceso global. No depende de consultar workspaces.
    is_super_admin()

    -- Agency owner / admin: compara la columna agency_id de la fila evaluada
    -- contra sus membresías. Funciona para filas recién insertadas.
    OR agency_id IN (
      SELECT am.agency_id FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
    )

    -- Miembro explícito de workspace
    OR id IN (
      SELECT wm.workspace_id FROM public.workspace_memberships wm
      WHERE wm.user_id = auth.uid()
    )

    -- Usuario registrado en la tabla users, por workspace_id
    OR id IN (
      SELECT u.workspace_id FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.workspace_id IS NOT NULL
    )

    -- Compatibilidad legacy: usuarios que solo tienen agency_id
    OR id IN (
      SELECT u.agency_id FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.agency_id IS NOT NULL
    )
  );


-- ── 2. Reactivar RLS ───────────────────────────────────────────────────────
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;


-- ── 3. Nota sobre my_workspace_ids() ───────────────────────────────────────
-- La función se deja como está: la usan otras políticas (inventario, users,
-- clientes, alert_rules…) donde la autorreferencia no aplica, porque no
-- consultan la propia tabla que están protegiendo.
--
-- Pero queda como trampa para el futuro: cualquier política sobre `workspaces`
-- que la use volverá a romper los INSERT ... RETURNING. Está anotado en el
-- reporte 03 como requisito para v2 — el aislamiento debe cubrirse con pruebas
-- automáticas que ejerciten también la escritura, no solo la lectura.
