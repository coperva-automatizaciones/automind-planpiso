-- Automind · Agregar estado de venta y fecha de venta al inventario
-- Ejecutar en Supabase SQL Editor → Run.
--
-- estado_venta: DISPONIBLE | APARTADO | VENDIDO
-- fecha_venta:  fecha en que se marcó como VENDIDO (para la lógica de "mes actual")

alter table inventario
  add column if not exists estado_venta text not null default 'DISPONIBLE',
  add column if not exists fecha_venta  date;

-- Asegurarse que los registros existentes tengan el default
update inventario set estado_venta = 'DISPONIBLE' where estado_venta is null;
