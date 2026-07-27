-- Automind · Fix Telegram para Agency Owners
-- Correr en Supabase SQL Editor

-- 1. Columnas Telegram en agencies (para el owner)
alter table agencies add column if not exists telegram_chat_id bigint;
alter table agencies add column if not exists telegram_username  text;

-- 2. Hacer user_id opcional en telegram_link_tokens
--    (los agency owners no tienen fila en users)
alter table telegram_link_tokens alter column user_id drop not null;

-- 3. Agregar columnas de contexto al token
alter table telegram_link_tokens add column if not exists auth_user_id text;
alter table telegram_link_tokens add column if not exists entity_type  text default 'workspace_user';
-- entity_type: 'workspace_user' | 'agency_owner'

create index if not exists tg_tokens_auth_idx on telegram_link_tokens(auth_user_id);
