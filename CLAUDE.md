# Automind · Plan Piso — Contexto del proyecto

App web de **gestión de inventario en piso ("plan piso")** para agencias automotrices.
Su función central es un **semáforo** que indica, por cada vehículo, cuánto plan de
gracia le queda antes de empezar a generar intereses de financiamiento, y notifica por
correo a vendedor/gerente/director cuando una unidad cambia de estado.

- **Repo remoto:** https://github.com/automatizacionia-stack/automind-planpiso (`origin/main`)
- **Hosting:** Vercel — https://automind-planpiso.vercel.app/ (deploy automático desde `main`)
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **Idioma del producto y del código:** español (mantenerlo así).

## Design Context

El sistema de diseño está documentado para mantener cualquier trabajo de UI on-brand
(skill **impeccable** + **emil-design-eng**):

- [PRODUCT.md](PRODUCT.md) — estratégico: register (`product`), usuarios, propósito,
  personalidad de marca, anti-referencias y principios de diseño.
- [DESIGN.md](DESIGN.md) — visual: paleta (Azul Acción + semáforo de 5 estados), tipografía
  (Segoe UI Variable + mono Cascadia), elevación plana, componentes y do's/don'ts.
  Tokens machine-readable en `.impeccable/design.json`.

North Star: **"La Mesa de Control"**. Regla rectora: el color saturado solo aparece cuando
*significa* algo (semáforo = riesgo, azul = acción); superficies planas en reposo. Anti-ref
principal: evitar el "SaaS genérico AI slop". Lee ambos archivos antes de tocar UI.

## Stack y arquitectura

Es una **SPA sin build step**. No hay npm, bundler ni transpilación local: todo se carga
por CDN y Babel transpila los `.jsx` **en el navegador** en tiempo de ejecución.

- React 18.3.1 (UMD) + ReactDOM + `@babel/standalone` — vía `<script>` CDN en `index.html`.
- `@supabase/supabase-js@2` (UMD) y SheetJS (`xlsx`) para importar/exportar Excel.
- Los `.jsx` se cargan con `<script type="text/babel" src="...">` en `index.html`.
  **El orden de carga importa** porque no hay módulos: cada archivo expone sus símbolos
  en `window` (ej. `Object.assign(window, { App })`) y los demás los leen desde ahí.
- Punto de entrada: `ReactDOM.createRoot(...).render(<App />)` al final de `index.html`.

### Convención clave: todo vive en `window`
No hay `import`/`export`. Para usar una función de otro archivo se accede vía `window.X`
o por el símbolo global ya cargado. Estado compartido en tiempo de ejecución:
- `window.DB` — capa de datos (definida en `db.js`).
- `window.AUTOMIND` — datos del workspace activo en memoria: `ROWS`, `USUARIOS`, `KPIS`,
  `PIVOTE`, `TABLAS`, `agencyId` (= workspace), `agencyParentId` (= agencia raíz).
- `config.js` — expone `window.SUPABASE_URL` y `window.SUPABASE_ANON`.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Shell, estilos, carga de scripts, handler global de errores, render raíz |
| `config.js` | Credenciales Supabase (URL + anon key) |
| `db.js` | **Capa de datos** — `window.DB`: auth, multi-tenant, CRUD inventario/usuarios, disparo de alertas |
| `app.jsx` | Componente raíz `App`, ruteo de vistas, `VehicleDrawer`, enriquecimiento de filas/usuarios |
| `login.jsx` | `LoginScreen`, `SetPasswordScreen`, y `computarKpis`/`computarPivote`/`buildTablas` |
| `components.jsx` | Helpers visuales: `SEM` (semáforo), `I` (iconos), `Sidebar`, `TopBar`, `fmtMoney`, `fmtPct` |
| `dashboard.jsx` | Vista Dashboard (tarjetas KPI + semáforo) |
| `database.jsx` | Vista de tablas (Datos) |
| `inventario-editor.jsx` | Editor de vehículos |
| `import.jsx` | Importación de inventario desde Excel |
| `colaboradores.jsx` | Gestión de equipo (vendedor/gerente/director) |
| `usuarios.jsx` | Registro/invitación de usuarios |
| `alertas.jsx` | Configuración de reglas de alerta por semáforo |
| `workspace-selector.jsx` | Selector de workspaces para agency owners (multi-tenant) |
| `charts.jsx`, `tweaks-panel.jsx`, `financieras.jsx` | Gráficas, panel de personalización, módulo financieras |
| `invite-user.ts` | **Edge Function** — crea link de invitación y lo envía vía Brevo |
| `send-alert.ts` | **Edge Function** — envía email cuando un vehículo cambia de semáforo |
| `supabase_schema.sql` | Esquema base: `agencies`, `users`, `inventario`, RLS, seed demo |
| `supabase_multitenant.sql` | Capa multi-tenant: `workspaces`, `agency_memberships`, `workspace_memberships` |
| `supabase_alerts.sql` | Tabla `alert_rules` |
| `supabase_*_v2/v3/fixes.sql`, `supabase_drop_financiera.sql` | Migraciones incrementales |
| `DEPLOY.md` | Guía paso a paso de despliegue (Supabase + GitHub Pages) |

## Modelo de datos (Supabase)

Jerarquía multi-tenant: **agency → workspaces → users + inventario**.

- `agencies` — tenant raíz (ej. Coperva). Dueños = `agency_memberships`.
- `workspaces` — subcuentas dentro de una agencia (cada agencia/sucursal opera aquí).
- `users` — colaboradores con `rol` ∈ `director | gerente | vendedor`, jerarquía vía
  `reporta_a` (self-FK). `auth_user_id` vincula con Supabase Auth. Llave de negocio:
  `UNIQUE(email, workspace_id)`.
- `inventario` — vehículos. Pertenecen a un `workspace_id` (con `agency_id` como raíz).
- `alert_rules` — por workspace y semáforo, define a quién notificar.

**Multi-tenancy / RLS:** cada usuario solo ve datos de su agencia/workspace vía Row Level
Security. Hay datos legacy que usan `agency_id` donde lo nuevo usa `workspace_id`; por eso
`db.js` consulta con `.or(workspace_id.eq.X, agency_id.eq.X)` y hace fallbacks.

**Dos tipos de usuario** (ver `db.js → getUserContext`):
- `type: "agency"` (agency owner): ve el `WorkspaceSelector` y puede entrar a cualquier workspace.
- `type: "workspace"` (usuario normal): entra directo a su workspace.

## Lógica de negocio: el semáforo

Se calcula en `app.jsx → enriquecerRows()` a partir del **% de plan consumido**
(`diasEnPiso / diasGraciaTotal`). Estados (`SEM` en `components.jsx`):

| Estado | Umbral % plan | Significado |
|---|---|---|
| `saludable` 🟢 | ≤ 61% | Dentro del plan de gracia |
| `rotacion` 🟡 | > 61% | Rotación media |
| `comprometido` 🟠 | > 76% | Margen comprometido |
| `vencer` 🔴 | > 86% | Próximo a vencer |
| `intereses` ⚫ | > 100% | Ya genera intereses — acción inmediata |

Sin días de gracia configurados, una unidad con días en piso pasa directo a `intereses` (101%).

**Disparo de alertas:** `db.js → saveVehicle()` compara el `semaforo_snapshot` previo con el
nuevo; si cambió, llama (sin bloquear el guardado) a la Edge Function `send-alert`, que
consulta `alert_rules` del workspace y envía los correos vía Brevo.

## Convenciones

- **Idioma:** todo en español — UI, comentarios, nombres de variables de dominio (`vendedor`,
  `semaforo`, `diasEnPiso`). Mantener.
- **Mapeo de nombres:** la BD usa `snake_case` (`reporta_a`, `monto_financiado`) y la app
  `camelCase` (`reportaA`, `montoFinanciado`). Los mapeos viven en `db.js`
  (`dbRowFromVehicle`, `vehicleFromDbRow`, `colaboradorFromDbRow`) y en `app.jsx`. Al añadir
  campos hay que actualizar **ambos** lados.
- **Compatibilidad legacy:** preservar los fallbacks `workspace_id || agency_id`.
- **Edición visual:** `app.jsx` tiene marcadores `/*EDITMODE-BEGIN*/ ... /*EDITMODE-END*/`
  (TWEAK_DEFAULTS) que parecen usarse por un editor externo — no romper esos comentarios.

## Despliegue

Para publicar cambios: hacer commit/push a `main` → Vercel hace el deploy automáticamente
(~1 min). Los `.sql` se corren a mano en el SQL Editor de Supabase; los `.ts` se
despliegan como Edge Functions. Detalle completo en `DEPLOY.md`.

> Si una vista "no muestra cambios" en producción, casi siempre es cache del navegador
> (probar incógnito / Ctrl+Shift+R).

## Estado actual / notas

- Commit más reciente: "Quitar financiera" — se eliminó la columna `financiera` de
  `inventario` (`supabase_drop_financiera.sql`, 2026-06-17). `financieras.jsx` sigue
  cargándose en `index.html`; revisar si ese módulo aún aplica antes de tocarlo.
- Vistas marcadas como "en construcción" / placeholder: Proceso de Venta, Configuración del
  workspace.
- `config.js` contiene credenciales reales (URL + anon key, que es pública por diseño en
  Supabase). **No** poner nunca la `service_role` key en el cliente — esa solo vive en las
  Edge Functions como variable de entorno.
