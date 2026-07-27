-- Migración: eliminar campo financiera de la tabla inventario
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-06-17

ALTER TABLE inventario DROP COLUMN IF EXISTS financiera;
