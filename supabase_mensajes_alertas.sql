-- ============================================================
--  Automind · Templates de mensajes por alerta
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
--  Fecha: 2026-07-03
-- ============================================================
--
--  Agrega columna `mensajes` JSONB a `alert_rules`.
--  Estructura esperada:
--  {
--    "email": {
--      "asunto":   "template...",
--      "director": "template...",
--      "gerente":  "template...",
--      "vendedor": "template..."
--    },
--    "telegram": {
--      "director": "template...",
--      "gerente":  "template...",
--      "vendedor": "template..."
--    }
--  }
--  Si el campo está vacío ({}) se usan los templates predeterminados.
--  Variables soportadas entre corchetes: [DESTINATARIO], [VEHICULO],
--  [VIN], [DIAS_EN_PISO], [PCT_PLAN], [INTERES_ACUM], [ESTADO_NUEVO],
--  [ESTADO_ANTERIOR], [VENDEDOR], [FECHA].
-- ============================================================

ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS mensajes JSONB DEFAULT '{}';

-- ── FIN ──────────────────────────────────────────────────────
