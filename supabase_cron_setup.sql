-- ═══════════════════════════════════════════════════════════════════════════
-- Automind · Configurar cron job diario para daily-semaforo-check
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PRERREQUISITOS (hacer UNA sola vez en Supabase Dashboard):
--   1. Settings → Database → Extensions → habilitar "pg_cron"
--   2. Settings → Database → Extensions → habilitar "pg_net"
--   3. Edge Functions → daily-semaforo-check → Secrets → agregar CRON_SECRET
--      (cualquier string aleatorio seguro, ej: openssl rand -hex 32)
--
-- DESPUÉS ejecutar este script en SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Verificar que las extensiones estén activas ──────────────────────────
-- Si falla, ve a Settings → Database → Extensions y actívalas manualmente.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Variables de configuración ──────────────────────────────────────────
-- Reemplaza los valores antes de ejecutar:
--   PROJECT_REF  = tu Project ID (Settings → General → Reference ID)
--   CRON_SECRET  = el mismo valor que configuraste en la Edge Function

-- ── 3. Crear el job diario ─────────────────────────────────────────────────
-- Corre todos los días a las 14:00 UTC = 08:00 AM hora México (CST UTC-6)
-- Ajusta el horario si la agencia usa horario de verano (CDT UTC-5 = 13:00 UTC)

SELECT cron.schedule(
  'daily-semaforo-check',          -- nombre del job (único en pg_cron)
  '0 14 * * *',                    -- cron expression: 14:00 UTC = 8 AM CST
  $$
  SELECT net.http_post(
    url     := 'https://TU_PROJECT_REF.supabase.co/functions/v1/daily-semaforo-check',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer TU_CRON_SECRET'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── 4. Verificar que el job quedó registrado ────────────────────────────────
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'daily-semaforo-check';

-- ═══════════════════════════════════════════════════════════════════════════
-- COMANDOS ÚTILES DE MANTENIMIENTO
-- ═══════════════════════════════════════════════════════════════════════════

-- Ver historial de ejecuciones (últimas 20):
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-semaforo-check')
-- ORDER BY start_time DESC LIMIT 20;

-- Pausar el job sin eliminarlo:
-- UPDATE cron.job SET active = false WHERE jobname = 'daily-semaforo-check';

-- Reactivar:
-- UPDATE cron.job SET active = true WHERE jobname = 'daily-semaforo-check';

-- Eliminar el job permanentemente:
-- SELECT cron.unschedule('daily-semaforo-check');

-- Probar manualmente (desde SQL Editor, requiere pg_net):
-- SELECT net.http_post(
--   url     := 'https://TU_PROJECT_REF.supabase.co/functions/v1/daily-semaforo-check',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer TU_CRON_SECRET'
--   ),
--   body    := '{}'::jsonb
-- );

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTA: El cron job inicializa el semaforo_snapshot en vehículos que no lo
-- tengan (sin enviar alerta). A partir del día siguiente detecta cambios
-- reales y dispara emails automáticamente.
-- ═══════════════════════════════════════════════════════════════════════════
