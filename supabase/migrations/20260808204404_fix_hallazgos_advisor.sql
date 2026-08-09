-- ═══════════════════════════════════════════════════════════════════════════
-- Correcciones del Security Advisor de Supabase
-- (independientes de la reactivación de RLS en workspaces)
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. alert_log: cerrar el INSERT ─────────────────────────────────────────
--
-- El advisor reporta «RLS Policy Always True»: la política de INSERT es
-- WITH CHECK (true), así que cualquier usuario autenticado puede escribir en
-- la bitácora de alertas — la tabla que sirve como evidencia de que sí se
-- notificó. Es falsificable.
--
-- Este arreglo YA ESTABA ESCRITO en supabase_fixes_v3.sql (líneas 113-119),
-- con el comentario correcto explicando el riesgo, y nunca llegó a producción.
-- Es el mejor ejemplo del problema que estas migraciones resuelven: un arreglo
-- que existe en el repositorio y se evapora sin que nadie pueda notarlo.
--
-- send-alert y daily-semaforo-check usan service_role, que ignora RLS, así que
-- cerrar el INSERT a los usuarios no afecta al envío de alertas.

DROP POLICY IF EXISTS alert_log_insert ON public.alert_log;
CREATE POLICY alert_log_insert ON public.alert_log
  FOR INSERT WITH CHECK (false);


-- ── 2. search_path fijo en funciones SECURITY DEFINER ──────────────────────
--
-- El advisor reporta «Function Search Path Mutable» en 10 funciones. Una
-- función SECURITY DEFINER corre con los privilegios de su dueño; si su
-- search_path es mutable, quien pueda crear objetos en un esquema del path
-- puede suplantar las tablas que la función lee — por ejemplo forzar que
-- is_super_admin() devuelva true, lo que sería un bypass total de RLS.
--
-- Explotabilidad hoy: baja. Supabase revoca CREATE sobre public a anon y
-- authenticated por defecto. Es endurecimiento, no un incidente.
--
-- ALTER FUNCTION ... SET search_path no toca el cuerpo: es seguro y reversible.
--
-- La más relevante del grupo es route_telegram_link(): es SECURITY DEFINER,
-- no tenía search_path y escribe en la tabla users.
--
-- generate_telegram_token() no aparece: ya fija search_path, no recibe
-- parámetros y deriva la identidad de auth.uid(). Está bien construida.

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS firma
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.prosecdef                -- SECURITY DEFINER
      AND  p.proconfig IS NULL        -- sin search_path fijado
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.firma);
    RAISE NOTICE 'search_path fijado en %', f.firma;
  END LOOP;
END $$;


-- ── 3. Verificación ────────────────────────────────────────────────────────
DO $$
DECLARE
  v_sin_rls        int;
  v_sin_searchpath int;
  v_permisivas     int;
BEGIN
  SELECT count(*) INTO v_sin_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  SELECT count(*) INTO v_sin_searchpath
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef AND p.proconfig IS NULL;

  SELECT count(*) INTO v_permisivas
  FROM pg_policies
  WHERE schemaname = 'public' AND cmd <> 'SELECT'
    AND (qual = 'true' OR with_check = 'true');

  RAISE NOTICE 'Tablas sin RLS: %  |  Funciones sin search_path: %  |  Políticas de escritura permisivas: %',
    v_sin_rls, v_sin_searchpath, v_permisivas;

  IF v_sin_rls > 0 THEN
    RAISE WARNING 'Quedan % tabla(s) sin RLS en public', v_sin_rls;
  END IF;
END $$;


-- ── Fuera de alcance ───────────────────────────────────────────────────────
-- pg_net vive en el esquema public y el advisor lo señala. Moverlo puede
-- romper el cron (supabase_cron_setup.sql llama a net.http_post), y el costo
-- supera al beneficio en un sistema que se va a reemplazar. Anotado para que
-- en v2 las extensiones se instalen en su propio esquema.
