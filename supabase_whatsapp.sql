-- Automind · WhatsApp Business (Meta Cloud API)
-- Migración: agregar soporte de alertas por WhatsApp
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Habilitar WA por semáforo en alert_rules
ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS wa_activa BOOLEAN DEFAULT FALSE;

-- 2. Números de destino por rol en workspaces
--    (El token y phone_number_id van en Supabase Secrets: META_WA_ACCESS_TOKEN / META_WA_PHONE_NUMBER_ID)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS wa_director_tel TEXT,
  ADD COLUMN IF NOT EXISTS wa_gerente_tel  TEXT;

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('alert_rules', 'workspaces')
  AND column_name IN ('wa_activa', 'wa_director_tel', 'wa_gerente_tel');
