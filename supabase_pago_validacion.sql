-- Validación de pago: quién y cuándo confirma que el pago se recibió
-- Solo pueden validar: gerente, director, superadmin, agency owner
-- Ejecutar en: Supabase → SQL Editor
-- Seguro re-ejecutar (IF NOT EXISTS).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS pago_validado     BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pago_validado_por TEXT,
  ADD COLUMN IF NOT EXISTS pago_validado_en  TIMESTAMPTZ;

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'clientes'
  AND column_name  IN ('pago_validado', 'pago_validado_por', 'pago_validado_en')
ORDER BY column_name;
