# Automind · Plan Piso — Contexto del proyecto

App web de **gestión de inventario en piso ("plan piso")** para agencias automotrices.
Una agencia no compra los autos de su piso de exhibición: los financia. El banco da unos días
de gracia sin intereses; pasados esos días, **cada unidad parada cuesta dinero todos los días**.
Un **semáforo de cinco estados** traduce eso en una señal de acción, y cuando una unidad cambia
de estado el sistema notifica al vendedor, su gerente y su director.

- **Repo:** https://github.com/automatizacionia-stack/automind-planpiso (`origin/main`)
- **Supabase project ref:** `wjdntftoyqkkycaozlhn`
- **Hosting:** Vercel — https://automind-planpiso.vercel.app/ (deploy automático desde `main`)
- **Idioma del producto y del código:** español. Mantenerlo así.

> ### 🔨 Este MVP va a ser reemplazado
> Se está reconstruyendo desde cero con otro stack. Este repositorio vale como **fuente de
> conocimiento de dominio**, no como base a mejorar. Antes de proponer refactors grandes,
> pregunta si tiene sentido invertir aquí.
>
> **El análisis completo está en [`docs/`](docs/)** — dominio, features, lecciones, requisitos
> para v2, entorno local y plan de limpieza. Cada afirmación con `archivo:línea`.

---

## ⚠️ Trampas verificadas — léelas antes de tocar nada

Cinco cosas que parecen ciertas y no lo son. Cada una ha costado tiempo real.

### 1. Las Edge Functions de la raíz NO son las que se despliegan

Existen dos copias de cinco funciones. **Solo se despliega `supabase/functions/<nombre>/index.ts`.**
Las de la raíz (`send-alert.ts`, `invite-user.ts`, `extract-document.ts`, `send-telegram.ts`,
`delete-user.ts`) están congeladas desde 2026-07-27 y **divergen** en cientos de líneas.

**Editar la de la raíz no tiene ningún efecto.**

### 2. El semáforo está implementado 7 veces y las copias divergieron

| Ubicación | Rol |
|---|---|
| [`app.jsx:267-303`](app.jsx#L267) | **Canónica** — úsala como referencia |
| [`db.js:275-291`](db.js#L275) | Al guardar, para detectar cambio de estado |
| [`import.jsx:171-186`](import.jsx#L171) | Al importar Excel |
| [`inventario-editor.jsx:17-42`](inventario-editor.jsx#L17) | ⚠️ **Diverge** |
| [`login.jsx:290-324`](login.jsx#L290) | ⚠️ **Diverge** |
| `supabase/functions/daily-semaforo-check/index.ts` (×2) | Cron diario |

Sin días de gracia configurados, cuatro devuelven `101` (⚫ intereses) y dos devuelven `0`
(🟢 saludable). **La misma unidad se ve verde al iniciar sesión y negra al recargar.**

Si tocas la fórmula, tócala en las siete o no la toques.

### 3. La IA es OpenAI, no Anthropic

`extract-document` llama a **`gpt-4o`**. La clave está guardada bajo un secreto llamado
`ANTHROPIC_API_KEY` — el nombre es engañoso. El `README.md` afirma que es Claude; es incorrecto.

### 4. `workspaces` tiene RLS desactivada en producción

Las políticas correctas existen pero están inertes. Se desactivó porque
`db.js → createWorkspace()` hace `.insert().select()`, y la política de lectura consultaba
`workspaces` a través de una función `STABLE` que no ve la fila recién insertada → 403.

**Ya hay arreglo probado** en `supabase/migrations/20260808204401_*.sql`, sin aplicar a producción.
Diagnóstico completo en [`docs/03-LECCIONES-DEL-MVP.md`](docs/03-LECCIONES-DEL-MVP.md).

### 5. `DEPLOY.md` está obsoleto de principio a fin

Describe un despliegue a GitHub Pages que ya no existe — esa URL responde **404**. Hoy es Vercel.

---

## Entorno local — úsalo, no toques producción

Está montado y funcionando. **El proyecto está desvinculado de producción** (`supabase unlink`).

```powershell
npx supabase start           # levanta Postgres, Auth, Storage, Studio, Mailpit
node tools\dev-server.mjs    # sirve la app en :3000
npx supabase db reset        # vuelve al estado limpio del seed
```

| Servicio | URL |
|---|---|
| App | `http://localhost:3000` |
| API | `http://127.0.0.1:54321` |
| Studio | `http://127.0.0.1:54323` |
| **Correos** | `http://127.0.0.1:54324` — aquí caen alertas e invitaciones |

Seis cuentas con contraseña `automind123`: `director@`, `gerente@`, `vendedor1@`, `vendedor2@`,
`owner@`, `super@` — todas `local.test`. Manual completo en
[`docs/05-ENTORNO-LOCAL.md`](docs/05-ENTORNO-LOCAL.md).

> **Por qué importa:** en producción, editar un vehículo **dispara correos y mensajes de Telegram
> reales**, y con solo entrar a la app se ejecutan escrituras en la base
> ([`app.jsx:524`](app.jsx#L524) reasigna vendedores en cada carga). Nada de "solo voy a mirar".

`tools/dev-server.mjs` intercepta `/config.js` en memoria y devuelve credenciales locales.
**No modifica el archivo**, que se despliega a Vercel con las de producción.

---

## Stack y arquitectura

**SPA sin build step.** No hay `npm`, ni bundler, ni `package.json`. Todo se carga por CDN y
Babel transpila los `.jsx` **en el navegador** en cada visita.

- React 18.3.1 (UMD, build de **desarrollo**) + `@babel/standalone`, vía `<script>` en `index.html`
- `@supabase/supabase-js@2` (UMD), SheetJS para Excel, pdf.js
- Sin `import`/`export`: cada archivo expone sus símbolos en `window`
  (`Object.assign(window, { App })`) y los demás los leen de ahí
- **El orden de los `<script>` en `index.html` es la única garantía de que algo funcione**
- Cache-busting manual por querystring (`crm.jsx?v=20260804b`), bumpeado a mano archivo por archivo
- `index.html` son 1 141 líneas, de las cuales **1 047 son un bloque `<style>` inline**

### Estado global en `window`

| Símbolo | Contenido |
|---|---|
| `window.DB` | Capa de datos (`db.js`) |
| `window.AUTOMIND` | `ROWS`, `USUARIOS`, `KPIS`, `PIVOTE`, `TABLAS`, `agencyId` (= workspace), `agencyParentId` (= agencia raíz) |
| `window.SUPABASE_URL` · `window.SUPABASE_ANON` | De `config.js` |

> **Dos pipelines de arranque distintos.** `LoginScreen` ([`login.jsx:290-390`](login.jsx#L290))
> construye `window.AUTOMIND` por su cuenta, saltándose `enriquecerRows` + `buildAUTOMIND` de
> `app.jsx`. Es la causa de que la unidad cambie de color entre login y recarga.

---

## Archivos

### Vivos — cargados en `index.html`, en este orden

| Archivo | Rol |
|---|---|
| `config.js` | Credenciales Supabase (la anon key es pública por diseño) |
| `db.js` | **Capa de datos** — `window.DB`: auth, multi-tenant, CRUD, disparo de alertas |
| `login.jsx` | `LoginScreen`, `SetPasswordScreen`, `computarKpis`, `computarPivote`, `buildTablas` |
| `tweaks-panel.jsx` | Panel de personalización visual |
| `components.jsx` | `SEM` (semáforo), `I` (iconos), `Sidebar`, `TopBar`, `fmtMoney`, `fmtPct` |
| `charts.jsx` | `AgingHistogram`, `Donut` |
| `dashboard.jsx` | Vista Dashboard — KPIs, tabla semáforo, filtros cruzados |
| `database.jsx` | Vista genérica de tablas ("Ver datos", oculta a vendedores) |
| `import.jsx` | Importación desde Excel |
| `colaboradores.jsx` | Equipo, organigrama, invitaciones |
| `inventario-editor.jsx` | Editor de vehículos con desglose de fórmulas |
| `usuarios.jsx` | ☠️ **Stub de 4 líneas que devuelve `null`** — se sigue cargando |
| `workspace-selector.jsx` | Selector para agency owners |
| `alertas.jsx` | Alertas: reglas · Telegram · WhatsApp · plantillas |
| `ventas.jsx` | Dashboard de ventas (`ProcesoVenta` aquí dentro está muerto) |
| `crm.jsx` | **6 157 líneas** — pipeline de venta. `ClienteEditor` es **un componente de ~2 490** |
| `super-admin.jsx` | Panel global de agencias + auditoría |
| `app.jsx` | Raíz, ruteo, `VehicleDrawer`, `enriquecerRows` (**semáforo canónico**) |

### Edge Functions — las 9 reales, en `supabase/functions/`

`send-alert` · `daily-semaforo-check` · `invite-user` · `delete-user` · `extract-document` ·
`send-telegram` · `telegram-link` · `telegram-webhook` · `verify-contact`

```bash
npx supabase functions deploy <nombre> --project-ref wjdntftoyqkkycaozlhn
```

### Muertos

`financieras.jsx` (392 líneas, excluido de `index.html`) · los 7 `.ts` de la raíz ·
los 69 `.sql` de la raíz (superados por `supabase/migrations/`) · la vista `config` en `app.jsx`
(sin entrada de menú). Plan de borrado con riesgos en [`docs/06-LIMPIEZA.md`](docs/06-LIMPIEZA.md).

---

## Lógica de negocio: el semáforo

Se calcula **en lectura**, nunca se almacena — salvo `semaforo_snapshot`, que existe solo para
detectar cambios de estado y disparar alertas.

```
diasEnPiso  = max(0, round((hoy − fechaFactura) / 1 día) − 1)
graciaTotal = diasGraciaBase + diasGraciaExtra
pctPlan     = round(diasEnPiso / graciaTotal × 100)
```

| Estado | % plan | Nota |
|---|---|---|
| `saludable` 🟢 | ≤ 61 | |
| `rotacion` 🟡 | > 61 | |
| `comprometido` 🟠 | > 76 | |
| `vencer` 🔴 | > 86 | **100 % exacto cae aquí**, no en intereses |
| `intereses` ⚫ | > 100 | Ya cuesta dinero |

Los umbrales son **exclusivos** (`>`). Sin días de gracia configurados: ver trampa #2.

**Especificación completa con 21 vectores de prueba** en
[`docs/01-DOMINIO.md`](docs/01-DOMINIO.md) — listos para convertirse en test suite.

### Reglas que parecen bugs y son deliberadas

- **El vendedor no ve el estado ⚫**: se le muestra como 🔴 ([`app.jsx:29`](app.jsx#L29)). Tampoco
  ve monto financiado, tasa ni interés acumulado. Es diseño: el costo financiero es información
  de la agencia. ⚠️ Pero es **solo ocultamiento visual** — los datos sí llegan a su navegador.
- **El director no se autoasigna unidades** ([`app.jsx:186`](app.jsx#L186)).
- **Quien captura un pago no lo valida**: solo gerente o director. Es un control interno real.

### Alertas

Se disparan **solo al cambiar de estado**, comparando contra `semaforo_snapshot`. Dos orígenes:
al guardar un vehículo, y el **cron diario** — que es el que importa, porque la mayoría de los
cambios los causa el calendario, no una edición. La importación masiva los suprime (`skipAlert`).

---

## Modelo de datos

```
agencies (tenant raíz)
  └── workspaces (sucursal)
        ├── users        (director | gerente | vendedor, jerarquía vía reporta_ids)
        ├── inventario   (vehículos)
        ├── clientes     (pipeline CRM, ~90 columnas)
        ├── alert_rules  (por semáforo y canal)
        └── alert_log    (bitácora de envíos)
```

- **Cuatro tipos de identidad**: `super_admin`, `agency` (owner), `workspace` (usuario normal),
  más objetos sintéticos. Ver `db.js → getUserContext`.
- **Legacy**: convive `workspace_id` con `agency_id`. `db.js` consulta con
  `.or(workspace_id.eq.X, agency_id.eq.X)`. **Preservar esos fallbacks.**
- ⚠️ **Desajuste de tipos**: `users.id` es `text`, pero `users.reporta_ids` e
  `inventario.vendedor_ids` son `uuid[]`. Funciona solo porque la app genera ids con forma de UUID.
- **En producción hay 4 agencias con exactamente 1 workspace cada una**: la jerarquía de dos
  niveles nunca se ejercitó.

### El esquema vive en migraciones

`supabase/migrations/20260808193827_remote_schema.sql` es la **línea base**: el esquema real de
producción, extraído con `db pull`. Los 69 `.sql` de la raíz están superados.

⚠️ La línea base **no capturó el storage ni el cron** (`db pull` solo extrae `public`). Esa
información sigue viviendo en `supabase_cron_setup.sql`, `supabase_crm_setup_completo.sql` y
`supabase_e8_expediente.sql` — no los borres sin convertirlos.

---

## Design Context

Sistema de diseño documentado, generado con la skill **impeccable**. **Es un activo real y
portable a v2** — léelo antes de tocar UI.

- [PRODUCT.md](PRODUCT.md) — usuarios, propósito, personalidad de marca, anti-referencias,
  principios de diseño.
- [DESIGN.md](DESIGN.md) — paleta (Azul Acción `#2f6fed` + semáforo de 5 estados), tipografía
  (Segoe UI Variable + mono Cascadia), elevación plana, componentes, do's/don'ts.
  Tokens machine-readable en `.impeccable/design.json`.

North Star: **"La Mesa de Control"**. Regla rectora: el color saturado solo aparece cuando
*significa* algo (semáforo = riesgo, azul = acción); superficies planas en reposo. Anti-referencia
principal: el "SaaS genérico AI slop".

---

## Convenciones

- **Español en todo**: UI, comentarios, nombres de dominio (`vendedor`, `semaforo`, `diasEnPiso`).
- **Mapeo de nombres**: la BD usa `snake_case` y la app `camelCase`. Los mapeos viven en `db.js`
  (`dbRowFromVehicle`, `vehicleFromDbRow`, `colaboradorFromDbRow`, `clienteFromDbRow`).
  Al añadir un campo hay que tocar **ambos** lados.
- **Marcadores de edición**: `app.jsx` tiene `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/`
  (`TWEAK_DEFAULTS`) que usa un editor externo. No romperlos.
- **Cache-busting**: si editas un `.jsx`, sube el `?v=` de esa línea en `index.html` o el cambio
  no se ve en producción.
- **Nada de secretos en el repo.** La anon key es pública por diseño; la `service_role` solo vive
  como variable de entorno en las Edge Functions. Esto se ha respetado en 324 commits — mantenlo.

## Despliegue

Push a `main` → Vercel despliega solo (~1 min). Los `.ts` se despliegan aparte como Edge
Functions. **No hay build step, así que no hay validación previa**: un error de sintaxis se
descubre en producción.

> Si una vista "no muestra cambios", casi siempre es caché del navegador o un `?v=` sin subir.

## Calidad

Sin pruebas, sin CI, sin linter. 324 commits, 0 pull requests. **Los cálculos financieros no
tienen ninguna verificación automática.** Si tocas una fórmula, verifícala a mano contra los
vectores de [`docs/01-DOMINIO.md`](docs/01-DOMINIO.md).
