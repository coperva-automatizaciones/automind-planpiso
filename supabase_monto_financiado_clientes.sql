-- Migración: agregar monto_financiado a la tabla clientes
-- Corre en: Supabase Dashboard → SQL Editor

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS monto_financiado NUMERIC(12,2);
