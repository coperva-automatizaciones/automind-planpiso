-- ──────────────────────────────────────────────────────────────────────────
-- Migración: reporta_ids uuid[]
-- Permite que un vendedor reporte a múltiples gerentes,
-- y un gerente a múltiples directores.
-- Ejecutar en Supabase → SQL Editor
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Agregar columna array (vacía por defecto)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reporta_ids uuid[] DEFAULT '{}';

-- 2. Migrar datos existentes de reporta_a → reporta_ids
--    Solo para filas que ya tienen reporta_a y reporta_ids aún vacío
UPDATE public.users
   SET reporta_ids = ARRAY[reporta_a]
 WHERE reporta_a IS NOT NULL
   AND (reporta_ids IS NULL OR reporta_ids = '{}');

-- 3. Índice GIN para búsquedas por contenido del array
CREATE INDEX IF NOT EXISTS idx_users_reporta_ids
  ON public.users USING GIN (reporta_ids);

-- Nota: reporta_a se mantiene para compatibilidad con código existente.
-- La app usará reporta_ids como fuente de verdad y sincronizará
-- reporta_a con el primer elemento del array al guardar.
