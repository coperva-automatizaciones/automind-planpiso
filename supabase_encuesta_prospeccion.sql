-- Migración: columna encuesta_prospeccion en clientes
-- Agregar en Supabase SQL Editor → Run
-- 2026-07-24

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS encuesta_prospeccion JSONB DEFAULT '{}';

COMMENT ON COLUMN public.clientes.encuesta_prospeccion IS
  'Respuestas del cuestionario de preferencias del cliente (8.1-8.12). '
  'Estructura: { uso, personas, maletas, puertas, tipoVehiculo, todoterreno, '
  'todoterreno_detalle, combustible, transmision, carretera, '
  'colores:[str,str,str], caracteristicas:[str,str,str], pasatiempos:[str,str,str] }';
