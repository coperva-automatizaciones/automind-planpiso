-- Automind · Telegram RPC + Admin Table
-- Correr en Supabase SQL Editor
-- Esto reemplaza la necesidad de la Edge Function telegram-link para generar tokens.

-- ── 1. Tabla para admins (no están en users) ─────────────────────────────
CREATE TABLE IF NOT EXISTS admin_telegram (
  auth_user_id   text PRIMARY KEY,
  telegram_chat_id bigint,
  telegram_username text,
  updated_at     timestamptz DEFAULT now()
);
ALTER TABLE admin_telegram ENABLE ROW LEVEL SECURITY;
-- El propio usuario puede ver su fila (usa auth.uid() como text)
CREATE POLICY "admin_tg_own" ON admin_telegram FOR SELECT
  USING (auth_user_id = (auth.uid())::text);

-- ── 2. Columnas extra en telegram_link_tokens ─────────────────────────────
-- Para que el webhook pueda guardar el chat_id en el token y el trigger lo enrute
ALTER TABLE telegram_link_tokens ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;
ALTER TABLE telegram_link_tokens ADD COLUMN IF NOT EXISTS telegram_username text;

-- ── 3. Trigger: cuando el webhook marca el token como usado + guarda chat_id,
--    el trigger lo enruta a la tabla correcta automáticamente ────────────────
CREATE OR REPLACE FUNCTION route_telegram_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo actuar cuando se guarda el telegram_chat_id
  IF NEW.telegram_chat_id IS NOT NULL AND (OLD.telegram_chat_id IS NULL) THEN
    IF NEW.entity_type = 'workspace_user' AND NEW.user_id IS NOT NULL THEN
      UPDATE users
      SET telegram_chat_id = NEW.telegram_chat_id,
          telegram_username = NEW.telegram_username
      WHERE id = NEW.user_id;
    ELSIF NEW.entity_type IN ('admin', 'agency_owner') AND NEW.auth_user_id IS NOT NULL THEN
      INSERT INTO admin_telegram (auth_user_id, telegram_chat_id, telegram_username, updated_at)
      VALUES (NEW.auth_user_id, NEW.telegram_chat_id, NEW.telegram_username, now())
      ON CONFLICT (auth_user_id) DO UPDATE
        SET telegram_chat_id  = EXCLUDED.telegram_chat_id,
            telegram_username = EXCLUDED.telegram_username,
            updated_at        = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_route_telegram_link ON telegram_link_tokens;
CREATE TRIGGER tg_route_telegram_link
  AFTER UPDATE ON telegram_link_tokens
  FOR EACH ROW EXECUTE FUNCTION route_telegram_link();

-- ── 4. Función RPC: genera el token sin necesitar Edge Function ───────────
CREATE OR REPLACE FUNCTION public.generate_telegram_token()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    text;
  v_token      text;
  v_chat_id    bigint;
  v_bot        text := 'atmind_bot';
BEGIN
  -- ¿Es usuario de workspace?
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = (auth.uid())::text;

  -- ¿Ya tiene Telegram vinculado?
  IF v_user_id IS NOT NULL THEN
    SELECT telegram_chat_id INTO v_chat_id FROM users WHERE id = v_user_id;
  ELSE
    SELECT telegram_chat_id INTO v_chat_id FROM admin_telegram WHERE auth_user_id = (auth.uid())::text;
  END IF;

  IF v_chat_id IS NOT NULL THEN
    RETURN json_build_object('already_linked', true, 'chat_id', v_chat_id);
  END IF;

  -- Invalidar tokens previos
  UPDATE telegram_link_tokens
  SET used_at = now()
  WHERE auth_user_id = (auth.uid())::text
  AND used_at IS NULL;

  -- Crear nuevo token
  INSERT INTO telegram_link_tokens (user_id, auth_user_id, entity_type)
  VALUES (
    v_user_id,
    (auth.uid())::text,
    CASE WHEN v_user_id IS NOT NULL THEN 'workspace_user' ELSE 'admin' END
  )
  RETURNING token INTO v_token;

  RETURN json_build_object(
    'link',              'https://t.me/' || v_bot || '?start=' || v_token,
    'token',             v_token,
    'expires_in_minutes', 30
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.generate_telegram_token() TO authenticated;

-- ── 5. Función RPC: desvincular Telegram ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.unlink_telegram()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET telegram_chat_id = NULL, telegram_username = NULL
  WHERE auth_user_id = (auth.uid())::text;
  DELETE FROM admin_telegram WHERE auth_user_id = (auth.uid())::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.unlink_telegram() TO authenticated;
