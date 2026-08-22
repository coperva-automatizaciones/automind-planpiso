# Automind · Plan Piso — Contexto del proyecto

> **Este archivo va en la raíz del repositorio del port, renombrado a `CLAUDE.md`.**
> Escrito el 16 de agosto de 2026 desde el repositorio del MVP, antes del andamiaje.
> Cubre contexto, dominio y decisiones; **la parte estructural — comandos, layout, cómo se
> corren los tests — falta y se completa con `/init` cuando el andamiaje exista.**
> Borra este bloque al moverlo.

Reconstrucción de la aplicación **Automind Plan Piso** sobre un stack moderno, portando la
funcionalidad del MVP actual.

**Idioma del producto y del código: español.** UI, comentarios y nombres de dominio
(`vendedor`, `semaforo`, `diasEnPiso`).

- **Repo:** ⚠️ pendiente de llenar

---

## Qué es este repositorio y qué no es

**Es el port: una demo funcional, no el producto definitivo.** Sirve para enseñar la aplicación a
distribuidoras y para recoger retroalimentación mientras se construye la plataforma definitiva en
paralelo. **Se archiva cuando la plataforma alcance la paridad.**

De ahí salen sus tres límites:

- **Sin funcionalidad nueva.** Lo que hace el MVP, ni más ni menos.
- **Sin la arquitectura de la plataforma definitiva.** Nada de monorepo con paquetes, colas,
  infraestructura como código ni orquestación. Eso vive en el otro proyecto.
- **Alcance: la aplicación completa**, CRM y formularios AMDA incluidos. No es un recorte a plan
  piso.

**El port sí produce cosas reutilizables** —el módulo de dominio, las pantallas de plan piso y la
importación—, pero eso es una consecuencia, no su objetivo. No tomes decisiones aquí pensando en
la plataforma definitiva.

---

## ⚠️ La otra carpeta del workspace es de SOLO LECTURA

El workspace de VS Code monta dos carpetas. La segunda es el **MVP**, en
`c:\Users\Alienware\dev\automind-planpiso`.

**No se edita. Nunca.** Es la referencia literal del port: se lee constantemente, se copia con
criterio, no se toca. Escribir ahí es siempre un error.

| Ruta del MVP | Para qué |
|---|---|
| `CLAUDE.md` | Las cinco trampas verificadas y la arquitectura real |
| `docs/02-MVP-FEATURES.md` | Inventario de lo que hace, pantalla por pantalla |
| `docs/03-LECCIONES-DEL-MVP.md` | Causas, incluida la del RLS desactivado |
| `docs/08-HALLAZGOS-OBSERVADOS.md` | Los veinte hallazgos del recorrido funcional |
| `docs/05-ENTORNO-LOCAL.md` | Cómo levantar el MVP si hace falta verlo corriendo |
| `login.jsx` `db.js` `crm.jsx` `app.jsx` `import.jsx` | El código a portar |

Dimensión de lo que hay enfrente: **17 985 líneas** — 15 452 en 16 módulos, 1 390 en `db.js`,
1 143 en `index.html`. **`crm.jsx` solo son 6 785, el 44 % del total**, y dentro hay un
componente de ~2 490 líneas. La interfaz trae 1 441 estilos en línea contra 928 `className`.

---

## Qué se porta con fidelidad y qué se corrige por diseño

Esta es la distinción que define el trabajo.

**Se porta con fidelidad: el comportamiento observable.** Lo que el usuario ve y hace, incluidas
las reglas que parecen bugs y no lo son (más abajo).

**Se corrige por diseño, no como parche: los seis hallazgos verificados del MVP.** No se heredan.

| Hallazgo en el MVP | Cómo se resuelve al portar |
|---|---|
| El semáforo está implementado seis veces y las copias divergieron — la misma unidad se ve 🟢 al iniciar sesión y ⚫ al recargar | Módulo de dominio puro, única fuente de verdad |
| El vendedor destapa montos y tasas con un atajo de teclado: el guard está en la interfaz, no en los datos | El servidor no envía lo que el rol no puede ver |
| `send-alert` lanza la excepción **antes** de escribir la bitácora: el único caso que importa registrar es el que no deja rastro | Registrar primero, fallar después |
| RLS desactivada en `workspaces`, que contiene teléfonos de directores y gerentes | Política correcta desde el primer día |
| El propietario de una agencia nunca obtiene acceso: nadie escribe en `agency_memberships` desde la aplicación | Alta completa en el flujo |
| Cerrar la venta en el CRM no retira la unidad del plan piso — `estado_venta` no aparece ni una vez en `crm.jsx` | Los dos productos se acoplan |

**El eje que los explica:** cinco de los seis tienen una sola causa — una regla escrita en varios
sitios que divergieron. Por eso el módulo de dominio no es una preferencia de estilo: es la
corrección estructural. **Que una regla de negocio se escriba dos veces es, aquí, un defecto.**

### Lo que desaparece al portar

Nada de esto se replica: transpilación en el navegador, símbolos globales en `window` en vez de
`import`/`export`, orden de `<script>` como única garantía de arranque, cache-busting manual por
querystring, 1 047 líneas de `<style>` en línea, y los dos pipelines de arranque distintos que
son la causa de que el semáforo cambie de color entre el login y la recarga.

---

## Decisiones tomadas — no relitigar

- **TypeScript, Vite, Tailwind y React 19.** En un repositorio nuevo esto no es un rewrite
  arriesgado sobre código ajeno: es simplemente cómo se escribe el código nuevo.
- **Supabase se mantiene como backend**, con credenciales en variables de entorno para que sea
  intercambiable.
- **Módulo de dominio puro** — sin red, sin base de datos — como única fuente de verdad.
- **La CI va antes que la primera pantalla.** El MVP no tenía pruebas, ni CI, ni linter, y sus
  cálculos financieros nunca se verificaron automáticamente. Un port es donde la IA rinde al
  máximo —hay referencia, transformación mecánica, resultado verificable— y el riesgo que eso
  introduce es ir rápido sin red. La CI es la respuesta a ese riesgo.
- **La infraestructura, el stack y los proveedores son decisión de Jose.**

---

## El dominio: el semáforo

Se calcula **en lectura**, nunca se almacena — salvo un snapshot cuyo único propósito es detectar
cambios de estado para disparar alertas.

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

Los umbrales son **exclusivos** (`>`).

**Los 23 vectores de prueba están en `docs/01-DOMINIO.md` del MVP y son la primera suite del
módulo de dominio.** (El `CLAUDE.md` del MVP dice 21; son 23, recontados el 11 de agosto.)

⚠️ **Días de gracia sin configurar: hay que decidirlo explícitamente y fijarlo con un vector.**
Es justo donde divergieron las copias del MVP — cuatro devolvían `101` (⚫) y dos `0` (🟢).

### Reglas que parecen bugs y son deliberadas — se portan tal cual

- **El vendedor no ve el estado ⚫**: se le muestra como 🔴. Tampoco ve monto financiado, tasa ni
  interés acumulado. El costo financiero es información de la agencia. *El comportamiento se
  porta; la implementación se corrige — ver la tabla de hallazgos.*
- **El director no se autoasigna unidades.**
- **Quien captura un pago no lo valida**: solo gerente o director. Es un control interno real.

### Alertas

Se disparan **solo al cambiar de estado**. Dos orígenes: al guardar un vehículo, y el **cron
diario** — que es el que importa, porque la mayoría de los cambios los causa el calendario, no
una edición. La importación masiva los suprime.

---

## Modelo de datos heredado

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
  más objetos sintéticos.
- ⚠️ **Desajuste de tipos en el MVP**: `users.id` es `text`, pero `users.reporta_ids` e
  `inventario.vendedor_ids` son `uuid[]`. Funciona solo porque la aplicación genera ids con forma
  de UUID. **No heredar eso.**
- **En producción hay 4 agencias con exactamente 1 workspace cada una**: la jerarquía de dos
  niveles nunca se ejercitó. Trátala como no probada.
- El MVP arrastra `workspace_id` y `agency_id` conviviendo, con consultas `.or(...)` por todos
  lados. **El port es la oportunidad de quedarse con uno solo.**

---

## Marca

Debe sentirse como **Apple + Linear + Palantir + Stripe**: muy limpio, enterprise, premium, con
mucho espacio negativo, información jerarquizada, pocas gráficas y prioridad a insights y
decisiones. Anti-referencia explícita: el "SaaS genérico AI slop".

**Regla rectora: el color saturado solo aparece cuando significa algo.** Superficies planas en
reposo.

| Token | Hex |
|---|---|
| Automind Navy | `#071326` |
| Deep Blue | `#123A72` |
| Automind Cyan | `#00D4D8` — color de acción |
| Electric Cyan | `#4EF3F7` |
| Light Gray | `#F5F7FA` |
| Text Gray | `#667085` |

⚠️ **El cian sobre blanco no alcanza AA para texto.** Como fondo de botón, el texto encima va en
Navy, no en blanco.

⚠️ **El `DESIGN.md` del MVP está desactualizado**: documenta Azul Acción `#2f6fed` como color de
acción, de antes de esta paleta. `PRODUCT.md` sí sigue vigente.

El semáforo de cinco estados mide riesgo financiero de una unidad. **No reutilizar su paleta**
para nada más — ni severidad, ni clasificación, ni estados de formulario.

**Este producto es de nicho y de uso interno.** Quien entra ya trabaja en la agencia y llegó por
invitación de su director. No hay a quién convencer: nada de copy de venta en la interfaz.

⚠️ **Pregunta abierta:** el port declara "sin funcionalidad nueva", pero existe
`docs/PROMPT-rediseno-login.md` con un rediseño del flujo de acceso. **Decidir si el port replica
la interfaz actual o estrena la identidad nueva** — cambia el trabajo de las pantallas de acceso.

---

## Invariantes

- **Nada de secretos en el repositorio.** En el MVP se respetó a lo largo de 324 commits.
  ⚠️ Con una corrección: allá las credenciales del cliente se sirven en texto plano desde un
  archivo público, con una credencial que no caduca hasta 2036. Aquí van por variables de entorno
  desde el primer commit.
- **Producción del MVP no se toca.** El proyecto está desvinculado; hay dos migraciones de
  seguridad documentadas y sin aplicar, y así se quedan salvo decisión explícita.
  Editar un vehículo en producción dispara correos y mensajes de Telegram reales.
- **El diagnóstico es del sistema y del proceso, nunca de las personas.**
