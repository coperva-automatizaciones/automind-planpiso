-- ──────────────────────────────────────────────────────────────────────────
-- Migración: Aviso de Privacidad por agencia y por cliente
-- Ejecutar en Supabase → SQL Editor
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Columnas en agencies (aviso personalizado a nivel agencia)
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS aviso_privacidad_key    TEXT,
  ADD COLUMN IF NOT EXISTS aviso_privacidad_nombre TEXT;

-- 2. Columnas en workspaces (override a nivel workspace, opcional)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS aviso_privacidad_key    TEXT,
  ADD COLUMN IF NOT EXISTS aviso_privacidad_nombre TEXT;

-- 3. Columnas en clientes (copia firmada por el cliente)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS doc_aviso_key    TEXT,
  ADD COLUMN IF NOT EXISTS doc_aviso_nombre TEXT;

-- ──────────────────────────────────────────────────────────────────────────
-- PASO MANUAL OBLIGATORIO:
-- Subir el archivo Aviso_Privacidad_Generico.docx al bucket "expedientes"
-- en la ruta: privacidad/aviso_privacidad_generico.docx
--
-- Desde Supabase Dashboard → Storage → expedientes → New folder "privacidad"
-- → Upload file → Aviso_Privacidad_Generico.docx
--
-- El sistema usará ese archivo como plantilla por defecto para todas las
-- agencias que no hayan subido su propio aviso personalizado.
-- ──────────────────────────────────────────────────────────────────────────
