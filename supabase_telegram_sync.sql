-- Automind · Sync Telegram desde auth.app_metadata → admin_telegram
-- Correr en Supabase SQL Editor

-- Función que lee el telegram_chat_id de auth.users.raw_app_meta_data
-- y lo copia a admin_telegram (para que el UI lo encuentre)
CREATE OR REPLACE FUNCTION public.sync_telegram_from_metadata()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_chat_id bigint;
  v_username text;
BEGIN
  SELECT
    (raw_app_meta_data->>'telegram_chat_id')::bigint,
    raw_app_meta_data->>'telegram_username'
  INTO v_chat_id, v_username
  FROM auth.users
  WHERE id = auth.uid();

  IF v_chat_id IS NOT NULL THEN
    INSERT INTO public.admin_telegram (auth_user_id, telegram_chat_id, telegram_username, updated_at)
    VALUES ((auth.uid())::text, v_chat_id, v_username, now())
    ON CONFLICT (auth_user_id) DO UPDATE
      SET telegram_chat_id  = EXCLUDED.telegram_chat_id,
          telegram_username = EXCLUDED.telegram_username,
          updated_at        = now();
    RETURN json_build_object('synced', true, 'chat_id', v_chat_id);
  END IF;

  RETURN json_build_object('synced', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_telegram_from_metadata() TO authenticated;
