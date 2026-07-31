-- ============================================================
--  Diagnóstico + seed de alert_rules para workspaces existentes
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. DIAGNÓSTICO: ver qué reglas existen para cada workspace ───
SELECT
  w.id            AS workspace_id,
  w.nombre        AS workspace_nombre,
  ar.semaforo,
  ar.activa,
  ar.notify_vendedor,
  ar.notify_gerente,
  ar.notify_director
FROM workspaces w
LEFT JOIN alert_rules ar ON ar.workspace_id = w.id
ORDER BY w.nombre, ar.semaforo;

-- ── 2. DIAGNÓSTICO: ver usuarios del workspace Tlalpan ───────────
-- Cambia el workspace_id si es diferente
SELECT id, nombre, email, rol, workspace_id, agency_id
FROM users
WHERE workspace_id = 'f8dcb89c-34c4-4ddd-8ab9-89009b79fab6'
   OR agency_id    = 'f8dcb89c-34c4-4ddd-8ab9-89009b79fab6'
ORDER BY rol, nombre;

-- ── 3. FIX: insertar reglas por defecto en workspaces sin reglas ──
-- Activa alertas en: comprometido, vencer, intereses
-- Notifica a: vendedor + gerente + director
INSERT INTO alert_rules (workspace_id, semaforo, notify_vendedor, notify_gerente, notify_director, activa)
SELECT
  w.id,
  s.semaforo,
  s.vendedor,
  s.gerente,
  s.director,
  s.activa
FROM workspaces w
CROSS JOIN (VALUES
  ('saludable',    false, false, false, false),
  ('rotacion',     false, false, false, true),
  ('comprometido', true,  true,  true,  true),
  ('vencer',       true,  true,  true,  true),
  ('intereses',    true,  true,  true,  true)
) AS s(semaforo, vendedor, gerente, director, activa)
ON CONFLICT (workspace_id, semaforo) DO NOTHING;

-- ── 4. Verificar resultado ─────────────────────────────────────────
SELECT
  w.nombre AS workspace,
  ar.semaforo,
  ar.activa,
  ar.notify_vendedor,
  ar.notify_gerente,
  ar.notify_director
FROM alert_rules ar
JOIN workspaces w ON w.id = ar.workspace_id
WHERE ar.workspace_id = 'f8dcb89c-34c4-4ddd-8ab9-89009b79fab6'
ORDER BY ar.semaforo;
