-- Cotización: documento de cotización oficial en Supabase Storage
-- Ejecutar en: Supabase → SQL Editor
-- Seguro re-ejecutar (IF NOT EXISTS).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS doc_cotizacion_key     TEXT,
  ADD COLUMN IF NOT EXISTS doc_cotizacion_nombre  TEXT;

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'clientes'
  AND column_name  IN ('doc_cotizacion_key', 'doc_cotizacion_nombre')
ORDER BY column_name;
