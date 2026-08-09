# 05 · Entorno local — operación y próximos pasos

> Manual del entorno de desarrollo montado sobre la rama `develop`, y registro de lo que
> quedó pendiente. Todo corre en tu máquina; **el proyecto está desvinculado de producción**.

---

## Qué hay montado

| Servicio | Dónde | Para qué |
|---|---|---|
| **App** | `http://localhost:3000` | El MVP, servido por `tools/dev-server.mjs` |
| **API Supabase** | `http://127.0.0.1:54321` | REST, Auth, Storage, Edge Functions |
| **PostgreSQL** | `127.0.0.1:54322` | Usuario `postgres`, contraseña `postgres` |
| **Studio** | `http://127.0.0.1:54323` | Explorar y editar la base |
| **Correos** | `http://127.0.0.1:54324` | **Buzón local** — aquí caen alertas e invitaciones |

### Cuentas

Contraseña de todas: `automind123`

| Cuenta | Rol | Qué te deja probar |
|---|---|---|
| `director@local.test` | director | Ve todo. No puede autoasignarse unidades |
| `gerente@local.test` | gerente | Ve todo, valida pagos |
| `vendedor1@local.test` | vendedor | Solo sus unidades, sin cifras financieras, sin ⚫ |
| `vendedor2@local.test` | vendedor | Segundo vendedor, para multi-asignación |
| `owner@local.test` | agency owner | Dispara el selector de workspaces |
| `super@local.test` | super admin | Panel global de agencias |

---

## Operación diaria

```powershell
npx supabase status          # qué está corriendo
npx supabase start           # levantar
npx supabase stop            # apagar (los datos persisten)
npx supabase db reset        # volver al estado limpio del seed
node tools\dev-server.mjs    # servir el frontend en :3000
```

`db reset` es el botón de pánico: rompe lo que quieras en la app y vuelves al punto de partida
en segundos. Reaplica las migraciones y el seed desde cero.

> **Si `node` no se reconoce**, es el `PATH` heredado por una terminal vieja. Cierra VS Code
> por completo —no basta «Reload Window»— y vuelve a abrir.

---

## Seguridad: qué toca producción

El proyecto **está desvinculado** (`supabase unlink`), así que hoy nada puede alcanzar la base
real. Se documenta la tabla porque el riesgo vuelve en cuanto se re-vincule.

| Comando | Alcance |
|---|---|
| `supabase db reset` | 🟢 Solo local |
| `supabase start` · `stop` · `status` | 🟢 Solo local |
| `supabase db pull` | 🟡 **Lee** producción, y escribe una fila en su tabla de historial de migraciones |
| `supabase db push` | 🔴 **Escribe el esquema en producción** |
| `supabase link` | 🟡 Restablece el vínculo — a partir de ahí `push` vuelve a tener destino |

**`config.js` no se toca.** El servidor de desarrollo intercepta la petición de `/config.js` y
devuelve credenciales locales en memoria; el archivo que se despliega a Vercel queda idéntico
byte por byte. Verificado con `git diff`.

---

## Qué probar

El inventario del seed está construido para exponer comportamientos concretos, no para rellenar.

| Unidad | Qué demuestra |
|---|---|
| **`V-LOCAL-007`** Nivus | **El bug del semáforo.** Sin días de gracia: ⚫ en el tablero, 🟢 en el editor. Cierra sesión y vuelve a entrar — cambia de color |
| **`V-LOCAL-006`** Groove | Exactamente **100 %** del plan. Debe verse 🔴, no ⚫ — el umbral es `> 100`, no `>= 100` |
| **`V-LOCAL-008`** Captiva | Justo en **76 %**, el borde entre `rotacion` y `comprometido`. Además va marcada como dañada |
| **`V-LOCAL-010`** Tracker | Sin vendedor. Al entrar, el auto-sanado de [app.jsx:524](../app.jsx#L524) le asigna todos los vendedores **y escribe en la base**. Míralo en Studio antes y después |
| **`V-LOCAL-009`** T-Cross | Vendida este mes — aparece en «vendidos del mes» y sale del plan piso |

**Ejercicios que en producción serían peligrosos y aquí no:**

- Edita una fecha de factura para cruzar un umbral. La alerta se dispara de verdad y aparece
  en el buzón del `54324`, sin molestar a nadie.
- Entra como `vendedor1` y compara con `gerente`. Verás qué se le oculta al vendedor — y en las
  herramientas de desarrollador, que **los datos sí llegaron** a su navegador.
- Importa un Excel con encabezados raros y comprueba la auto-detección de columnas.
- Borra unidades en masa, crea workspaces, invita usuarios. Todo es reversible con `db reset`.

---

## Próximos pasos

### Pendiente de decisión — no está en scope hoy

**Las dos migraciones de arreglo están probadas y esperando.**

```
supabase/migrations/20260808204401_fix_rls_workspaces.sql
supabase/migrations/20260808204404_fix_hallazgos_advisor.sql
```

Cierran la fuga de `workspaces` sin RLS y la bitácora de alertas falsificable. Verificadas sobre
una base reconstruida desde cero: 8 de 8 pruebas de aislamiento y escritura. Aplicarlas requiere
volver a vincular el proyecto y hacer `db push`.

Cuando eso entre en el scope de alguien —tuyo o de quien mantenga el MVP— ya están listas **con
el diagnóstico documentado**, que era la parte cara. Ver
[03 · Lecciones](03-LECCIONES-DEL-MVP.md#por-qué-se-desactivó--reproducido-y-resuelto).

### Antes de commitear

`supabase/.temp/` está en el `.gitignore` nuevo, pero **ya venía trackeado**, así que git lo
sigue siguiendo:

```powershell
git rm -r --cached supabase/.temp
```

### Agrupación sugerida de commits

Tres commits con propósitos distintos, para que cada uno se pueda revisar o revertir solo:

| Commit | Contenido |
|---|---|
| **docs** | `docs/` — el análisis del MVP y la especificación para v2 |
| **entorno local** | `supabase/config.toml`, `supabase/seed.sql`, `supabase/migrations/…remote_schema.sql`, `tools/`, `.gitignore`, `.nvmrc` |
| **arreglos de seguridad** | Las dos migraciones de fix, más el `supabase_fix_rls_workspaces.sql` obsoleto |

El tercero aparte a propósito: son las únicas piezas que algún día tendrán que llegar a
producción, y tenerlas aisladas hace que esa decisión se tome deliberadamente en vez de
arrastrada por otro commit.

### Para la sesión técnica

Dos huecos que el entorno local **no** resuelve, porque son preguntas del panel de Supabase o de
la conversación con el autor original:

- **Respaldos** — ¿hay PITR activo en producción?
- **Monitoreo** — no existe; hoy solo hay `console.log`
- **`RESEND_API_KEY`** — secreto configurado que ninguna función lee. ¿Hubo un problema de
  entregabilidad con Brevo? La respuesta afecta a la elección de proveedor de correo en v2
- **El valor de `SITE_URL`** — existe, pero si apunta a la URL vieja de GitHub Pages los enlaces
  de las alertas siguen rotos

---

## Archivos que se crearon

| Archivo | Qué es |
|---|---|
| `supabase/migrations/20260808193827_remote_schema.sql` | **La línea base.** 52 KB del esquema real de producción, defecto de RLS incluido. Lo que el proyecto nunca tuvo |
| `supabase/migrations/20260808204401_fix_rls_workspaces.sql` | Reactiva RLS y corrige la causa raíz |
| `supabase/migrations/20260808204404_fix_hallazgos_advisor.sql` | Cierra `alert_log` y fija `search_path` |
| [`supabase/seed.sql`](../supabase/seed.sql) | Datos reproducibles. Lleva comentados dos tropiezos de GoTrue que costaron dos intentos |
| [`tools/dev-server.mjs`](../tools/dev-server.mjs) | Servidor sin dependencias que sustituye `config.js` sin tocarlo |
| `supabase/config.toml` | Configuración del CLI. `major_version = 17`, alineado con producción |
| `.gitignore` · `.nvmrc` | El repositorio no tenía ninguno de los dos |
| `supabase_fix_rls_workspaces.sql` | Obsoleto — queda como puntero a las migraciones |

**Toolchain:** Node v24.19.0 (vía nvm-windows) · npm 11.17.0 · Supabase CLI 2.113.0 ·
Docker 29.6.2 sobre WSL2.
