-- Automind · Fix: cambiar vendedor_ids de uuid[] a text[]
-- Los IDs de users son text (ej. "V817077A3", "GAV-OSCAR"), no uuid.
-- Correr en Supabase SQL Editor.

alter table inventario
  alter column vendedor_ids type text[]
  using vendedor_ids::text[];
