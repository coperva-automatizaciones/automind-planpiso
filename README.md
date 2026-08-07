# Automind · Plan Piso

Sistema web de **gestión de inventario en piso** para agencias automotrices. Centraliza el control de unidades financiadas, calcula automáticamente el semáforo de riesgo por plan de gracia y notifica al equipo cuando una unidad cambia de estado.

**Demo / Producción:** [automind-planpiso.vercel.app](https://automind-planpiso.vercel.app/)

---

## ¿Qué hace?

Cada vehículo financiado tiene un **plan de gracia** — días en los que el concesionario no paga intereses al banco. El sistema calcula en tiempo real cuánto plan le queda a cada unidad y lo muestra con un semáforo de 5 estados:

| Estado | % Plan consumido | Significado |
|---|---|---|
| 🟢 Saludable | ≤ 61 % | Dentro del plan de gracia |
| 🟡 Rotación | > 61 % | Rotación media |
| 🟠 Comprometido | > 76 % | Margen comprometido |
| 🔴 Por vencer | > 86 % | Próximo a generar interés |
| ⚫ Intereses | > 100 % | Ya genera intereses — acción inmediata |

Cuando una unidad cambia de estado el sistema envía alertas automáticas por **correo electrónico, Telegram y WhatsApp** al vendedor, gerente y director correspondientes.

---

## Características principales

- **Semáforo en tiempo real** — cálculo automático de días en piso, interés acumulado y % de plan consumido.
- **Importación desde Excel** — sube tu plantilla `.xlsx` y el sistema detecta columnas automáticamente. Incluye campo "Autodañado" para marcar unidades con daño físico.
- **Multi-tenant** — estructura por Agencia → Workspaces (sucursales) con Row Level Security en Supabase.
- **Alertas multicanal** — Brevo (email), Telegram Bot API y WhatsApp (Meta Cloud API). Configurable por workspace y por estado de semáforo.
- **Asistente del vendedor (CRM)** — pipeline de ventas E1–E10: prospección, cotización, aprobación de gerente, proceso de crédito, validación de expediente, contrato, entrega.
- **Extracción IA de documentos** — sube INE, comprobante de domicilio, RFC, licencia o cotización y los datos se pre-llenan automáticamente vía Claude (Anthropic).
- **Dashboard gerencial** — KPIs, tabla semáforo, distribución por modelo, antigüedad, carga por vendedor, unidades dañadas y vendidos del mes.
- **Verificación de contacto** — valida email (MX lookup) y número de WhatsApp antes de enviar.
- **Control de roles** — `director`, `gerente` y `vendedor`, cada uno con permisos diferenciados en UI y RLS.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 (UMD CDN) + Babel Standalone — **sin bundler ni npm local** |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Edge Functions | Deno / TypeScript en Supabase |
| Hosting | Vercel — deploy automático desde `main` |
| Email | Brevo (Sendinblue) |
| Mensajería | Telegram Bot API · Meta Cloud API (WhatsApp) |
| IA | Anthropic Claude (extracción de documentos) |
| Excel | SheetJS (`xlsx`) |

> El proyecto es una **SPA sin build step**. Los `.jsx` se transpilan en el navegador con `@babel/standalone`. No hay `npm install` ni paso de compilación local.

---

## Estructura de archivos

```
automind-planpiso/
├── index.html               # Shell, estilos CSS, carga de scripts, render raíz
├── config.js                # Credenciales Supabase (URL + anon key pública)
├── db.js                    # Capa de datos — window.DB (auth, CRUD, alertas)
├── app.jsx                  # Componente raíz, ruteo de vistas, VehicleDrawer
├── login.jsx                # LoginScreen, SetPasswordScreen, computarKpis
├── components.jsx           # SEM (semáforo), iconos, Sidebar, TopBar, helpers
├── dashboard.jsx            # Vista Dashboard — KPIs, semáforo, lista detallada
├── inventario-editor.jsx    # Editor de vehículos (formulario completo)
├── import.jsx               # Importación de inventario desde Excel
├── crm.jsx                  # Asistente del vendedor — pipeline E1–E10
├── colaboradores.jsx        # Gestión de equipo (vendedor / gerente / director)
├── alertas.jsx              # Configuración de alertas por semáforo
├── super-admin.jsx          # Panel superadmin — gestión de agencias
├── workspace-selector.jsx   # Selector de workspaces para agency owners
├── supabase/
│   └── functions/
│       ├── invite-user/     # Genera magic link de invitación vía Brevo
│       ├── send-alert/      # Envía alertas email + Telegram + WhatsApp
│       ├── daily-semaforo-check/  # Cron diario — re-evalúa semáforo
│       ├── extract-document/      # Extracción IA de documentos con Claude
│       ├── send-telegram/         # Envío de mensajes Telegram
│       └── verify-contact/        # Verifica email MX y WhatsApp
├── supabase_schema.sql      # Esquema base: agencies, users, inventario, RLS
├── supabase_multitenant.sql # Capa multi-tenant: workspaces + memberships
└── DEPLOY.md                # Guía de despliegue paso a paso
```

---

## Modelo de datos

```
agencies (tenant raíz)
  └── workspaces (sucursales)
        ├── users (rol: director | gerente | vendedor)
        ├── inventario (vehículos del plan piso)
        ├── alert_rules (reglas por semáforo y canal)
        └── clientes (pipeline CRM)
```

- **Multi-tenancy** vía RLS — cada usuario solo ve datos de su agencia/workspace.
- **super_admins** — tabla separada que otorga acceso total a todas las agencias.

---

## Primeros pasos

### 1. Requisitos previos

- Cuenta en [Supabase](https://supabase.com/) (plan gratuito funciona)
- Cuenta en [Vercel](https://vercel.com/) para el hosting
- (Opcional) Cuenta Brevo para email, bot de Telegram, cuenta Meta Business para WhatsApp

### 2. Base de datos

Ejecuta los siguientes scripts en el SQL Editor de Supabase **en este orden**:

```
supabase_schema.sql
supabase_multitenant.sql
supabase_alerts.sql
supabase_superadmin_definitivo.sql
```

Migraciones adicionales (aplicar según funcionalidades activas):
```
supabase_danado.sql          # Campo vehículo dañado
supabase_docs_cumplimiento.sql  # Documentos lavado de dinero
supabase_alertas_default_all_on.sql  # Activar todas las alertas por default
```

### 3. Configuración

Edita `config.js` con tus credenciales de Supabase:

```js
window.SUPABASE_URL  = "https://TU_PROJECT_REF.supabase.co";
window.SUPABASE_ANON = "TU_ANON_KEY";
```

> La `anon key` es pública por diseño en Supabase. **Nunca** pongas la `service_role key` en el cliente.

### 4. Edge Functions

```bash
# Desde la raíz del proyecto
npx supabase functions deploy invite-user     --project-ref TU_PROJECT_REF
npx supabase functions deploy send-alert      --project-ref TU_PROJECT_REF
npx supabase functions deploy daily-semaforo-check --project-ref TU_PROJECT_REF
npx supabase functions deploy extract-document --project-ref TU_PROJECT_REF
npx supabase functions deploy send-telegram   --project-ref TU_PROJECT_REF
npx supabase functions deploy verify-contact  --project-ref TU_PROJECT_REF
```

Secrets requeridos (configurar en Supabase → Edge Functions → Secrets):

| Secret | Descripción |
|---|---|
| `BREVO_API_KEY` | API key de Brevo para emails |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `META_WA_TOKEN` | Token de acceso Meta Cloud API |
| `META_WA_PHONE_ID` | ID del número de WhatsApp Business |
| `ANTHROPIC_API_KEY` | API key de Claude para extracción de documentos |
| `CRON_SECRET` | Secret para autenticar el cron de semáforo |
| `EXTRACT_API_KEY` | API key interna para extract-document |

### 5. Despliegue

Conecta el repositorio en Vercel — el deploy es automático en cada push a `main`. No se requiere configuración de build (es HTML estático).

---

## Convenciones de desarrollo

- **Idioma:** todo en español — UI, comentarios, variables de dominio.
- **Sin módulos:** no hay `import`/`export`. Cada archivo expone sus símbolos en `window` (ej. `Object.assign(window, { App })`).
- **Estado global:** `window.AUTOMIND` contiene `ROWS`, `USUARIOS`, `KPIS`, `agencyId` del workspace activo.
- **Mapeo de nombres:** la BD usa `snake_case`, la app usa `camelCase`. Los mapeos viven en `db.js`.
- **Versiones de cache:** los `.jsx` se versionan con querystring en `index.html` (`crm.jsx?v=20260804b`) para forzar recarga en producción.

---

## Licencia

Uso interno — © Coperva / Automind 2026.
