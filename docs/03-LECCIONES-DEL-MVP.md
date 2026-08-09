# 03 · Lecciones del MVP

> **Propósito.** Este no es un plan de arreglos: el código se va a reemplazar. Es el registro
> de **qué falló, por qué falló, y qué requisito genera para v2** — para no reproducir los
> mismos fallos con mejor sintaxis.
>
> **Sobre el tono.** El MVP lo construyó alguien sin perfil de desarrollador, y hay que
> juzgarlo por lo que era: un vehículo para descubrir si el producto tenía sentido. En eso
> **funcionó** — hay un producto identificable, con reglas de negocio validadas y cuatro
> agencias configuradas. Los hallazgos de abajo son sobre el código, no sobre la persona, y
> varios son consecuencia predecible de las restricciones bajo las que se trabajó.

---

## TL;DR ejecutivo

El MVP cumplió su función: demostró el producto. Pero acumuló cinco fallos estructurales que
comparten una misma raíz — **no existía ningún mecanismo para saber si algo estaba mal**. Sin
pruebas, sin revisión de código, sin entornos separados y sin control de versiones sobre la
base de datos, cada error solo se descubría cuando alguien lo veía en pantalla.

Las cinco lecciones, en orden de importancia:

1. **La regla de negocio central está escrita 7 veces y ya no coinciden entre sí.** La misma
   unidad se ve verde en una pantalla y negra en otra.
2. **El aislamiento entre clientes nunca fue verificable** — y de hecho falló: hoy se pueden
   leer datos sin autenticarse.
3. **El estado de la base de datos no es reproducible.** Producción ya no coincide con ningún
   archivo del repositorio, y no hay forma de saber cuándo dejó de coincidir.
4. **Cero pruebas sobre cálculos que producen dinero.**
5. **La documentación contradice al código** en puntos que cuestan dinero o rompen funciones.

Y una lista igual de importante de **qué se hizo bien** (§7), porque marca el listón que v2
no debería bajar.

**Sin clientes activos, nada de esto es un incidente.** Son insumos de diseño.

---

## Lección 1 — La regla de negocio duplicada

### Qué pasó

El semáforo —la única razón por la que existe el producto— está implementado **siete veces**
de forma independiente:

| # | Ubicación | Contexto |
|---|---|---|
| 1 | [app.jsx:267-303](../app.jsx#L267) | Motor canónico, al cargar la aplicación |
| 2 | [db.js:275-291](../db.js#L275) | Al guardar, para detectar cambio de estado |
| 3 | [import.jsx:171-186](../import.jsx#L171) | Al importar desde Excel |
| 4 | [inventario-editor.jsx:17-42](../inventario-editor.jsx#L17) | Al editar en el formulario |
| 5 | [login.jsx:290-324](../login.jsx#L290) | Al iniciar sesión |
| 6 | `daily-semaforo-check/index.ts:55-70` | Cron diario |
| 7 | `daily-semaforo-check/index.ts:352` | Segundo cálculo dentro del mismo cron |

**Y divergieron.** Cuatro devuelven `101` cuando no hay días de gracia configurados (⚫ en
intereses); dos devuelven `0` (🟢 saludable).

### Por qué importa

El fallo es **observable por el usuario**:

- `LoginScreen` construye el estado global con su propio pipeline
  ([login.jsx:366-390](../login.jsx#L366)), saltándose por completo `enriquecerRows` y
  `buildAUTOMIND` de `app.jsx`. Consecuencia: **la misma unidad aparece 🟢 al iniciar sesión y
  ⚫ al recargar la página.**
- El editor usa la otra variante: muestra 🟢 mientras el tablero muestra ⚫ para el mismo auto.

Para un producto cuya promesa literal es *"ninguna unidad genera intereses en silencio"*, esto
no es un defecto cosmético: **es el incumplimiento de la promesa**.

### Por qué ocurrió

Cada vez que hizo falta el semáforo en un contexto nuevo, se copió el bloque de código. Sin
módulos —el proyecto no tiene `import`/`export`, todo se comunica por `window`— compartir una
función entre navegador y servidor era genuinamente difícil. La duplicación fue el camino de
menor resistencia, y sin pruebas nada avisó cuando las copias se separaron.

### ➡️ Requisito para v2

> **El cálculo del semáforo vive en un único módulo compartido por interfaz, servidor y
> trabajos programados.** Ninguna otra parte del sistema reimplementa el umbral.
>
> Debe existir un conjunto de pruebas que se ejecute en cada despliegue con, como mínimo, los
> vectores del [reporte 01 §3.3](01-DOMINIO.md#33-vectores-de-prueba).
>
> Esto **condiciona la elección de stack**: se necesita poder compartir código de dominio
> entre cliente y servidor sin duplicarlo. Ver [reporte 04](04-REQUISITOS-V2.md).

---

## Lección 2 — El aislamiento entre clientes no era verificable

### Qué pasó

Con solo la clave pública anónima, **sin autenticarse**, se leen los cuatro workspaces reales:

```
VW TEXCOCO · Chevrolet Interlomas · Volkswagen Insurgentes Sur · CHEVY SAN CARLOS
```

Con su marca, ciudad, colores y claves de sus avisos de privacidad. Verificado por sondeo
directo el día de este análisis.

Los campos `wa_director_tel` y `wa_gerente_tel` están vacíos hoy — pero **viven en la misma
fila**. En cuanto se configure WhatsApp, esa fuga incluirá teléfonos personales de directivos.

### El detalle que importa más que la fuga

**No es una política mal escrita: es que ninguna política se está aplicando.**

Confirmado en el panel de Supabase (agosto 2026): **`workspaces` tiene Row Level Security
desactivada**, y el propio panel muestra la advertencia. Las políticas correctas existen en el
repositorio y aparecen en `pg_policies` — pero sin RLS activa Postgres no las evalúa. Lo único
que gobierna entonces son los `GRANT` de tabla, y Supabase concede por defecto todos los
privilegios a los roles `anon` y `authenticated` sobre el esquema `public`.

```sql
-- Existe en el repositorio. Existe en la base. No se aplica.
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (id = ANY(SELECT my_workspace_ids()) OR is_super_admin());
```

**Consecuencia que agrava el hallazgo:** con RLS desactivada y los grants por defecto, la
exposición probablemente no se limita a lectura — `INSERT`, `UPDATE` y `DELETE` anónimos sobre
`workspaces` son plausibles. No se verificó, porque comprobarlo exige una escritura real contra
producción. Dado que `workspaces` es la raíz de la jerarquía y los borrados están en cascada
(`supabase_cascade_workspace_fks.sql`), el peor caso teórico es la pérdida de todos los datos
dependientes.

Arreglo inmediato en [`supabase_fix_rls_workspaces.sql`](../supabase_fix_rls_workspaces.sql):
una línea, `ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY`, más el diagnóstico para
comprobar si hay otras tablas en la misma situación.

### Por qué se desactivó — reproducido y resuelto

La pregunta relevante nunca fue cómo se arregla, sino **qué se rompía**. Desactivar RLS en la
tabla raíz del multi-tenant es un acto deliberado, y más aún existiendo `rls_auto_enable()`: si
toda tabla nace protegida, apagarla fue una decisión, no un olvido. Alguien lo hizo para
desbloquear algo.

**El punto de partida de la investigación** fue una observación de la demo del producto: que los
super admin tienen acceso a todos los workspaces, y que ese acceso transversal podía ser la pista.
La intuición apuntaba al sitio correcto —la política de `workspaces`— aunque el actor resultó ser
otro.

**Descartado:** el super admin no era el problema. Con RLS activa lee los workspaces de todas las
agencias y crea agencias y workspaces sin fricción, porque las políticas cortan antes con
`OR is_super_admin()`. Verificado con las seis cuentas del seed y una segunda agencia ajena.

**El caso que sí rompía:** crear un workspace siendo *agency owner*.

```js
// db.js → createWorkspace()
client.from("workspaces").insert({...}).select().single()
//                                      ^^^^^^^^
```

Ese `.select()` se traduce en `Prefer: return=representation`, es decir `INSERT ... RETURNING`.
Postgres aplica la política de **SELECT** a la fila devuelta, y la política era:

```sql
USING ( id IN (SELECT my_workspace_ids()) OR is_super_admin() )
```

`my_workspace_ids()` **consulta `workspaces`** y está declarada `STABLE`, así que ve el snapshot
del inicio de la sentencia — donde la fila recién insertada todavía no existe. La política daba
falso para esa fila y el `RETURNING` fallaba con `42501`, **aunque el `WITH CHECK` del INSERT sí
pasaba**.

La prueba que lo aísla:

| Petición | Resultado |
|---|---|
| `INSERT` sin `return=representation` | ✅ 201 |
| `INSERT` con `return=representation` | ❌ 403 `new row violates row-level security policy` |

Desactivar RLS hacía desaparecer el síntoma. También la protección. Y explica por qué se apagó
en `workspaces` y en ninguna otra tabla: es la única cuya política de lectura se consultaba a
sí misma.

**El arreglo** está en
[`supabase/migrations/20260808204401_fix_rls_workspaces.sql`](../supabase/migrations/20260808204401_fix_rls_workspaces.sql):
reescribir `workspaces_select` para que **ninguna rama consulte `workspaces`**. Cada rama compara
columnas de la fila evaluada contra otras tablas, así que una fila nueva es evaluable dentro de
la misma sentencia. Verificado sobre una base reconstruida desde cero — 8 de 8 pruebas de
aislamiento y escritura.

> **La lección para v2 es más específica de lo que parecía.** No basta con «probar el
> aislamiento»: hay que **ejercitar también la escritura**. Una prueba que solo verificara
> lecturas habría dado verde con esta política rota, y el equipo se habría topado con el mismo
> 403 en producción. El requisito S1 debe incluir crear, actualizar y borrar bajo cada rol.

Producción divergió del repositorio por ese cambio manual, en una fecha imposible de datar.
**Nadie podía saberlo**, porque no había manera de comprobar el estado real contra el esperado.

### Lo que descartó el Security Advisor — y lo que encontró

Ejecutar el advisor del panel acotó el alcance y añadió tres hallazgos. **2 errores, 39
advertencias.**

**Descartado, y es la mejor noticia del análisis:** solo `workspaces` aparece como
`UNRESTRICTED`. `users`, `clientes`, `inventario` y el resto **sí tienen RLS activa**.
No hay exposición de datos personales. El peor escenario queda eliminado.

**Hallazgo nuevo — `alert_log` acepta INSERT de cualquier usuario autenticado.** El advisor
reporta *«RLS Policy Always True»*. Y aquí está el detalle que convierte esto en la mejor
ilustración posible de la [Lección 3](#lección-3--el-estado-de-la-base-de-datos-no-es-reproducible):
el arreglo **ya estaba escrito y commiteado** en `supabase_fixes_v3.sql:113-119`, con el
comentario correcto explicando el riesgo —

```sql
-- `with check (true)` permitía a cualquier usuario autenticado
-- insertar registros falsos en el historial de alertas.
create policy "alert_log_insert" on alert_log for insert with check (false);
```

— y nunca llegó a producción, o `supabase_superadmin_definitivo.sql` lo deshizo (su línea 296
comenta *«with check true ya existe»*, asumiendo el estado viejo). Alguien detectó el problema,
lo entendió, lo arregló, lo commiteó, y **el arreglo se perdió sin que nadie pudiera notarlo**.

Impacto: la bitácora de alertas —la tabla que este mismo reporte elogia como *evidencia de que
se notificó*— es falsificable por cualquier usuario autenticado.

**Hallazgo nuevo — 10 funciones `SECURITY DEFINER` con `search_path` mutable**, la mayoría
ejecutables sin autenticar. El riesgo teórico es escalada por shadowing: quien pueda crear
objetos en un esquema del `search_path` puede suplantar lo que `is_super_admin()` lee y forzar
un `true`, lo que sería un bypass total de RLS.

> **Calibración honesta: hoy no es explotable.** Supabase revoca `CREATE` sobre `public` a
> `anon` y `authenticated` por defecto. Es endurecimiento pendiente, no un incidente.
> `generate_telegram_token()` —la que suena más alarmante— **está bien construida**: no recibe
> parámetros, deriva la identidad de `auth.uid()` y sí fija `search_path`. La que merece
> atención es `route_telegram_link()`: es `SECURITY DEFINER`, no fijaba `search_path` y escribe
> en `users`.

El síntoma de fondo vuelve a ser el mismo de la Lección 1: **`my_workspace_ids()` está definida
tres veces** en `supabase_multitenant.sql`, `supabase_fix_save_rls.sql` y `supabase_fixes_v3.sql`,
las tres sin `search_path`. Cuál de las tres está viva en producción es, otra vez, indeterminable
desde el repositorio.

Los cinco bloques de corrección están en
[`supabase_fix_rls_workspaces.sql`](../supabase_fix_rls_workspaces.sql).

### El contraste: lo que sí se protegió bien

El almacén de documentos —INE, licencias, comprobantes de domicilio, RFC, estados de cuenta—
**está correctamente cerrado**. Verificado: un cliente anónimo no puede listar el contenido,
ni leer por ruta pública, ni firmar URLs. Se usa acceso por URL firmada con caducidad.

Es decir: la parte con PII regulada se protegió bien, y la que se filtró es comparativamente
inocua. Pero la diferencia entre ambas **fue suerte, no un control**: no había nada que
garantizara ninguna de las dos.

### ➡️ Requisitos para v2

> 1. **El aislamiento entre tenants se verifica con pruebas automatizadas** que corran en cada
>    despliegue: para cada tabla con datos de cliente, un usuario del tenant A no puede leer
>    ni escribir datos del tenant B, y un usuario anónimo no puede leer nada.
> 2. **El esquema y las políticas de acceso viven en migraciones versionadas.** Cambiar
>    permisos desde un panel web queda prohibido por proceso, y detectado por comprobación
>    automática de deriva.
> 3. **Las reglas de visibilidad se aplican en el servidor.** Hoy, que el vendedor no vea
>    montos ni el estado ⚫ es solo ocultamiento visual: los datos llegan completos a su
>    navegador.

---

## Lección 3 — El estado de la base de datos no es reproducible

### Qué pasó

**~90 archivos `.sql` sueltos en la raíz del repositorio.** No son migraciones: son el
historial de una conversación con la base de datos.

| Señal | Dato |
|---|---|
| `CREATE POLICY` en el repositorio | 98 |
| `DROP POLICY` en el repositorio | 111 |
| Archivos `superadmin_*` | 7 — intentos sucesivos del mismo problema |
| Archivos `diagnostico*` / `test_*` | 4 — depuración commiteada |
| Orden de aplicación | No registrado |
| Cuáles se corrieron en producción | **Desconocido** |

Los nombres cuentan la historia sin que haga falta abrirlos: `supabase_super_admin.sql` →
`supabase_superadmin_fullfix.sql` → `supabase_superadmin_rls_fix2.sql` →
`supabase_superadmin_definitivo.sql` (434 líneas, 51 políticas).

El `README.md` intenta dar un orden ("ejecuta estos cuatro, en este orden") pero deja los
~86 restantes como "aplicar según funcionalidades activas". No es documentación; es una
suposición.

### Por qué importa

Es la causa raíz de la Lección 2 y del hallazgo más incómodo de este análisis: **no se puede
saber qué hay en producción sin ir a mirar**. Y como no hay entorno de pruebas, mirar significa
consultar el sistema real.

### ➡️ Requisito para v2

> **Migraciones versionadas, secuenciales y aplicadas por automatización desde el primer día.**
> El esquema es código. Entornos separados (desarrollo / pruebas / producción) con el mismo
> esquema garantizado, y comprobación de deriva en el despliegue.

---

## Lección 4 — Cero pruebas sobre cálculos financieros

### Qué pasó

| Elemento | Estado |
|---|---|
| Pruebas unitarias | ❌ Ninguna |
| Pruebas de integración | ❌ Ninguna |
| Integración continua | ❌ No existe `.github/` |
| Linter / formateo | ❌ Nada |
| Revisión de código | ❌ 324 commits, 0 pull requests |
| Comprobación de tipos | ❌ JavaScript plano en el cliente |

El producto calcula **dinero** —interés diario, interés acumulado, monto financiado— y nada
comprueba que esos cálculos sean correctos.

Dos defectos concretos que una prueba habría atrapado:

1. **La divergencia del semáforo** (Lección 1). Un caso de prueba con `graciaTotal = 0` habría
   fallado en el momento en que se creó la segunda variante.
2. **El redondeo del interés.** `interesDiario` se redondea a centavos *antes* de multiplicarse
   por los días vencidos, de modo que el error se multiplica. Con 100 días vencidos, la
   desviación es de ~$0.08; con montos grandes y plazos largos, crece. Ver
   [reporte 01 §3.2, nota C](01-DOMINIO.md#32-algoritmo-canónico).

### Por qué ocurrió

Sin build step no hay dónde ejecutar pruebas: el proyecto no tiene `npm`, ni `package.json`,
ni proceso de compilación. Escribir una prueba habría requerido montar toda esa
infraestructura primero. **La ausencia de pruebas fue consecuencia de la decisión de
arquitectura, no una omisión aislada.**

### ➡️ Requisito para v2

> **La lógica de dominio se desarrolla con pruebas desde el primer día**, y los vectores del
> [reporte 01 §3.3](01-DOMINIO.md#33-vectores-de-prueba) son el punto de partida — ya están
> escritos.
>
> Los importes monetarios se manejan con **decimal de precisión fija, nunca punto flotante**,
> y se redondea solo al mostrar.

---

## Lección 5 — La documentación contradice al código

Cada punto verificado; cada uno tiene consecuencia práctica.

| Afirmación documentada | Realidad | Consecuencia |
|---|---|---|
| "IA: Anthropic Claude" (`README`) | **OpenAI `gpt-4o`**, con la clave bajo el secreto `ANTHROPIC_API_KEY` | Proveedor y costo equivocados en cualquier estimación |
| Secretos `META_WA_TOKEN` / `META_WA_PHONE_ID` | El código lee `META_WA_ACCESS_TOKEN` / `META_WA_PHONE_NUMBER_ID`. **Producción usa los nombres correctos** | El README no rompió nada hoy, pero **rompería cualquier montaje futuro** que lo siga al pie de la letra |
| Secreto `EXTRACT_API_KEY` | Ninguna función lo lee, y **no está configurado** | Ficción documental, sin efecto |
| — | `TWILIO_*` se usa y no está documentado… **ni configurado** | La verificación de teléfono corre degradada — ver reporte 02 §4 |
| — | **`RESEND_API_KEY` está configurado y ninguna función lo lee** | Secreto huérfano. Indica una migración de proveedor de correo empezada y no terminada |
| "Las funciones están en la raíz" (`CLAUDE.md`) | Se despliegan las de `supabase/functions/`; **las de la raíz divergen** | Se edita el archivo equivocado |
| "`financieras.jsx` sigue cargándose" | Excluido de `index.html` desde junio 2026 | Módulo fantasma |
| `DEPLOY.md`: despliegue a GitHub Pages | Hoy es Vercel; **la URL de GitHub Pages responde 404** | Guía inservible |
| URL de respaldo en los correos de alerta | Apunta a esa misma URL muerta, pero **`SITE_URL` sí está configurado** | El respaldo no se usa. Queda comprobar que su *valor* apunte a Vercel y no a la URL vieja |

> **Nota sobre el inventario de secretos** (revisado en el panel, agosto 2026). Están presentes
> `SERVICE_ROLE_KEY`, `SITE_URL`, `BREVO_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
> `ANTHROPIC_API_KEY`, `CRON_SECRET`, `META_WA_ACCESS_TOKEN`, `META_WA_PHONE_NUMBER_ID` y
> `RESEND_API_KEY`. Ausentes: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.

### ⏳ Una dependencia con fecha de caducidad

El panel marca el secreto por defecto **`SUPABASE_ANON_KEY` como `DEPRECATED`** — Supabase está
migrando al esquema de claves `PUBLISHABLE` / `SECRET`, que ya aparecen disponibles en el mismo
proyecto.

**Cinco de las nueve Edge Functions la leen** para construir el cliente que valida el JWT del
usuario:

```
delete-user · invite-user · send-alert · send-telegram · telegram-link
```

Todas hacen `Deno.env.get("SUPABASE_ANON_KEY")!` — con el `!` de TypeScript, que asume que existe.
El día que Supabase retire la clave, esas cinco funciones fallan al arrancar el cliente y se caen
las invitaciones, las alertas, el vínculo de Telegram y el borrado de usuarios. Sin aviso previo
en la aplicación.

> **Para v2 esto es un requisito, no una anécdota:** las dependencias con ciclo de vida del
> proveedor necesitan estar inventariadas y vigiladas. Es el mismo patrón que el hosting de
> GitHub Pages que quedó muerto en `DEPLOY.md` — infraestructura que cambia debajo sin que nadie
> lo note hasta que algo se rompe.

### El caso de las funciones duplicadas

Cinco Edge Functions existen dos veces: en la raíz (`send-alert.ts`, `invite-user.ts`,
`extract-document.ts`, `send-telegram.ts`, `delete-user.ts`) y en
`supabase/functions/<nombre>/index.ts`. **Solo se despliegan las segundas.**

Las de la raíz quedaron congeladas el 2026-07-27 y difieren en cientos de líneas. La copia
muerta de `extract-document` usa `gpt-4o-mini`; la viva usa `gpt-4o`. Y son las muertas las
que `CLAUDE.md` señala como fuente de verdad.

### ➡️ Requisito para v2

> **Una sola fuente de verdad por artefacto.** Lo que se despliega es lo que está en el
> repositorio, sin copias paralelas. La documentación que puede verificarse
> automáticamente —nombres de variables de entorno, rutas, versiones— debe verificarse
> automáticamente.

---

## Lección 6 — El costo real de "sin build step"

Fue una decisión **razonable en su contexto**: sin perfil técnico, sin `npm` ni compilación,
editar un archivo y verlo en el navegador es la única forma viable de avanzar. Permitió 324
commits en dos meses y medio. **Dejó de ser razonable ahora**, y conviene saber exactamente
qué costó:

| Consecuencia | Evidencia |
|---|---|
| **Sin lugar donde correr pruebas** | Causa raíz de la Lección 4 |
| **Sin módulos** → todo por `window` | Causa raíz de la Lección 1 |
| **El orden de los `<script>` es la arquitectura** | [index.html:1112-1130](../index.html#L1112) — 18 archivos en orden frágil |
| **Babel transpila en cada carga** | ~24 000 líneas de JSX compiladas en el navegador de cada usuario, en cada visita |
| **Cache-busting manual** | `crm.jsx?v=20260804b` — bumpeado a mano, archivo por archivo. `DEPLOY.md` lo llama "la razón #1 por la que subo cambios y no se ven" |
| **Sin comprobación previa a producción** | Un error de sintaxis se descubre en producción |
| **CSS monolítico** | 1 047 de las 1 141 líneas de `index.html` son un bloque `<style>` |
| **React en modo desarrollo en producción** | Se cargan `react.development.js` y `react-dom.development.js` — más lentos y con advertencias activas |

### ➡️ Requisito para v2

> Build step, tipado estático y módulos. No como preferencia estética: son las tres cosas que
> habrían evitado las lecciones 1 y 4.

---

## Lección 7 — Fronteras de confianza mal trazadas

Dos casos concretos donde el servidor confía en lo que le manda el cliente.

**1. Los destinatarios de las alertas los elige el navegador.** `send-alert` recibe las listas
de correos en el cuerpo de la petición y **explícitamente decide no revalidarlas** contra la
base de datos ([send-alert/index.ts:276-280](../supabase/functions/send-alert/index.ts#L276)):

> *"Deduplicar destinatarios — la seguridad ya está garantizada por el JWT + el check de
> autorización de workspace de arriba."*

No lo está. La comprobación verifica que **quien llama** pertenece al workspace; no verifica
que **los destinatarios** existan en él. Cualquier usuario autenticado puede hacer que el
sistema envíe correos con la marca de la agencia a direcciones arbitrarias.

**2. Las reglas de visibilidad son solo visuales.** Que el vendedor no vea montos financiados
ni el estado ⚫ se implementa ocultando elementos al pintar
([app.jsx:95-124](../app.jsx#L95)). Los datos ya están en su navegador.

### ➡️ Requisito para v2

> **El servidor no confía en ningún dato del cliente que tenga consecuencia** — destinatarios,
> identificadores de tenant, roles, montos. Los datos que un rol no debe ver **no se le envían**.

---

## Lección 8 — Detalles de oficio

Menores por separado, significativos en conjunto.

| Hallazgo | Dato | Efecto |
|---|---|---|
| Registro de depuración en producción | **64** `console.*` (20 `log`, 17 `warn`, 29 `error`) | La consola expone identificadores de tenant, correos y trazas de guardado |
| Diálogos nativos como interfaz | **44 `alert()`** y **4 `confirm()`** | Bloquean el navegador; no encajan con un producto premium |
| Reparación de datos en cada arranque | [app.jsx:524-551](../app.jsx#L524) | Cada inicio de sesión dispara escrituras masivas en segundo plano para "sanar" asignaciones |
| Recálculo en cada render | [app.jsx:777-779](../app.jsx#L777) | KPIs, pivote y tablas se recalculan enteros en cada repintado |
| Función de diagnóstico embebida | [db.js:1245](../db.js#L1245) | `testSuperAdminPerms()` **escribe y borra registros reales** para probar permisos |
| Importación sin control de rol | [import.jsx:436](../import.jsx#L436) | Un vendedor puede reemplazar el inventario de la agencia |
| Fecha crítica opcional | [import.jsx:16-17](../import.jsx#L16) | Falta la fecha de factura → **se inventa** (`llegada − 7 días`) |

---

## 9. Qué se hizo bien

No es cortesía: es el listón que v2 no debería bajar, y varias son decisiones que un equipo
con más experiencia habría podido equivocar.

**Seguridad**
- ✅ **Ni un solo secreto en el repositorio.** Verificado con búsqueda exhaustiva de patrones
  de claves. Con 324 commits y sin revisión de código, es notable.
- ✅ **`service_role` correctamente aislada** en las Edge Functions, nunca en el cliente.
- ✅ **Almacenamiento de PII cerrado**, con URLs firmadas de vida corta.
- ✅ **El cron se autentica** con un secreto propio, no con un JWT de usuario.
- ✅ **Bitácora de auditoría** para acciones de super admin.

**Producto**
- ✅ **El desglose de fórmulas visible al usuario.** Es un diferenciador real en software
  financiero: el usuario puede ver *por qué* un número es lo que es.
- ✅ **Ocultar el estado ⚫ al vendedor** — una decisión de producto sutil y correcta.
- ✅ **Segregación de funciones en el pago**: quien captura no valida.
- ✅ **Granularidad de las alertas**: por estado × por rol × por canal, con plantillas editables.
- ✅ **La importación de Excel es genuinamente robusta**: sinónimos de encabezado, detección de
  delimitador, validación real de fechas, deduplicación por VIN.

**Ingeniería**
- ✅ **`semaforo_snapshot`**: persistir solo el estado *notificado* y calcular el resto en
  lectura es la decisión correcta para un valor que depende del tiempo.
- ✅ **Los bloqueos de permisos se detectan y se explican.** Cuando una escritura devuelve cero
  filas, el sistema lo distingue de un error y da un mensaje accionable
  ([db.js:331-339](../db.js#L331)).
- ✅ **Borrado masivo por lotes** de 100, para evitar tiempos de espera.
- ✅ **Fechas ancladas a mediodía** para evitar corrimientos por huso horario y horario de verano.
- ✅ **Correcciones de fórmula deliberadas y documentadas en el código**: el cambio de `/360` a
  `/365` y de fecha de llegada a fecha de factura llevan comentario explicando el porqué.

**Diseño**
- ✅ `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` son documentación de producto de
  **calidad profesional**: usuarios, propósito, personalidad de marca, anti-referencias
  explícitas y principios de diseño. Mejor que la de muchos productos con equipo formal.
- ✅ La paleta del semáforo está pensada para no depender solo del color: cada estado lleva
  emoji y etiqueta.

---

## 10. Lo que no pude verificar

Declarado explícitamente para que no se lea como afirmación:

| Incógnita | Estado |
|---|---|
| ~~Si `workspaces` tiene RLS desactivada~~ | ✅ **Confirmado**: desactivada. Ver Lección 2. |
| ~~Si otras tablas están igual~~ | ✅ **Descartado**: solo `workspaces`. `users` y `clientes` tienen RLS activa — **sin exposición de PII**. |
| ~~Qué políticas están vivas~~ | ✅ Resuelto por el advisor: `alert_log` tiene INSERT permisivo. |
| ~~Qué secretos están configurados~~ | ✅ **Revisado en el panel.** Ver el inventario en §5. |
| ~~Si `SITE_URL` está configurado~~ | ✅ **Sí existe** — los correos no usan el respaldo muerto. |
| **El *valor* de `SITE_URL`** | ⬜ Falta. Que exista no basta: si lo pusieron con la URL vieja de GitHub Pages, los enlaces siguen rotos. Es una URL pública, no un secreto — se puede leer sin riesgo. |
| Si el cron diario está programado | ⬜ `SELECT * FROM cron.job;` — `CRON_SECRET` existe, así que la función *puede* autenticar; falta saber si alguien la llama. |
| Si la exposición de `workspaces` incluye escritura | ⬜ Comprobable sin riesgo con un `PATCH` filtrado a un UUID inexistente (0 filas afectadas). Deja de importar al reactivar RLS. |
| Volumen real de datos por tabla | ⬜ Consulta directa con credenciales de servicio |
| **Respaldos** — ¿hay PITR activo? | ⬜ Panel → Database → Backups |
| **Monitoreo** — no existe | ⬜ Confirmado por ausencia: solo `console.log` |

Lo que quedaba de seguridad se resolvió con el Security Advisor y el inventario de secretos.
De lo pendiente, solo dos cosas tienen consecuencia real: **el valor de `SITE_URL`** (determina si
las alertas llevan a algún sitio útil) y **si el cron está programado** (determina si las alertas
por paso del tiempo existen del todo). Las dos se responden en un minuto y ninguna requiere
tocar nada.

---

## Anexo · Metodología

- **Código:** lectura completa de `db.js` y `app.jsx`; pasajes verificados de los 18 `.jsx`
  restantes y las 9 Edge Functions; comparación de las copias duplicadas con `diff`.
- **Producción** (solo lectura, sin escrituras): sondeo de existencia de 17 tablas, estructura
  y conteo de `workspaces`, tres pruebas de exposición del bucket de documentos, y
  comprobación HTTP de las URLs de respaldo.
- **Historial git:** 324 commits, ritmo por mes, autoría, y fechas de última modificación de
  los archivos duplicados.
- **Conteos:** `grep` sobre el árbol completo, excluyendo `.git`.

---

*Documento siguiente: [04 · Requisitos para v2](04-REQUISITOS-V2.md) — requisitos, recomendación
de stack y estrategia de datos.*
