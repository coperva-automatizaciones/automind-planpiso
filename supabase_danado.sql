-- ============================================================
--  Automind · Migración: columna danado en inventario
--  Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS danado BOOLEAN NOT NULL DEFAULT FALSE;

-- Verificar
SELECT id, vin, marca, modelo, danado
FROM inventario
LIMIT 5;
