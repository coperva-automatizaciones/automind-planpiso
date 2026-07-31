-- Automind · Fix: cambiar reporta_ids de uuid[] a text[]
-- Los IDs de users son text (ej. "G04605BE2", "V817077A3"), no uuid.
-- Igual que supabase_fix_vendedor_ids_type.sql pero para users.reporta_ids.
-- Correr en Supabase SQL Editor.

-- 1. Cambiar tipo de columna
ALTER TABLE public.users
  ALTER COLUMN reporta_ids TYPE text[]
  USING reporta_ids::text[];

-- 2. Re-migrar filas que tienen reporta_a pero reporta_ids vacío
--    (la migración original usaba ::uuid que fallaba en IDs de formato viejo)
UPDATE public.users
   SET reporta_ids = ARRAY[reporta_a]
 WHERE reporta_a IS NOT NULL
   AND (reporta_ids IS NULL OR reporta_ids = '{}');

-- 3. Verificar resultado
SELECT id, nombre, rol, reporta_a, reporta_ids
FROM public.users
WHERE reporta_a IS NOT NULL
ORDER BY rol, nombre;
