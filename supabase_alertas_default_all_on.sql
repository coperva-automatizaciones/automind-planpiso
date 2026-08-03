-- ============================================================
--  Automind · Activar TODAS las alertas en TODOS los tenants
--  Seguro de re-ejecutar (ON CONFLICT DO UPDATE / UPDATE en todos).
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Actualizar reglas existentes — encender todo ──────────
UPDATE alert_rules
SET
  activa           = true,
  notify_vendedor  = true,
  notify_gerente   = true,
  notify_director  = true,
  telegram_enabled = true,
  wa_activa        = true;

-- ── 2. Insertar reglas faltantes (workspaces sin todas las filas)
-- Garantiza que los 5 estados existan para cada workspace, todo ON.
INSERT INTO alert_rules (
  workspace_id,
  semaforo,
  activa,
  notify_vendedor,
  notify_gerente,
  notify_director,
  telegram_enabled,
  wa_activa
)
SELECT
  w.id,
  s.semaforo,
  true, true, true, true, true, true
FROM workspaces w
CROSS JOIN (VALUES
  ('saludable'),
  ('rotacion'),
  ('comprometido'),
  ('vencer'),
  ('intereses')
) AS s(semaforo)
ON CONFLICT (workspace_id, semaforo)
DO UPDATE SET
  activa           = true,
  notify_vendedor  = true,
  notify_gerente   = true,
  notify_director  = true,
  telegram_enabled = true,
  wa_activa        = true;

-- ── 3. Verificar resultado ────────────────────────────────────
SELECT
  w.nombre    AS workspace,
  ar.semaforo,
  ar.activa,
  ar.notify_vendedor   AS vendedor,
  ar.notify_gerente    AS gerente,
  ar.notify_director   AS director,
  ar.telegram_enabled  AS telegram,
  ar.wa_activa         AS whatsapp
FROM alert_rules ar
JOIN workspaces w ON w.id = ar.workspace_id
ORDER BY w.nombre, ar.semaforo;
