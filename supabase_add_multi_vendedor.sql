-- Automind · Asignación múltiple de vendedores por vehículo
-- Ejecutar en Supabase SQL Editor → Run.
--
-- Agrega la columna vendedor_ids (array de UUIDs) y migra el dato
-- existente de vendedor_id (si lo hay) al nuevo array.
-- Se conserva vendedor_id para compatibilidad con las alertas existentes.

alter table inventario
  add column if not exists vendedor_ids uuid[] not null default '{}';

-- Migrar registros existentes: si tiene vendedor_id, copiarlo al array
update inventario
  set vendedor_ids = ARRAY[vendedor_id]
  where vendedor_id is not null
    and (vendedor_ids is null or vendedor_ids = '{}');
