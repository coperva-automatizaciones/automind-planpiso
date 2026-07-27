-- Automind · Integración Telegram — Migración DB
-- Correr en Supabase SQL Editor
--
-- Requisitos previos (hacer ANTES de esta migración):
--   1. Crear un bot en @BotFather en Telegram → guardar el token
--   2. En Supabase Dashboard → Edge Functions → Secrets, agregar:
--        TELEGRAM_BOT_TOKEN   = <token del bot>
--        TELEGRAM_BOT_USERNAME = <username del bot sin @>
--        TELEGRAM_WEBHOOK_SECRET = <string aleatorio, ej: openssl rand -hex 32>
--   3. Desplegar las 3 Edge Functions:
--        telegram-link.ts · send-telegram.ts · telegram-webhook.ts
--   4. Registrar el webhook con Telegram (UNA sola vez):
--        curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
--          -H "Content-Type: application/json" \
--          -d '{"url":"https://<PROJECT>.supabase.co/functions/v1/telegram-webhook",
--               "secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'

-- ── 1. telegram_chat_id en users ─────────────────────────────────────────
alter table users add column if not exists telegram_chat_id bigint;
alter table users add column if not exists telegram_username  text;

comment on column users.telegram_chat_id is
  'Chat ID de Telegram del usuario. NULL = no vinculado.';

-- ── 2. telegram_enabled en alert_rules ───────────────────────────────────
alter table alert_rules add column if not exists telegram_enabled boolean not null default false;

comment on column alert_rules.telegram_enabled is
  'Si true, enviar alerta también por Telegram además de email.';

-- ── 3. Tabla de tokens de vinculación ────────────────────────────────────
create table if not exists telegram_link_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default encode(gen_random_bytes(20), 'hex'),
  user_id    text not null references users(id) on delete cascade,
  used_at    timestamptz,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now()
);

comment on table telegram_link_tokens is
  'Tokens de un solo uso para vincular cuentas de Telegram. Expiran en 30 min.';

-- Limpiar tokens viejos automáticamente (opcional, requiere pg_cron)
-- select cron.schedule('cleanup-tg-tokens', '0 * * * *',
--   $$delete from telegram_link_tokens where expires_at < now() - interval '1 hour'$$);

-- RLS para telegram_link_tokens
alter table telegram_link_tokens enable row level security;

-- Solo el propio usuario puede crear/ver sus tokens
create policy "tg_tokens_own_select" on telegram_link_tokens for select
  using (
    user_id in (
      select id from users where auth_user_id = auth.uid()
    )
  );

create policy "tg_tokens_own_insert" on telegram_link_tokens for insert
  with check (
    user_id in (
      select id from users where auth_user_id = auth.uid()
    )
  );

-- ── 4. Índices ────────────────────────────────────────────────────────────
create index if not exists tg_tokens_token_idx   on telegram_link_tokens(token);
create index if not exists tg_tokens_user_idx    on telegram_link_tokens(user_id);
create index if not exists users_tg_chat_id_idx  on users(telegram_chat_id) where telegram_chat_id is not null;
