-- Migración: eliminar FK constraint de inventario.vendedor_id
-- El campo vendedor_ids[] (array) es ahora la fuente de verdad para multi-vendedor.
-- El campo legacy vendedor_id se mantiene para compatibilidad de lectura pero
-- no debe tener FK rígida (causa errores cuando un vendedor es eliminado).
--
-- Corre este script en: Supabase Dashboard → SQL Editor

ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_vendedor_id_fkey;
