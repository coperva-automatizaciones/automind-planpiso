-- Automind · Fix type mismatch en generate_telegram_token
-- Correr en Supabase SQL Editor (reemplaza la función anterior)

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
  -- users.auth_user_id es UUID, auth.uid() es UUID — comparar directo
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();

  -- ¿Ya tiene Telegram vinculado?
  IF v_user_id IS NOT NULL THEN
    SELECT telegram_chat_id INTO v_chat_id FROM users WHERE id = v_user_id;
  ELSE
    -- admin_telegram.auth_user_id es TEXT
    SELECT telegram_chat_id INTO v_chat_id
    FROM admin_telegram
    WHERE auth_user_id = (auth.uid())::text;
  END IF;

  IF v_chat_id IS NOT NULL THEN
    RETURN json_build_object('already_linked', true, 'chat_id', v_chat_id);
  END IF;

  -- Invalidar tokens previos (telegram_link_tokens.auth_user_id es TEXT)
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

GRANT EXECUTE ON FUNCTION public.generate_telegram_token() TO authenticated;
