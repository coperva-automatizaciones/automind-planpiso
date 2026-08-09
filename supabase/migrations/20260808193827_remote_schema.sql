-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog;

CREATE EXTENSION pg_net WITH SCHEMA public;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.can_see_financieras()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  -- Agency owners: su agencia
  select agency_id from agency_memberships where user_id = auth.uid()
  union
  -- Workspace members: la agencia del workspace al que pertenecen
  select w.agency_id from workspaces w
  inner join users u on u.workspace_id = w.id or u.agency_id = w.id
  where u.auth_user_id = auth.uid();
$function$;

GRANT ALL ON FUNCTION public.can_see_financieras() TO anon;

GRANT ALL ON FUNCTION public.can_see_financieras() TO authenticated;

GRANT ALL ON FUNCTION public.can_see_financieras() TO service_role;

CREATE FUNCTION public.check_aprobacion_rol()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_rol TEXT;
  v_es_owner BOOLEAN;
  v_es_super BOOLEAN;
BEGIN
  -- Si los campos de aprobación no cambiaron, permitir sin restricción
  IF (NEW.e5_estado IS NOT DISTINCT FROM OLD.e5_estado)
     AND (NEW.e6_estado IS NOT DISTINCT FROM OLD.e6_estado) THEN
    RETURN NEW;
  END IF;

  -- Verificar rol del usuario
  SELECT rol INTO v_rol
  FROM users
  WHERE auth_user_id = auth.uid()
    AND (workspace_id = NEW.workspace_id OR agency_id = NEW.agency_id)
  LIMIT 1;

  SELECT EXISTS(
    SELECT 1 FROM agency_memberships
    WHERE user_id = auth.uid() AND agency_id = NEW.agency_id
  ) INTO v_es_owner;

  SELECT EXISTS(
    SELECT 1 FROM super_admins WHERE user_id = auth.uid()
  ) INTO v_es_super;

  IF v_rol IN ('gerente', 'director') OR v_es_owner OR v_es_super THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Solo gerentes o directores pueden modificar el estado de aprobación';
END;
$function$;

COMMENT ON FUNCTION public.check_aprobacion_rol() IS 'R9 fix: rechaza cambios a e5_estado/e6_estado si el usuario no tiene rol gerente/director.';

GRANT ALL ON FUNCTION public.check_aprobacion_rol() TO anon;

GRANT ALL ON FUNCTION public.check_aprobacion_rol() TO authenticated;

GRANT ALL ON FUNCTION public.check_aprobacion_rol() TO service_role;

CREATE FUNCTION public.generate_telegram_token()
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

GRANT ALL ON FUNCTION public.generate_telegram_token() TO anon;

GRANT ALL ON FUNCTION public.generate_telegram_token() TO authenticated;

GRANT ALL ON FUNCTION public.generate_telegram_token() TO service_role;

CREATE FUNCTION public.is_agency_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  select exists (
    select 1 from agency_memberships
    where user_id = auth.uid()
    and role in ('agency_owner','agency_admin')
  );
$function$;

GRANT ALL ON FUNCTION public.is_agency_admin() TO anon;

GRANT ALL ON FUNCTION public.is_agency_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_agency_admin() TO service_role;

CREATE FUNCTION public.is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  );
$function$;

GRANT ALL ON FUNCTION public.is_super_admin() TO anon;

GRANT ALL ON FUNCTION public.is_super_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_super_admin() TO service_role;

CREATE FUNCTION public.my_agency_id_for_fins()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  -- Agency owners
  select agency_id from agency_memberships
  where user_id = auth.uid() limit 1;
$function$;

GRANT ALL ON FUNCTION public.my_agency_id_for_fins() TO anon;

GRANT ALL ON FUNCTION public.my_agency_id_for_fins() TO authenticated;

GRANT ALL ON FUNCTION public.my_agency_id_for_fins() TO service_role;

CREATE FUNCTION public.my_agency_id_new()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  select agency_id from agency_memberships
  where user_id = auth.uid() limit 1;
$function$;

GRANT ALL ON FUNCTION public.my_agency_id_new() TO anon;

GRANT ALL ON FUNCTION public.my_agency_id_new() TO authenticated;

GRANT ALL ON FUNCTION public.my_agency_id_new() TO service_role;

CREATE FUNCTION public.my_agency_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT agency_id FROM users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
$function$;

GRANT ALL ON FUNCTION public.my_agency_id() TO anon;

GRANT ALL ON FUNCTION public.my_agency_id() TO authenticated;

GRANT ALL ON FUNCTION public.my_agency_id() TO service_role;

CREATE FUNCTION public.my_workspace_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  -- Super admin → todos los workspaces sin excepción
  SELECT w.id FROM workspaces w WHERE is_super_admin()
  UNION
  -- Agency owner/admin → todos los workspaces de su agencia
  SELECT w.id FROM workspaces w
  INNER JOIN agency_memberships am ON am.agency_id = w.agency_id
  WHERE am.user_id = auth.uid()
    AND am.role IN ('agency_owner','agency_admin','agency_support')
  UNION
  -- Miembro explícito de workspace
  SELECT wm.workspace_id FROM workspace_memberships wm
  WHERE wm.user_id = auth.uid()
  UNION
  -- Usuario registrado por workspace_id (tabla users)
  SELECT u.workspace_id FROM users u
  WHERE u.auth_user_id = auth.uid() AND u.workspace_id IS NOT NULL
  UNION
  -- Usuario registrado por agency_id (legacy)
  SELECT u.agency_id FROM users u
  WHERE u.auth_user_id = auth.uid() AND u.agency_id IS NOT NULL;
$function$;

GRANT ALL ON FUNCTION public.my_workspace_ids() TO anon;

GRANT ALL ON FUNCTION public.my_workspace_ids() TO authenticated;

GRANT ALL ON FUNCTION public.my_workspace_ids() TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE FUNCTION public.route_telegram_link()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;

GRANT ALL ON FUNCTION public.route_telegram_link() TO anon;

GRANT ALL ON FUNCTION public.route_telegram_link() TO authenticated;

GRANT ALL ON FUNCTION public.route_telegram_link() TO service_role;

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin new.updated_at = now(); return new; end; $function$;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;

GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

CREATE FUNCTION public.sync_telegram_from_metadata()
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
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
$function$;

GRANT ALL ON FUNCTION public.sync_telegram_from_metadata() TO anon;

GRANT ALL ON FUNCTION public.sync_telegram_from_metadata() TO authenticated;

GRANT ALL ON FUNCTION public.sync_telegram_from_metadata() TO service_role;

CREATE FUNCTION public.unlink_telegram()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  UPDATE users SET telegram_chat_id = NULL, telegram_username = NULL
  WHERE auth_user_id = (auth.uid())::text;
  DELETE FROM admin_telegram WHERE auth_user_id = (auth.uid())::text;
END;
$function$;

GRANT ALL ON FUNCTION public.unlink_telegram() TO anon;

GRANT ALL ON FUNCTION public.unlink_telegram() TO authenticated;

GRANT ALL ON FUNCTION public.unlink_telegram() TO service_role;

CREATE TABLE public.admin_telegram (
  auth_user_id      text                     NOT NULL,
  telegram_chat_id  bigint,
  telegram_username text,
  updated_at        timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_telegram
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_telegram
  ADD CONSTRAINT admin_telegram_pkey PRIMARY KEY (auth_user_id);

GRANT ALL ON public.admin_telegram TO anon;

GRANT ALL ON public.admin_telegram TO authenticated;

GRANT ALL ON public.admin_telegram TO service_role;

CREATE POLICY admin_tg_own ON public.admin_telegram
  FOR SELECT
  USING (((auth_user_id = (auth.uid())::text) OR public.is_super_admin()));

CREATE TABLE public.agencies (
  id                      uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  nombre                  text                     NOT NULL,
  ciudad                  text,
  iniciales               text,
  accent                  text                     DEFAULT '#2f6fed'::text,
  sidebar                 text                     DEFAULT '#1b2a57'::text,
  created_at              timestamp with time zone DEFAULT now(),
  owner_email             text,
  plan                    text                     DEFAULT 'pro'::text,
  telegram_chat_id        bigint,
  telegram_username       text,
  razon_social            text,
  rfc                     text,
  marca                   text,
  calle                   text,
  colonia                 text,
  municipio               text,
  cp                      text,
  estado                  text,
  rep_legal_nombre        text,
  rep_legal_email         text,
  aviso_privacidad_key    text,
  aviso_privacidad_nombre text
);

ALTER TABLE public.agencies
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);

GRANT ALL ON public.agencies TO anon;

GRANT ALL ON public.agencies TO authenticated;

GRANT ALL ON public.agencies TO service_role;

CREATE POLICY agencies_delete ON public.agencies
  FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY agencies_insert ON public.agencies
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY agencies_select ON public.agencies
  FOR SELECT
  USING (((id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE POLICY agencies_update ON public.agencies
  FOR UPDATE
  USING ((public.is_super_admin() OR (id = public.my_agency_id_new())));

CREATE POLICY agency_select ON public.agencies
  FOR SELECT
  USING ((id = public.my_agency_id()));

CREATE TABLE public.agency_memberships (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  agency_id  uuid                     NOT NULL,
  user_id    uuid                     NOT NULL,
  role       text                     DEFAULT 'agency_member'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.agency_memberships
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agency_memberships
  ADD CONSTRAINT agency_memberships_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.agency_memberships
  ADD CONSTRAINT agency_memberships_agency_id_user_id_key UNIQUE (agency_id, user_id);

ALTER TABLE public.agency_memberships
  ADD CONSTRAINT agency_memberships_pkey PRIMARY KEY (id);

ALTER TABLE public.agency_memberships
  ADD CONSTRAINT agency_memberships_role_check CHECK (role = ANY (ARRAY['agency_owner'::text, 'agency_admin'::text, 'agency_support'::text, 'agency_member'::text]));

ALTER TABLE public.agency_memberships
  ADD CONSTRAINT agency_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.agency_memberships TO anon;

GRANT ALL ON public.agency_memberships TO authenticated;

GRANT ALL ON public.agency_memberships TO service_role;

CREATE INDEX idx_agency_memberships_user ON public.agency_memberships (user_id);

CREATE POLICY agency_mem_delete ON public.agency_memberships
  FOR DELETE
  USING ((public.is_super_admin() OR (agency_id = public.my_agency_id_new())));

CREATE POLICY agency_mem_insert ON public.agency_memberships
  FOR INSERT
  WITH CHECK ((public.is_super_admin() OR ((agency_id = public.my_agency_id_new()) AND public.is_agency_admin())));

CREATE POLICY agency_mem_select ON public.agency_memberships
  FOR SELECT
  USING (((agency_id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE TABLE public.alert_log (
  id            uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id  uuid,
  vehicle_id    text,
  vehicle_desc  text,
  semaforo_from text,
  semaforo_to   text                     NOT NULL,
  sent_to       text[],
  error         text,
  created_at    timestamp with time zone DEFAULT now()
);

ALTER TABLE public.alert_log
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.alert_log
  ADD CONSTRAINT alert_log_pkey PRIMARY KEY (id);

GRANT ALL ON public.alert_log TO anon;

GRANT ALL ON public.alert_log TO authenticated;

GRANT ALL ON public.alert_log TO service_role;

CREATE INDEX idx_alert_log_ts ON public.alert_log (created_at DESC);

CREATE INDEX idx_alert_log_ws ON public.alert_log (workspace_id);

CREATE POLICY alert_log_insert ON public.alert_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY alert_log_select ON public.alert_log
  FOR SELECT
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE TABLE public.alert_rules (
  id               uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id     uuid                     NOT NULL,
  semaforo         text                     NOT NULL,
  notify_vendedor  boolean                  DEFAULT false NOT NULL,
  notify_gerente   boolean                  DEFAULT false NOT NULL,
  notify_director  boolean                  DEFAULT true NOT NULL,
  activa           boolean                  DEFAULT true NOT NULL,
  created_at       timestamp with time zone DEFAULT now(),
  telegram_enabled boolean                  DEFAULT false NOT NULL,
  mensajes         jsonb                    DEFAULT '{}'::jsonb,
  wa_activa        boolean                  DEFAULT false
);

ALTER TABLE public.alert_rules
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.alert_rules
  ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (id);

ALTER TABLE public.alert_rules
  ADD CONSTRAINT alert_rules_semaforo_check CHECK (semaforo = ANY (ARRAY['saludable'::text, 'rotacion'::text, 'comprometido'::text, 'vencer'::text, 'intereses'::text]));

ALTER TABLE public.alert_rules
  ADD CONSTRAINT alert_rules_workspace_id_semaforo_key UNIQUE (workspace_id, semaforo);

GRANT ALL ON public.alert_rules TO anon;

GRANT ALL ON public.alert_rules TO authenticated;

GRANT ALL ON public.alert_rules TO service_role;

CREATE INDEX idx_alert_rules_ws ON public.alert_rules (workspace_id);

CREATE POLICY alert_rules_delete ON public.alert_rules
  FOR DELETE
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY alert_rules_insert ON public.alert_rules
  FOR INSERT
  WITH CHECK (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY alert_rules_select ON public.alert_rules
  FOR SELECT
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY alert_rules_update ON public.alert_rules
  FOR UPDATE
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE TABLE public.cliente_historial (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  cliente_id     uuid                     NOT NULL,
  workspace_id   uuid,
  tipo_evento    text                     NOT NULL,
  descripcion    text                     NOT NULL,
  usuario_nombre text,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.cliente_historial
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cliente_historial
  ADD CONSTRAINT cliente_historial_pkey PRIMARY KEY (id);

GRANT ALL ON public.cliente_historial TO anon;

GRANT ALL ON public.cliente_historial TO authenticated;

GRANT ALL ON public.cliente_historial TO service_role;

CREATE INDEX idx_cliente_historial_cliente ON public.cliente_historial (cliente_id, created_at DESC);

CREATE POLICY historial_insert ON public.cliente_historial
  FOR INSERT
  WITH CHECK (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY historial_select ON public.cliente_historial
  FOR SELECT
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE TABLE public.clientes (
  id                         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  nombre_completo            text                     NOT NULL,
  telefono                   text,
  email                      text,
  tipo_cliente               text,
  canal_origen               text,
  fuente_especifica          text,
  interes_vehiculo           text,
  presupuesto_estimado       numeric(12,2),
  forma_pago                 text,
  uso_vehiculo               text,
  etapa_proceso              text                     DEFAULT 'Prospección'::text,
  asesor_id                  text,
  probabilidad_cierre        integer,
  ultimo_contacto            date,
  ciudad                     text,
  estado_rep                 text,
  proxima_accion             text,
  fecha_proxima_accion       date,
  notas                      text,
  workspace_id               uuid,
  agency_id                  uuid,
  created_at                 timestamp with time zone DEFAULT now(),
  updated_at                 timestamp with time zone DEFAULT now(),
  curp                       text,
  rfc                        text,
  fecha_nacimiento           text,
  sexo                       text,
  direccion                  text,
  colonia                    text,
  cp                         text,
  numero_licencia            text,
  tipo_licencia              text,
  vigencia_licencia          text,
  prueba_manejo              boolean                  DEFAULT false,
  fecha_prueba               text,
  unidad_prueba              text,
  resultado_prueba           text,
  obs_prueba                 text,
  e5_estado                  text                     DEFAULT 'Pendiente'::text,
  e5_aprobado_por            text,
  e5_fecha                   timestamp with time zone,
  e5_notas                   text,
  unidad_id                  text,
  unidad_desc                text,
  precio_lista               numeric(12,2),
  descuento_monto            numeric(12,2)            DEFAULT 0,
  precio_venta               numeric(12,2),
  forma_pago_cot             text,
  enganche                   numeric(12,2),
  plazo_meses                integer,
  mensualidad_est            numeric(12,2),
  notas_cot                  text,
  e6_estado                  text                     DEFAULT 'Pendiente'::text,
  e6_institucion             text,
  e6_monto_aprobado          numeric(12,2),
  e6_mensualidad_real        numeric(12,2),
  e6_condiciones             text,
  e6_fecha_solicitud         date,
  e6_fecha_resultado         date,
  e7_contrato_ok             boolean                  DEFAULT false,
  e7_excepcion_auth          boolean                  DEFAULT false,
  e7_excepcion_nota          text,
  e7_obs                     text,
  e8_contrato_url            text,
  e8_contrato_nombre         text,
  e8_contrato_fecha          date,
  doc_id_key                 text,
  doc_id_nombre              text,
  doc_lic_key                text,
  doc_lic_nombre             text,
  doc_dom_key                text,
  doc_dom_nombre             text,
  estado_general             text                     DEFAULT 'Activo'::text,
  pago_metodo                text,
  pago_fecha                 text,
  pago_referencia            text,
  pago_monto                 numeric,
  pago_notas                 text,
  entrega_fecha              text,
  entrega_km                 text,
  entrega_notas              text,
  doc_factura_key            text,
  doc_factura_nombre         text,
  doc_comprobante_key        text,
  doc_comprobante_nombre     text,
  doc_cred_carta_key         text,
  doc_cred_carta_nombre      text,
  doc_cred_solicitud_key     text,
  doc_cred_solicitud_nombre  text,
  doc_cred_estado_cta_key    text,
  doc_cred_estado_cta_nombre text,
  doc_cred_contrato_key      text,
  doc_cred_contrato_nombre   text,
  doc_rfc_key                text,
  doc_rfc_nombre             text,
  doc_ev_prueba_key          text,
  doc_ev_prueba_nombre       text,
  doc_comprobantes           jsonb,
  doc_encuesta_prueba_key    text,
  doc_encuesta_prueba_nombre text,
  tel_verificado_at          timestamp with time zone,
  tel_verificado_metodo      text,
  email_verificado_at        timestamp with time zone,
  email_verificado_metodo    text,
  encuesta_prospeccion       jsonb                    DEFAULT '{}'::jsonb,
  doc_aviso_key              text,
  doc_aviso_nombre           text,
  doc_cotizacion_key         text,
  doc_cotizacion_nombre      text,
  pago_validado              boolean                  DEFAULT false,
  pago_validado_por          text,
  pago_validado_en           timestamp with time zone,
  cotizacion_modelo_extract  text,
  cotizacion_vehiculo_match  boolean,
  vin_vinculado              text,
  inventario_id              text,
  monto_financiado           numeric(12,2),
  doc_lavado_dinero_tipo     text                     DEFAULT 'fisica'::text,
  doc_lavado_dinero_key      text,
  doc_lavado_dinero_nombre   text,
  doc_conformacion_key       text,
  doc_conformacion_nombre    text
);

COMMENT ON COLUMN public.clientes.doc_factura_key IS 'Storage key — factura del vehículo';

COMMENT ON COLUMN public.clientes.doc_factura_nombre IS 'Nombre de archivo de la factura';

COMMENT ON COLUMN public.clientes.doc_comprobante_key IS 'Storage key — comprobante de pago';

COMMENT ON COLUMN public.clientes.doc_comprobante_nombre IS 'Nombre de archivo del comprobante';

COMMENT ON COLUMN public.clientes.cotizacion_modelo_extract IS 'Modelo extraído por IA de la cotización cargada (E4). Se usa para verificar coincidencia con el vehículo seleccionado.';

COMMENT ON COLUMN public.clientes.cotizacion_vehiculo_match IS 'true si el modelo de la cotización coincide con el vehículo seleccionado; false si hay discrepancia; null si no se ha verificado.';

ALTER TABLE public.clientes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_canal_origen_check CHECK (canal_origen = ANY (ARRAY['Digital'::text, 'Piso'::text, 'Referido'::text, 'Marketplace'::text, 'Otro'::text]));

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_etapa_proceso_check
    CHECK
    (etapa_proceso = ANY (ARRAY['Prospección'::text, 'Perfilamiento'::text, 'Presentación'::text, 'Cotización'::text, 'Expediente'::text, 'Pago'::text, 'Crédito'::text,
    'Cierre'::text, 'Entrega'::text]));

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_forma_pago_check CHECK (forma_pago = ANY (ARRAY['Contado'::text, 'Crédito'::text, 'No definido'::text]));

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

ALTER TABLE public.cliente_historial
  ADD CONSTRAINT cliente_historial_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_probabilidad_cierre_check CHECK (probabilidad_cierre >= 0 AND probabilidad_cierre <= 100);

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_tipo_cliente_check CHECK (tipo_cliente = ANY (ARRAY['Persona física'::text, 'Persona moral'::text]));

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_uso_vehiculo_check CHECK (uso_vehiculo = ANY (ARRAY['Personal'::text, 'Trabajo'::text, 'Familiar'::text]));

GRANT ALL ON public.clientes TO anon;

GRANT ALL ON public.clientes TO authenticated;

GRANT ALL ON public.clientes TO service_role;

CREATE INDEX clientes_workspace_idx ON public.clientes (workspace_id);

CREATE INDEX clientes_etapa_idx ON public.clientes (etapa_proceso);

CREATE INDEX clientes_asesor_idx ON public.clientes (asesor_id);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_check_aprobacion_rol
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_aprobacion_rol();

CREATE POLICY clientes_delete ON public.clientes
  FOR DELETE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY clientes_insert ON public.clientes
  FOR INSERT
  WITH
    CHECK
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY clientes_select ON public.clientes
  FOR SELECT
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY clientes_update ON public.clientes
  FOR UPDATE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE TABLE public.financieras (
  id                uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  agency_id         uuid                     NOT NULL,
  nombre            text                     NOT NULL,
  tasa              numeric                  DEFAULT 0.14 NOT NULL,
  plazo_dias        integer                  DEFAULT 90 NOT NULL,
  dias_gracia_extra integer                  DEFAULT 0 NOT NULL,
  logo_url          text,
  activa            boolean                  DEFAULT true NOT NULL,
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now(),
  workspace_id      uuid
);

ALTER TABLE public.financieras
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financieras
  ADD CONSTRAINT financieras_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.financieras
  ADD CONSTRAINT financieras_agency_id_nombre_key UNIQUE (agency_id, nombre);

ALTER TABLE public.financieras
  ADD CONSTRAINT financieras_pkey PRIMARY KEY (id);

GRANT ALL ON public.financieras TO anon;

GRANT ALL ON public.financieras TO authenticated;

GRANT ALL ON public.financieras TO service_role;

CREATE INDEX idx_financieras_agency ON public.financieras (agency_id);

CREATE INDEX idx_financieras_workspace ON public.financieras (workspace_id);

CREATE TRIGGER trg_financieras_updated
  BEFORE UPDATE ON public.financieras
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY fin_delete ON public.financieras
  FOR DELETE
  USING (((agency_id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE POLICY fin_insert ON public.financieras
  FOR INSERT
  WITH CHECK (((agency_id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE POLICY fin_select ON public.financieras
  FOR SELECT
  USING (((agency_id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE POLICY fin_update ON public.financieras
  FOR UPDATE
  USING (((agency_id = public.my_agency_id_new()) OR public.is_super_admin()));

CREATE TABLE public.inventario (
  id                text                     NOT NULL,
  agency_id         uuid                     NOT NULL,
  vin               text,
  marca             text,
  modelo            text,
  anio              integer,
  color_exterior    text,
  color_interior    text,
  estatus           text                     DEFAULT 'NUEVOS'::text,
  inv               text,
  monto_financiado  numeric                  DEFAULT 0,
  pct_interes       numeric                  DEFAULT 0,
  dias_gracia_base  integer                  DEFAULT 0,
  dias_gracia_extra integer                  DEFAULT 0,
  fecha_factura     date,
  fecha_llegada     date,
  foto_url          text,
  vendedor_id       text,
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now(),
  workspace_id      uuid,
  semaforo_snapshot text,
  descripcion       text,
  tipo              text,
  observaciones     text,
  estado_venta      text                     DEFAULT 'DISPONIBLE'::text NOT NULL,
  fecha_venta       date,
  vendedor_ids      text[]                   DEFAULT '{}'::uuid[] NOT NULL,
  danado            boolean                  DEFAULT false NOT NULL
);

ALTER TABLE public.inventario
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventario
  ADD CONSTRAINT inventario_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.inventario
  ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id) ON DELETE SET NULL;

GRANT ALL ON public.inventario TO anon;

GRANT ALL ON public.inventario TO authenticated;

GRANT ALL ON public.inventario TO service_role;

CREATE INDEX idx_inventario_agency ON public.inventario (agency_id);

CREATE INDEX idx_inventario_vend ON public.inventario (vendedor_id);

CREATE INDEX idx_inventario_workspace ON public.inventario (workspace_id);

CREATE TRIGGER trg_inventario_updated
  BEFORE UPDATE ON public.inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY inv_delete ON public.inventario
  FOR DELETE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY inv_insert ON public.inventario
  FOR INSERT
  WITH
    CHECK
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY inv_select ON public.inventario
  FOR SELECT
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY inv_update ON public.inventario
  FOR UPDATE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE TABLE public.super_admin_audit_log (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  super_admin_user_id uuid                     NOT NULL,
  super_admin_email   text                     NOT NULL,
  accion              text                     NOT NULL,
  target_id           uuid,
  target_nombre       text,
  metadata            jsonb                    DEFAULT '{}'::jsonb,
  created_at          timestamp with time zone DEFAULT now()
);

ALTER TABLE public.super_admin_audit_log
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.super_admin_audit_log
  ADD CONSTRAINT super_admin_audit_log_accion_check
    CHECK (accion = ANY (ARRAY['login'::text, 'entrar_workspace'::text, 'crear_agencia'::text, 'eliminar_workspace'::text, 'eliminar_agencia'::text]));

ALTER TABLE public.super_admin_audit_log
  ADD CONSTRAINT super_admin_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE public.super_admin_audit_log
  ADD CONSTRAINT super_admin_audit_log_super_admin_user_id_fkey FOREIGN KEY (super_admin_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT ALL ON public.super_admin_audit_log TO anon;

GRANT ALL ON public.super_admin_audit_log TO authenticated;

GRANT ALL ON public.super_admin_audit_log TO service_role;

CREATE INDEX idx_audit_log_user ON public.super_admin_audit_log (super_admin_user_id);

CREATE INDEX idx_audit_log_ts ON public.super_admin_audit_log (created_at DESC);

CREATE POLICY audit_log_insert ON public.super_admin_audit_log
  FOR INSERT
  WITH CHECK ((public.is_super_admin() AND (super_admin_user_id = auth.uid())));

CREATE POLICY audit_log_select ON public.super_admin_audit_log
  FOR SELECT
  USING (public.is_super_admin());

CREATE TABLE public.super_admins (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid                     NOT NULL,
  email      text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.super_admins
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.super_admins
  ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);

ALTER TABLE public.super_admins
  ADD CONSTRAINT super_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.super_admins
  ADD CONSTRAINT super_admins_user_id_key UNIQUE (user_id);

GRANT ALL ON public.super_admins TO anon;

GRANT ALL ON public.super_admins TO authenticated;

GRANT ALL ON public.super_admins TO service_role;

CREATE POLICY super_admins_select ON public.super_admins
  FOR SELECT
  USING (((auth.uid() = user_id) OR public.is_super_admin()));

CREATE POLICY super_admins_self_select ON public.super_admins
  FOR SELECT
  USING (((user_id = auth.uid()) OR public.is_super_admin()));

CREATE TABLE public.telegram_link_tokens (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  token             text                     DEFAULT encode(extensions.gen_random_bytes(20), 'hex'::text) NOT NULL,
  user_id           text,
  used_at           timestamp with time zone,
  expires_at        timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  auth_user_id      text,
  entity_type       text                     DEFAULT 'workspace_user'::text,
  telegram_chat_id  bigint,
  telegram_username text
);

ALTER TABLE public.telegram_link_tokens
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.telegram_link_tokens
  ADD CONSTRAINT telegram_link_tokens_pkey PRIMARY KEY (id);

ALTER TABLE public.telegram_link_tokens
  ADD CONSTRAINT telegram_link_tokens_token_key UNIQUE (token);

GRANT ALL ON public.telegram_link_tokens TO anon;

GRANT ALL ON public.telegram_link_tokens TO authenticated;

GRANT ALL ON public.telegram_link_tokens TO service_role;

CREATE INDEX tg_tokens_auth_idx ON public.telegram_link_tokens (auth_user_id);

CREATE INDEX tg_tokens_token_idx ON public.telegram_link_tokens (token);

CREATE INDEX tg_tokens_user_idx ON public.telegram_link_tokens (user_id);

CREATE TRIGGER tg_route_telegram_link
  AFTER UPDATE ON public.telegram_link_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.route_telegram_link();

CREATE TABLE public.users (
  id                text                     NOT NULL,
  agency_id         uuid                     NOT NULL,
  auth_user_id      uuid,
  nombre            text                     NOT NULL,
  email             text                     NOT NULL,
  tel               text,
  rol               text                     NOT NULL,
  reporta_a         text,
  fecha_ingreso     date,
  created_at        timestamp with time zone DEFAULT now(),
  workspace_id      uuid,
  telegram_chat_id  bigint,
  telegram_username text,
  reporta_ids       text[]                   DEFAULT '{}'::uuid[]
);

CREATE POLICY clientes_delete_gerente_director ON public.clientes
  FOR DELETE
  USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE
    ((u.auth_user_id = auth.uid()) AND (u.rol = ANY (ARRAY['gerente'::text, 'director'::text])) AND ((u.workspace_id = clientes.workspace_id) OR (u.agency_id =
    clientes.agency_id))))) OR (EXISTS ( SELECT 1
   FROM public.agency_memberships am
  WHERE ((am.user_id = auth.uid()) AND (am.agency_id = clientes.agency_id)))) OR (EXISTS ( SELECT 1
   FROM public.super_admins sa
  WHERE (sa.user_id = auth.uid())))));

CREATE POLICY tg_tokens_own_insert ON public.telegram_link_tokens
  FOR INSERT
  WITH CHECK (((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))) OR public.is_super_admin()));

CREATE POLICY tg_tokens_own_select ON public.telegram_link_tokens
  FOR SELECT
  USING (((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))) OR public.is_super_admin()));

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD CONSTRAINT users_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_workspace_key UNIQUE (email, workspace_id);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.telegram_link_tokens
  ADD CONSTRAINT telegram_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_reporta_a_fkey FOREIGN KEY (reporta_a) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_rol_check CHECK (rol = ANY (ARRAY['director'::text, 'gerente'::text, 'vendedor'::text]));

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE INDEX idx_users_agency ON public.users (agency_id);

CREATE INDEX users_tg_chat_id_idx ON public.users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

CREATE INDEX idx_users_workspace ON public.users (workspace_id);

CREATE INDEX idx_users_auth_user_workspace ON public.users (auth_user_id, workspace_id);

CREATE INDEX idx_users_reporta_ids ON public.users USING gin (reporta_ids);

CREATE POLICY users_delete ON public.users
  FOR DELETE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY users_insert ON public.users
  FOR INSERT
  WITH
    CHECK
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY users_select ON public.users
  FOR SELECT
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE POLICY users_update ON public.users
  FOR UPDATE
  USING
    (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR (agency_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR
    public.is_super_admin()));

CREATE TABLE public.workspace_financieras (
  id                   uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id         uuid                     NOT NULL,
  financiera_id        uuid                     NOT NULL,
  tasa_override        numeric,
  plazo_dias_override  integer,
  dias_gracia_override integer,
  activa               boolean                  DEFAULT true NOT NULL,
  created_at           timestamp with time zone DEFAULT now()
);

ALTER TABLE public.workspace_financieras
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_financieras
  ADD CONSTRAINT workspace_financieras_financiera_id_fkey FOREIGN KEY (financiera_id) REFERENCES public.financieras(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_financieras
  ADD CONSTRAINT workspace_financieras_pkey PRIMARY KEY (id);

ALTER TABLE public.workspace_financieras
  ADD CONSTRAINT workspace_financieras_workspace_id_financiera_id_key UNIQUE (workspace_id, financiera_id);

GRANT ALL ON public.workspace_financieras TO anon;

GRANT ALL ON public.workspace_financieras TO authenticated;

GRANT ALL ON public.workspace_financieras TO service_role;

CREATE INDEX idx_wf_financiera ON public.workspace_financieras (financiera_id);

CREATE INDEX idx_wf_workspace ON public.workspace_financieras (workspace_id);

CREATE POLICY wf_delete ON public.workspace_financieras
  FOR DELETE
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY wf_insert ON public.workspace_financieras
  FOR INSERT
  WITH CHECK (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY wf_select ON public.workspace_financieras
  FOR SELECT
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY wf_update ON public.workspace_financieras
  FOR UPDATE
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE TABLE public.workspace_memberships (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id uuid                     NOT NULL,
  user_id      uuid                     NOT NULL,
  role         text                     DEFAULT 'workspace_member'::text NOT NULL,
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.workspace_memberships
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_pkey PRIMARY KEY (id);

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_role_check CHECK (role = ANY (ARRAY['workspace_owner'::text, 'workspace_admin'::text, 'workspace_member'::text, 'workspace_viewer'::text]));

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_workspace_id_user_id_key UNIQUE (workspace_id, user_id);

GRANT ALL ON public.workspace_memberships TO anon;

GRANT ALL ON public.workspace_memberships TO authenticated;

GRANT ALL ON public.workspace_memberships TO service_role;

CREATE INDEX idx_workspace_memberships_ws ON public.workspace_memberships (workspace_id);

CREATE INDEX idx_workspace_memberships_user ON public.workspace_memberships (user_id);

CREATE POLICY workspace_mem_select ON public.workspace_memberships
  FOR SELECT
  USING ((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)));

CREATE POLICY ws_mem_delete ON public.workspace_memberships
  FOR DELETE
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY ws_mem_insert ON public.workspace_memberships
  FOR INSERT
  WITH CHECK (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY ws_mem_select ON public.workspace_memberships
  FOR SELECT
  USING (((workspace_id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE TABLE public.workspaces (
  id                      uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  agency_id               uuid                     NOT NULL,
  nombre                  text                     NOT NULL,
  ciudad                  text,
  iniciales               text,
  accent                  text                     DEFAULT '#2f6fed'::text,
  sidebar                 text                     DEFAULT '#1b2a57'::text,
  status                  text                     DEFAULT 'active'::text,
  created_at              timestamp with time zone DEFAULT now(),
  aviso_privacidad_key    text,
  aviso_privacidad_nombre text,
  wa_director_tel         text,
  wa_gerente_tel          text
);

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

ALTER TABLE public.alert_log
  ADD CONSTRAINT alert_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.alert_rules
  ADD CONSTRAINT alert_rules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.financieras
  ADD CONSTRAINT financieras_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.inventario
  ADD CONSTRAINT inventario_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_financieras
  ADD CONSTRAINT workspace_financieras_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_status_check CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'trial'::text]));

GRANT ALL ON public.workspaces TO anon;

GRANT ALL ON public.workspaces TO authenticated;

GRANT ALL ON public.workspaces TO service_role;

CREATE INDEX idx_workspaces_agency ON public.workspaces (agency_id);

CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT
  WITH CHECK ((public.is_super_admin() OR ((agency_id = public.my_agency_id_new()) AND public.is_agency_admin())));

CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT
  USING (((id IN ( SELECT public.my_workspace_ids() AS my_workspace_ids)) OR public.is_super_admin()));

CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE
  USING ((public.is_super_admin() OR (agency_id = public.my_agency_id_new())));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
