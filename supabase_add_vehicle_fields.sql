-- Migración: agregar columnas faltantes a inventario
-- descripcion, tipo y observaciones existían en el formulario pero no en la BD.
-- Ejecutar en Supabase SQL Editor → Run.

alter table inventario
  add column if not exists descripcion  text,
  add column if not exists tipo         text,
  add column if not exists observaciones text;
