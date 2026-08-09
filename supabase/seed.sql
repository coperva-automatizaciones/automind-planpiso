-- ═══════════════════════════════════════════════════════════════════════════
-- Automind · Plan Piso — Datos semilla para desarrollo local
--
-- Se aplica automáticamente en `supabase start` y en cada `supabase db reset`.
-- SOLO PARA LOCAL. Nunca ejecutar contra producción.
--
-- Contraseña de todas las cuentas:  automind123
--
--   director@local.test   → ve todo, no puede autoasignarse unidades
--   gerente@local.test    → ve todo, valida pagos
--   vendedor1@local.test  → solo sus unidades, sin cifras financieras, sin ⚫
--   vendedor2@local.test  → segundo vendedor, para probar multi-asignación
--   owner@local.test      → agency owner, ve el selector de workspaces
--   super@local.test      → super admin, ve el panel global de agencias
--
-- Identificadores fijos (users.id es TEXT pero reporta_ids es uuid[]:
-- los ids deben tener forma de UUID o la jerarquía no resuelve — ver reporte 03):
--   agencia    a0000000-0000-4000-8000-000000000001
--   workspace  b0000000-0000-4000-8000-000000000001
--   director   d0000000-0000-4000-8000-000000000001
--   gerente    d0000000-0000-4000-8000-000000000002
--   vendedor1  d0000000-0000-4000-8000-000000000003
--   vendedor2  d0000000-0000-4000-8000-000000000004
--   owner      d0000000-0000-4000-8000-000000000005
--   super      d0000000-0000-4000-8000-000000000006
--
-- Nota: sin metacomandos de psql (\set). El CLI envía este archivo como lote
-- al servidor, donde los backslash no existen.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Cuentas de autenticación ────────────────────────────────────────────
-- ⚠️ Las columnas de token van en cadena vacía, NO en NULL.
-- GoTrue las escanea a `string` de Go; un NULL revienta el escaneo y el login
-- falla con «Database error querying schema», que no dice nada del problema real.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  v.id::uuid, 'authenticated', 'authenticated', v.email,
  crypt('automind123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
  '', '', '', '', '', '', '', ''
FROM (VALUES
  ('d0000000-0000-4000-8000-000000000001', 'director@local.test'),
  ('d0000000-0000-4000-8000-000000000002', 'gerente@local.test'),
  ('d0000000-0000-4000-8000-000000000003', 'vendedor1@local.test'),
  ('d0000000-0000-4000-8000-000000000004', 'vendedor2@local.test'),
  ('d0000000-0000-4000-8000-000000000005', 'owner@local.test'),
  ('d0000000-0000-4000-8000-000000000006', 'super@local.test')
) AS v(id, email);

-- GoTrue exige una identidad de proveedor para permitir login con contraseña.
-- OJO: identities.email es una columna GENERADA (lower(identity_data->>'email')),
-- así que no se puede insertar directamente — sale del jsonb de abajo.
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@local.test';


-- ── 2. Agencia y workspace ─────────────────────────────────────────────────
INSERT INTO public.agencies (id, nombre, ciudad, iniciales, owner_email, plan, razon_social, rfc, marca)
VALUES ('a0000000-0000-4000-8000-000000000001', 'Grupo Demo Local', 'CDMX', 'GDL',
        'owner@local.test', 'pro', 'Grupo Demo Local SA de CV', 'GDL010101AAA', 'Multimarca');

INSERT INTO public.workspaces (id, agency_id, nombre, ciudad, iniciales, accent, sidebar, status)
VALUES ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'Sucursal Centro', 'CDMX', 'SC', '#2f6fed', '#1b2a57', 'active');


-- ── 3. Colaboradores y jerarquía ───────────────────────────────────────────
-- vendedor → gerente → director. Es la cadena que resuelve los destinatarios
-- de las alertas (ver reporte 01 §4.2).
INSERT INTO public.users (id, agency_id, workspace_id, auth_user_id, nombre, email, tel, rol, reporta_ids, fecha_ingreso)
VALUES
  ('d0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'Diana Directora',  'director@local.test',  '5551000001', 'director',
   '{}'::uuid[], '2024-01-15'),

  ('d0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000002',
   'Gerardo Gerente',  'gerente@local.test',   '5551000002', 'gerente',
   ARRAY['d0000000-0000-4000-8000-000000000001']::uuid[], '2024-03-01'),

  ('d0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000003',
   'Vanesa Vendedora', 'vendedor1@local.test', '5551000003', 'vendedor',
   ARRAY['d0000000-0000-4000-8000-000000000002']::uuid[], '2024-06-10'),

  ('d0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000004',
   'Víctor Vendedor',  'vendedor2@local.test', '5551000004', 'vendedor',
   ARRAY['d0000000-0000-4000-8000-000000000002']::uuid[], '2025-02-20');

-- Agency owner: sin fila en users. Su acceso viene de agency_memberships, y es
-- lo que dispara el WorkspaceSelector al entrar (ver db.js → getUserContext).
INSERT INTO public.agency_memberships (agency_id, user_id, role)
VALUES ('a0000000-0000-4000-8000-000000000001',
        'd0000000-0000-4000-8000-000000000005', 'agency_owner');

-- Super admin: acceso global al panel de agencias
INSERT INTO public.super_admins (user_id, email)
VALUES ('d0000000-0000-4000-8000-000000000006', 'super@local.test');


-- ── 4. Reglas de alerta ────────────────────────────────────────────────────
-- Mismos valores por defecto que db.js → createWorkspace: solo se avisa
-- cuando el estado importa.
INSERT INTO public.alert_rules (workspace_id, semaforo, notify_vendedor, notify_gerente, notify_director, activa)
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'saludable',    false, false, false, false),
  ('b0000000-0000-4000-8000-000000000001', 'rotacion',     false, false, false, false),
  ('b0000000-0000-4000-8000-000000000001', 'comprometido', true,  true,  true,  true),
  ('b0000000-0000-4000-8000-000000000001', 'vencer',       true,  true,  true,  true),
  ('b0000000-0000-4000-8000-000000000001', 'intereses',    true,  true,  true,  true);


-- ── 5. Inventario que cubre los cinco estados del semáforo ─────────────────
-- Fechas relativas a hoy, así el seed no caduca.
-- Con dias_gracia_base = 30:  diasEnPiso = (hoy − fecha_factura) − 1
--                             pct        = diasEnPiso / 30 × 100
INSERT INTO public.inventario (
  id, agency_id, workspace_id, vin, marca, modelo, anio, color_exterior,
  estatus, inv, monto_financiado, pct_interes, dias_gracia_base, dias_gracia_extra,
  fecha_factura, fecha_llegada, vendedor_ids, estado_venta, danado, descripcion
) VALUES
  -- 🟢 saludable — 10 días en piso, 33 % del plan
  ('V-LOCAL-001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000001', 'Volkswagen', 'Jetta', 2026, 'Blanco Puro',
   'NUEVOS', '9001', 485000, 0.14, 30, 0, (current_date - 11), (current_date - 9),
   ARRAY['d0000000-0000-4000-8000-000000000003']::uuid[], 'DISPONIBLE', false, 'JETTA TRENDLINE'),

  -- 🟡 rotación — 20 días, 67 %
  ('V-LOCAL-002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000002', 'Volkswagen', 'Virtus', 2026, 'Gris Platino',
   'NUEVOS', '9002', 398000, 0.14, 30, 0, (current_date - 21), (current_date - 19),
   ARRAY['d0000000-0000-4000-8000-000000000003']::uuid[], 'DISPONIBLE', false, 'VIRTUS COMFORTLINE'),

  -- 🟠 comprometido — 24 días, 80 %
  ('V-LOCAL-003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000003', 'Chevrolet', 'Onix', 2026, 'Rojo Chili',
   'NUEVOS', '9003', 342000, 0.145, 30, 0, (current_date - 25), (current_date - 23),
   ARRAY['d0000000-0000-4000-8000-000000000004']::uuid[], 'DISPONIBLE', false, 'ONIX LT'),

  -- 🔴 por vencer — 27 días, 90 %
  ('V-LOCAL-004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000004', 'Chevrolet', 'Aveo', 2026, 'Negro Ébano',
   'NUEVOS', '9004', 289000, 0.145, 30, 0, (current_date - 28), (current_date - 26),
   ARRAY['d0000000-0000-4000-8000-000000000003',
         'd0000000-0000-4000-8000-000000000004']::uuid[], 'DISPONIBLE', false, 'AVEO LS'),

  -- ⚫ en intereses — 40 días, 133 %
  ('V-LOCAL-005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000005', 'Volkswagen', 'Taos', 2025, 'Azul Cornflower',
   'NUEVOS', '9005', 612000, 0.15, 30, 0, (current_date - 41), (current_date - 39),
   ARRAY['d0000000-0000-4000-8000-000000000004']::uuid[], 'DISPONIBLE', false, 'TAOS HIGHLINE'),

  -- ⚠️ CASO BORDE 1 — exactamente 100 % del plan consumido.
  -- Debe verse 🔴 «por vencer», NO ⚫: el umbral es > 100, no >= 100.
  ('V-LOCAL-006', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000006', 'Chevrolet', 'Groove', 2026, 'Blanco Summit',
   'NUEVOS', '9006', 375000, 0.14, 30, 0, (current_date - 31), (current_date - 29),
   ARRAY['d0000000-0000-4000-8000-000000000003']::uuid[], 'DISPONIBLE', false, 'GROOVE LT'),

  -- ⚠️ CASO BORDE 2 — SIN días de gracia configurados.
  -- Aquí se ve el bug: el tablero la muestra ⚫ y el editor 🟢.
  -- Ver reporte 01 §7.1 y reporte 03 lección 1.
  ('V-LOCAL-007', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000007', 'Volkswagen', 'Nivus', 2026, 'Plata Pyrit',
   'NUEVOS', '9007', 447000, 0.14, 0, 0, (current_date - 15), (current_date - 13),
   ARRAY['d0000000-0000-4000-8000-000000000004']::uuid[], 'DISPONIBLE', false, 'NIVUS HIGHLINE'),

  -- 🔧 unidad dañada, para el KPI y el badge del dashboard
  ('V-LOCAL-008', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000008', 'Chevrolet', 'Captiva', 2025, 'Gris Titanio',
   'NUEVOS', '9008', 528000, 0.15, 30, 15, (current_date - 35), (current_date - 33),
   ARRAY['d0000000-0000-4000-8000-000000000003']::uuid[], 'DISPONIBLE', true, 'CAPTIVA PREMIER'),

  -- ✅ vendida este mes — aparece en «vendidos del mes» y sale del plan piso
  ('V-LOCAL-009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000009', 'Volkswagen', 'T-Cross', 2026, 'Blanco Puro',
   'NUEVOS', '9009', 419000, 0.14, 30, 0, (current_date - 22), (current_date - 20),
   ARRAY['d0000000-0000-4000-8000-000000000003']::uuid[], 'VENDIDO', false, 'T-CROSS TRENDLINE'),

  -- 📦 sin vendedor asignado — dispara el «auto-sanado» de app.jsx al entrar
  ('V-LOCAL-010', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   '3VW1K1AJ0PM000010', 'Chevrolet', 'Tracker', 2026, 'Azul Marino',
   'NUEVOS', '9010', 465000, 0.145, 30, 0, (current_date - 18), (current_date - 16),
   '{}'::uuid[], 'DISPONIBLE', false, 'TRACKER LS');

UPDATE public.inventario SET fecha_venta = current_date - 3 WHERE id = 'V-LOCAL-009';


-- ── 6. Clientes del pipeline, en distintas etapas ──────────────────────────
INSERT INTO public.clientes (
  workspace_id, agency_id, nombre_completo, telefono, email, tipo_cliente,
  canal_origen, interes_vehiculo, presupuesto_estimado, forma_pago,
  etapa_proceso, asesor_id, estado_general, ciudad
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Ana Lucía Márquez', '5552000001', 'ana.marquez@local.test', 'Persona física',
   'Digital', 'Volkswagen Jetta 2026', 500000, 'Crédito',
   'Prospección', 'd0000000-0000-4000-8000-000000000003', 'Activo', 'CDMX'),

  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Roberto Cárdenas', '5552000002', 'roberto.cardenas@local.test', 'Persona física',
   'Piso', 'Chevrolet Onix 2026', 360000, 'Contado',
   'Cotización', 'd0000000-0000-4000-8000-000000000004', 'Activo', 'CDMX'),

  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Constructora Herrera SA', '5552000003', 'compras@herrera.local.test', 'Persona moral',
   'Referido', 'Chevrolet Captiva 2025', 550000, 'Crédito',
   'Crédito', 'd0000000-0000-4000-8000-000000000003', 'Activo', 'Estado de México'),

  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Mariana Ontiveros', '5552000004', 'mariana.ontiveros@local.test', 'Persona física',
   'Digital', 'Volkswagen T-Cross 2026', 430000, 'Crédito',
   'Cierre', 'd0000000-0000-4000-8000-000000000003', 'Activo', 'CDMX');
