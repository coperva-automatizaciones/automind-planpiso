-- Migración: documentos de cumplimiento (lavado de dinero + conformación)
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS doc_lavado_dinero_tipo    TEXT    DEFAULT 'fisica',
  ADD COLUMN IF NOT EXISTS doc_lavado_dinero_key     TEXT,
  ADD COLUMN IF NOT EXISTS doc_lavado_dinero_nombre  TEXT,
  ADD COLUMN IF NOT EXISTS doc_conformacion_key      TEXT,
  ADD COLUMN IF NOT EXISTS doc_conformacion_nombre   TEXT;
