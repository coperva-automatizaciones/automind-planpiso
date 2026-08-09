# 04 · Requisitos para v2, recomendación de stack y estrategia de datos

> **Propósito.** Traducir el dominio y las lecciones del MVP en requisitos accionables, y
> ofrecer una recomendación de arquitectura **argumentada y descartable**. La decisión de
> stack es tuya; este documento aporta el razonamiento, no el veredicto.

---

## TL;DR ejecutivo

**La buena noticia primero: estás libre de deuda de migración.** No hay clientes activos.
Los cuatro workspaces en producción son configuraciones de demostración. Eso significa que
**no tienes que migrar datos** — y eso cambia por completo la ecuación: puedes elegir la
arquitectura correcta en lugar de la compatible.

Lo que sí conviene rescatar del MVP no es código, son **cinco activos de conocimiento** que
costaron iteraciones y no se ven en un diagrama: los prompts de extracción de documentos
(195 líneas afinadas en 19 commits), la tabla de sinónimos de columnas de Excel, las
plantillas de mensajes, el sistema de diseño y la especificación del semáforo.

**El requisito que más condiciona la arquitectura** no es el multi-tenant ni la IA: es que
**la regla del semáforo tiene que ejecutarse igual en el navegador, en el servidor y en un
trabajo programado**. Ese único requisito descarta cualquier stack que no permita compartir
código de dominio entre los tres, y fue exactamente lo que falló en el MVP.

**Recomendación resumida** (revisada tras conocer la experiencia del lead — TypeScript, NestJS,
Prisma, AWS): monorepo TypeScript con un **paquete de dominio puro**, API en **NestJS**, SPA en
React, **Prisma Migrate** sobre **RDS PostgreSQL** (no Aurora todavía), aislamiento de tenant por
**Prisma Client Extension** con pruebas obligatorias, y **EventBridge → SQS → worker** para los
trabajos programados, que es la pieza que el MVP nunca tuvo bien. La única decisión que conviene
no aplazar es la de autenticación (§3.5). Razonamiento completo, con sus contras, en §3.

**Antes de escribir la primera línea** hay tres decisiones de producto pendientes (§2) que
cambian la arquitectura.

---

## 1. Requisitos derivados del dominio

Independientes de tecnología. Cada uno indica de dónde sale.

### 1.1 Corrección financiera

| # | Requisito | Origen |
|---|---|---|
| F1 | El cálculo del semáforo vive en **un solo módulo** compartido por interfaz, servidor y trabajos programados. | [Lección 1](03-LECCIONES-DEL-MVP.md#lección-1--la-regla-de-negocio-duplicada) |
| F2 | Los vectores de prueba del [reporte 01 §3.3](01-DOMINIO.md#33-vectores-de-prueba) se ejecutan en cada despliegue. | Lección 4 |
| F3 | Los importes usan **decimal de precisión fija**, nunca punto flotante. Se redondea solo al mostrar. | Lección 4 |
| F4 | La fecha de factura es **obligatoria**. Su ausencia es un estado explícito, nunca un valor inventado. | [Reporte 02 §2.3](02-MVP-FEATURES.md#23-importación-desde-excel) |
| F5 | Toda cifra mostrada puede desglosarse en su fórmula ante el usuario. | Principio de diseño ya validado |

### 1.2 Multi-tenant y seguridad

| # | Requisito | Origen |
|---|---|---|
| S1 | El aislamiento entre tenants se **verifica con pruebas automatizadas** en cada despliegue. | [Lección 2](03-LECCIONES-DEL-MVP.md#lección-2--el-aislamiento-entre-clientes-no-era-verificable) |
| S2 | Un cliente **no autenticado** no lee absolutamente nada. | Fuga verificada en producción |
| S3 | Las reglas de visibilidad por rol se aplican **en el servidor**. Lo que un rol no debe ver, no se le envía. | Lección 7 |
| S4 | El servidor **no confía** en identificadores de tenant, roles ni destinatarios enviados por el cliente. | Lección 7 |
| S5 | El esquema y las políticas viven en **migraciones versionadas**; los cambios manuales están prohibidos y se detectan. | Lección 3 |

### 1.3 Datos personales (LFPDPPP)

| # | Requisito |
|---|---|
| P1 | Aviso de privacidad por agencia, versionado, con constancia de aceptación por cliente. |
| P2 | Documentos cifrados en reposo, accesibles solo por URL firmada de vida corta. |
| P3 | **Bitácora de acceso a documentos**: quién vio qué expediente y cuándo. Incluye al super admin. |
| P4 | Política de retención y borrado, con soporte para derechos ARCO. |
| P5 | Los datos personales no salen del tenant. Verificado por las pruebas de S1. |

> P3 es el requisito nuevo respecto al MVP. Hoy un super admin entra a cualquier workspace y
> ve expedientes completos con INE y estados de cuenta; queda registrado que *entró*, no que
> *vio*.

### 1.4 Notificaciones

| # | Requisito | Origen |
|---|---|---|
| N1 | **Ejecución programada fiable**: los cambios de semáforo por paso del tiempo son la mayoría. Con reintentos y alarma si un día no corre. | [Reporte 01 §4.1](01-DOMINIO.md#41-cuándo-se-dispara-una-alerta) |
| N2 | Envío idempotente: un cambio de estado genera **una** notificación, aunque el trabajo se reintente. | Riesgo estructural del MVP |
| N3 | Bitácora de envíos: destinatario, canal, resultado, error. | Ya existe y funciona |
| N4 | Configuración por estado × rol × canal, con plantillas editables. | Validado por uso |
| N5 | Los destinatarios se resuelven **en el servidor** desde la jerarquía. | Lección 7 |

### 1.5 Operación

| # | Requisito |
|---|---|
| O1 | Importación de Excel con la tolerancia del MVP: sinónimos de encabezado, detección de delimitador, validación de fechas, deduplicación por VIN. |
| O2 | Entornos separados (desarrollo / pruebas / producción) con el mismo esquema garantizado. |
| O3 | Despliegue automatizado con posibilidad de reversión. |
| O4 | Observabilidad: errores agregados y trazas, no `console.log`. |
| O5 | Interfaz en español, con formato de moneda y fecha `es-MX`. |

---

## 2. Tres decisiones de producto que anteceden al stack

Ninguna es técnica, y las tres cambian la arquitectura.

### 2.1 ¿El CRM es parte de este producto?

El módulo de clientes es **el 25 % del código**, tiene su propio ciclo de vida, sus propios
usuarios y su propia carga regulatoria. Toca al plan piso en **un solo punto**: la selección
de unidad al cotizar.

| Si… | Entonces… |
|---|---|
| **Es un solo producto** | Modelo de datos y despliegue compartidos. Más simple ahora, más difícil de vender por separado después. |
| **Son dos productos** | Frontera explícita desde el día uno: el CRM consulta el inventario por una interfaz definida. Más trabajo inicial; permite venderlos, cobrarlos y evolucionarlos por separado. |

**Mi lectura:** el acoplamiento real es mínimo — un selector de unidades disponibles. Aunque
decidas desplegarlos juntos al principio, **construye la frontera desde el inicio**. Es barata
ahora y muy cara de introducir después; el MVP es la prueba.

### 2.2 ¿Se justifica la jerarquía agencia → workspace?

En producción hay **4 agencias con exactamente un workspace cada una**. La jerarquía de dos
niveles nunca se ejercitó con un caso real, y en el MVP produjo una clase entera de bugs: la
ambigüedad `workspace_id || agency_id` está esparcida por toda la capa de datos, con
respaldos por todos lados.

**Confirma con negocio** si un cliente va a tener varias sucursales bajo la misma razón
social. Es plausible en grupos automotrices mexicanos, que suelen operar varias marcas y
puntos de venta. Pero si la respuesta es *"aún no"*:

> **Un solo nivel de tenant, con la agrupación como campo opcional.** Es más barato, elimina
> la ambigüedad, y añadir el nivel superior después es una migración acotada — mucho más
> barata que arrastrar la ambigüedad desde el principio.

### 2.3 ¿El interés se materializa o se calcula siempre?

Hoy se calcula en lectura, siempre. Nunca queda obsoleto, pero **no existe historia**: no
puedes responder *"¿cuánto interés teníamos acumulado el 30 de junio?"*, y el cierre contable
de un mes cambia según cuándo lo consultes.

> **Recomendación:** conservar el cálculo en lectura para la operación **y** capturar una foto
> diaria inmutable por unidad. El trabajo programado ya recorre todo el inventario cada día;
> guardar la foto ahí es casi gratis y habilita reportes históricos y auditoría.

---

## 3. Recomendación de arquitectura

**Explícitamente descartable.** Lo que importa es el razonamiento; si tu criterio o tu
contexto de equipo apuntan a otra cosa, los requisitos de §1 siguen siendo válidos.

### 3.1 El requisito que manda

De todos los requisitos, **F1 es el que más restringe**: la regla del semáforo debe ejecutarse
idénticamente en el navegador (respuesta inmediata al editar), en el servidor (validación y
filtrado por rol) y en un trabajo programado (detección diaria de cambios).

Eso implica **un lenguaje común entre cliente y servidor, con módulos reales**. Es la lección
1 convertida en restricción de diseño: el MVP falló exactamente aquí, y no por descuido, sino
porque su arquitectura no permitía compartir.

### 3.2 Recomendación

> **Revisada.** Una primera versión de esta sección recomendaba Next.js sobre Vercel, apoyándose
> en que el MVP ya estaba desplegado ahí. Al conocer la experiencia del lead que va a ejecutar la
> reconstrucción —**TypeScript, NestJS, Prisma, AWS (EC2, Amplify, Aurora, CloudWatch, SES)**—
> ese argumento se cae: «ya estamos en Vercel» pesa mucho menos que «quien construye conoce el
> terreno». En una reconstrucción el riesgo dominante no es elegir el framework subóptimo, es que
> el equipo vaya lento en tecnología desconocida.
>
> **Lo que no cambia son los requisitos de §1.** La recomendación de abajo los satisface todos,
> y en tres puntos los satisface *mejor* que la versión anterior.

| Capa | Recomendación | Por qué |
|---|---|---|
| **Lenguaje** | TypeScript de punta a punta | Requisito F1. El tipado habría atrapado buena parte de los defectos de mapeo `snake_case`/`camelCase` del MVP. |
| **Estructura** | Monorepo con paquete `domain` **puro** (sin E/S) | El semáforo y los cálculos financieros viven ahí, importados por API, worker y frontend. Se prueba en milisegundos. |
| **API** | **NestJS** | Con un paquete de dominio compartido, Nest resuelve F1 **más limpio** que Next: la frontera entre dominio y transporte es explícita, no una convención. |
| **Frontend** | React + Vite, SPA | Con Nest como API, un SPA es más simple que Next. El filtrado por rol vive en la API, donde debe estar. |
| **ORM / migraciones** | **Prisma Migrate**, aplicado por CI | Requisito S5 — la Lección 3 en forma ejecutable. Fin del problema de reproducibilidad. |
| **Base de datos** | PostgreSQL en RDS · **no Aurora todavía** | Ver §3.4 sobre costo. |
| **Aislamiento de tenant** | **Prisma Client Extension** que inyecta el filtro de tenant en toda operación + pruebas automáticas | Ver §3.3 — es el punto que más cambia respecto a la versión anterior. |
| **Trabajos programados** | **EventBridge Scheduler → SQS → worker** (app del monorepo) | Requisitos N1 y N2. **Aquí AWS gana claramente**: reintentos, DLQ y visibilidad nativos. Es la pieza que el MVP nunca tuvo bien. |
| **Correo** | **SES** | Sustituye a Brevo. Ya lo conoces, y es sensiblemente más barato. Ver la advertencia de sandbox en §3.4. |
| **Almacenamiento** | **S3 con URLs prefirmadas** | Equivalente directo a lo que Supabase Storage hacía bien. Requisito P2. |
| **Autenticación** | **La decisión abierta** — ver §3.5 | Es la única pieza sin equivalente cómodo en tu stack. |
| **Observabilidad** | CloudWatch + trazas estructuradas | O4. Ya lo conoces. |
| **Dinero** | `Decimal` en Prisma → `numeric` en Postgres | F3. Prisma mapea a `Decimal.js`, que es exactamente lo que hace falta. |
| **Pruebas** | Jest o Vitest para el dominio · integración de aislamiento · Playwright para los 2 flujos críticos | F2, S1 |
| **CI** | GitHub Actions: pruebas + deriva de esquema en cada PR | S5, y el fin de los 324 commits sin revisión |

**Dónde esta opción es mejor que la anterior:**

1. **Los trabajos programados.** Era el punto más débil del MVP y el más flojo de mi recomendación
   previa. EventBridge + SQS + DLQ da reintentos, idempotencia y alarma-si-no-corrió sin
   construir nada. Requisito N1 resuelto por infraestructura, no por disciplina.
2. **El filtrado por rol (S3).** Los interceptores de Nest con `class-transformer` y grupos de
   serialización hacen que «el vendedor no recibe montos» sea una anotación en el DTO, verificable
   en una prueba — en vez de un `if` en el render. Es una respuesta estructural al fallo del MVP.
3. **La frontera con el CRM** (decisión 2.1). Los módulos de Nest la hacen barata: si mañana el
   CRM se separa, ya es un módulo con interfaz propia.

### 3.3 El punto que más cambia: Prisma y el aislamiento entre tenants

Mi recomendación anterior se apoyaba en RLS como defensa en profundidad. **Con Prisma eso se
vuelve incómodo**, y conviene decirlo sin rodeos en vez de recomendar algo que en la práctica
se abandona al tercer sprint.

Prisma no soporta RLS de forma nativa: usa un pool con un solo usuario de base de datos, así que
la sesión no lleva identidad. Hacerlo funcionar exige envolver **cada consulta** en una
transacción interactiva con `SELECT set_config('app.tenant_id', …, true)`. Funciona, pero
convierte toda lectura en una transacción y añade fricción permanente.

**La alternativa, y lo que recomiendo:**

> **Acotación por tenant en la capa de consulta, con una Prisma Client Extension que intercepte
> `$allOperations` e inyecte el filtro de tenant en todo modelo que lo tenga.** No es opcional
> por convención: si el contexto de tenant no está presente, la extensión lanza en lugar de
> consultar sin filtro.

Y aquí está el argumento que importa, dado lo que acabamos de aprender del MVP:

**Esta barrera es más difícil de desactivar que RLS.** El fallo real de producción no fue que RLS
fuera mala, fue que **alguien la apagó desde un panel web y nadie pudo notarlo**. Una extensión de
Prisma vive en el repositorio, pasa por revisión de código, y no tiene interruptor en ninguna
consola. Es exactamente la propiedad que faltaba.

El precio es que pierdes la red de seguridad del motor: un acceso a la base fuera de Prisma
—un script de mantenimiento, una consulta manual— no está protegido. Se compensa con:

- **Pruebas de aislamiento obligatorias en CI** (requisito S1), que son la barrera real de todos modos.
- Un usuario de base de datos de solo lectura para operación manual.
- Si más adelante quieres la segunda capa, RLS se puede añadir sobre un esquema ya versionado
  sin rehacer la aplicación.

### 3.4 Costo e infraestructura: dos advertencias

**Aurora es prematuro.** Aurora Serverless v2 tiene un piso de capacidad que se paga aunque el
sistema esté ocioso — del orden de decenas de dólares al mes solo por existir, antes de
almacenamiento y E/S. Para un producto **pre-ingresos, con 4 workspaces de demostración**, es
gasto sin contrapartida. Empieza en **RDS PostgreSQL `t4g.micro`/`small`**: cuesta una fracción,
es el mismo Postgres, y migrar a Aurora después es un cambio de endpoint. Deja Aurora para cuando
haya carga que lo justifique.

**SES necesita salir del sandbox.** Por defecto solo envía a direcciones verificadas; el acceso a
producción requiere solicitud y aprobación de AWS, y conviene pedirla con antelación. Además, un
dominio nuevo necesita calentamiento y configuración de SPF/DKIM/DMARC para no caer en spam —
crítico en un producto cuya promesa es que la alerta *llegue*. Las plantillas del MVP son
portables tal cual.

**Sobre el cómputo:** conoces EC2, y funciona. Pero para una sola API sin estado, **ECS Fargate o
App Runner** eliminan el mantenimiento de instancias (parches, AMIs, escalado) sin que tengas que
aprender nada sustancial. Es la recomendación; EC2 es una alternativa válida si prefieres control.

### 3.5 La decisión abierta: autenticación

Es la única pieza del MVP sin equivalente cómodo en tu stack, y merece pensarse antes de empezar
—no resolverse a mitad de la fase 1.

| Opción | A favor | En contra |
|---|---|---|
| **Cognito** | Nativo de AWS, integra con todo lo demás, sin costo relevante a esta escala | DX notoriamente áspera; personalizar flujos y correos es trabajoso; migrar usuarios *fuera* después es caro |
| **Auth propio en Nest** (Auth.js / better-auth / Passport) | Control total, vive en el monorepo, sin dependencia externa | Tú mantienes recuperación de contraseña, verificación, sesiones y rotación de tokens — superficie de seguridad que hay que hacer bien |
| **Servicio gestionado** (Clerk, WorkOS, Auth0) | La mejor DX; SSO empresarial resuelto para cuando lo pida una agencia grande | Costo por usuario activo; otra dependencia externa |

**Recomendación:** dado que el producto es B2B para agencias con equipos pequeños y jerarquía
interna —no consumo masivo—, el volumen de usuarios será bajo y el requisito real es
*invitación por correo, roles y recuperación de contraseña*. **Cognito cubre eso y encaja con el
resto de tu infraestructura**; su mala DX se paga una vez, al construirlo.

Lo importante, venga de donde venga: **abstrae la autenticación detrás de una interfaz propia
desde el día uno**. Es la pieza más cara de sustituir —lo dice el §4.4 de este mismo documento—
y la única donde una decisión equivocada se vuelve difícil de revertir.

### 3.6 Y si prefirieras quedarte en Supabase

Sigue siendo una opción defendible, y conviene dejar el argumento por escrito para que la
decisión sea deliberada.

**El problema del MVP no fue Supabase.** Fue la ausencia de proceso. La fuga no la causó el
proveedor: la causó un cambio manual en un panel, sin migraciones que lo detectaran. Ese fallo
se reproduce igual en cualquier plataforma — incluida AWS.

| A favor de Supabase | A favor de AWS con tu stack |
|---|---|
| Postgres, auth, almacenamiento y funciones en un proveedor: mucho apalancamiento para un equipo pequeño | Conoces el terreno: velocidad real desde la semana uno |
| RLS aplicada en el motor — un `WHERE` olvidado no filtra datos | EventBridge + SQS resuelven N1/N2, donde `pg_cron` no llega |
| Auth resuelta sin decidir nada (§3.5 desaparece) | Sin fricción entre Prisma y RLS |
| Más barato a esta escala | Sin techo cuando el producto crezca |
| Almacenamiento con URLs firmadas: la parte que el MVP hizo bien | Nest + interceptores hacen estructural el filtrado por rol |

**El desempate:** con Supabase, las Edge Functions corren en Deno y no comparten módulos con un
paquete de dominio de Node con la misma naturalidad — fricción directa contra F1, que es el
requisito que manda. Se puede evitar sacando toda la lógica a una API propia, pero entonces
Supabase queda reducido a Postgres + auth + almacenamiento… y en ese punto la ventaja frente a
RDS + Cognito + S3 es principalmente la autenticación.

> **Híbrido razonable, si la DX de Cognito te frena:** AWS para todo lo demás y **Supabase Auth
> como único servicio externo**. Detrás de la interfaz de autenticación que recomienda §3.5,
> es sustituible sin tocar el resto.

### 3.7 Lo que no recomiendo

| Opción | Por qué no |
|---|---|
| **Portar el código existente** | El único activo real es el conocimiento de dominio, y ya está extraído en los reportes 01 y 02. Portar arrastraría las 7 copias del semáforo. |
| **Microservicios** | Un producto, un equipo pequeño, sin problemas de escala. Los módulos de Nest ya dan la separación que hace falta. |
| **Aurora desde el día uno** | Piso de costo sin contrapartida en un producto pre-ingresos. Ver §3.4. |
| **`@nestjs/schedule` para el cron diario** | Corre en proceso: se duplica con varias instancias, no reintenta y no avisa si no corrió. Es repetir el fallo del MVP con otra sintaxis. |
| **Backend a medida desde cero** (correo, almacenamiento propios) | Reconstruir lo que ya está resuelto, sin ganancia. |
| **Base de datos no relacional** | El dominio es relacional (jerarquías, agregaciones, transacciones) y financiero. |

---

## 4. Estrategia de datos

### 4.1 Qué hay realmente en producción

Verificado por sondeo directo:

| Elemento | Estado |
|---|---|
| Agencias / workspaces | **4**, uno por agencia. Nombres de marcas reales, configuración de demostración. |
| Inventario, usuarios, clientes | Inaccesible con clave anónima (las políticas lo impiden). Volumen sin confirmar. |
| Documentos en almacenamiento | Bucket privado, correctamente cerrado. Contenido sin confirmar. |
| Usuarios de autenticación | Sin confirmar. |
| Estructura del esquema | ~17 tablas, deducibles del código; el estado exacto requiere introspección con credenciales de servicio. |

### 4.2 Recomendación: no migrar nada

**Sin clientes activos, migrar datos es trabajo sin beneficio.** Recrea los cuatro workspaces
de demostración como datos semilla versionados en el repositorio — así el entorno de
desarrollo es reproducible desde el primer día, que es justo lo que el MVP nunca tuvo.

Antes de tocar nada, un respaldo completo (`pg_dump` + copia del bucket) archivado fuera del
proyecto. Es barato y elimina la ansiedad de decidir.

### 4.3 Lo que sí vale la pena rescatar

No es código: es conocimiento que costó iteraciones y que se pierde si nadie lo señala.

| Activo | Dónde está | Por qué importa |
|---|---|---|
| **Prompts de extracción de documentos** | `supabase/functions/extract-document/index.ts` — **195 líneas, 7 extractores, afinados en 19 commits** | Contienen aprendizaje real sobre documentos mexicanos: confusiones de OCR por zona del INE, homoclave y dígito verificador del RFC, cómo distinguir "Enganche" de otros importes en una cotización. **Reescribirlos desde cero costaría semanas de prueba y error.** |
| **Tabla de sinónimos de columnas de Excel** | [import.jsx:5-22](../import.jsx#L5) | 19 campos con sus alias reales, sacados de cómo exportan los sistemas de las agencias. Es conocimiento de campo. |
| **Plantillas de mensajes** | `send-alert/index.ts:13-40` | Textos por defecto para correo, Telegram y WhatsApp, diferenciados por rol, con variables sustituibles. Redactados en el tono correcto. |
| **Sistema de diseño** | `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` | Documentación de producto de calidad profesional. Los colores del semáforo están validados por uso. **Portar tal cual.** |
| **Especificación del semáforo** | [Reporte 01 §3](01-DOMINIO.md#3-el-semáforo--especificación-ejecutable) | Ya extraída, con vectores de prueba listos. |

### 4.4 Costo de salir de Supabase

Cuantificado para que la decisión sea informada, no reflexiva. **Hoy el costo es
excepcionalmente bajo**, y esa es justo la razón para decidirlo ahora y no dentro de un año:

| Pieza | Esfuerzo | Nota |
|---|---|---|
| PostgreSQL → RDS | **Bajo** | `pg_dump`/`pg_restore`. Postgres es Postgres. Y sin clientes, ni siquiera hace falta: se parte de datos semilla. |
| Row Level Security | **Nulo** | Es del motor, no del proveedor. Y con la recomendación de §3.3, el aislamiento pasa a la capa de Prisma. |
| Almacenamiento → S3 | **Bajo** | Copia de objetos + reescritura de la firma de URLs. Conceptualmente idéntico. |
| Correo Brevo → SES | **Bajo** | Las plantillas son portables. El trabajo real es sacar SES del sandbox y calentar el dominio. |
| Edge Functions | **Nulo** | No se migran: la lógica se reescribe en el paquete de dominio, que es lo que había que hacer de todos modos. |
| **Autenticación** | **Medio-alto** | Migrar usuarios exige restablecer contraseñas o importar hashes. **Es la única pieza cara** — y hoy vale casi cero, porque los usuarios son de demostración. |

La conclusión operativa no cambia, solo se refuerza: **la autenticación es el único punto de
dependencia real**, y es la pieza a abstraer detrás de una interfaz propia desde el día uno.
Todo lo demás es portable.

---

## 5. Orden de construcción sugerido

Cada fase entrega algo verificable. Sin estimaciones de tiempo: dependen de un tamaño de
equipo que no conozco.

**Fase 0 — Cimientos**
1. Monorepo (`domain` · `api` · `worker` · `web`), TypeScript, CI con pruebas desde el primer commit.
2. Paquete `domain` con el semáforo y **los vectores de prueba del reporte 01 en verde**.
   Sin dependencias, sin E/S — se prueba en milisegundos.
3. Esquema en Prisma Migrate + datos semilla reproducibles.
4. **La Prisma Client Extension de tenant y sus pruebas de aislamiento, antes de la primera
   pantalla.** Se ponen ahora porque después nadie las pone.
5. Decidir autenticación (§3.5) y ponerla detrás de una interfaz propia.
6. Solicitar salida del sandbox de SES — tarda, y bloquea la fase 2.

> Al terminar la fase 0 ya están cubiertas las lecciones 1, 2, 3 y 4.

**Fase 1 — El producto mínimo real**
7. Autenticación, roles y jerarquía, con el filtrado por rol en los DTO de la API.
8. Inventario: alta, edición y semáforo, con desglose de fórmulas.
9. Importación de Excel (portando la tabla de sinónimos).
10. Dashboard con KPIs.

**Fase 2 — La promesa del producto**
11. EventBridge Scheduler → SQS → worker, con DLQ, idempotencia y alarma si un día no corre.
12. Alertas por SES con plantillas y reglas por estado × rol.
13. Telegram.

> Al terminar la fase 2 el producto cumple su promesa: ninguna unidad genera intereses en
> silencio. **Es el punto de corte para volver a poner clientes.**

**Fase 3 — Según la decisión 2.1**
12. CRM, si procede: expediente, cumplimiento, extracción con IA (portando los prompts).
13. WhatsApp.
14. Super admin y auditoría.

---

## 6. Riesgos de la reconstrucción

Nombrados para poder vigilarlos.

| Riesgo | Mitigación |
|---|---|
| **Ampliación de alcance.** El MVP hace mucho; es tentador mejorarlo todo a la vez. | El corte de la fase 2 es explícito. El CRM espera a una decisión de producto. |
| **Pérdida de conocimiento de dominio.** Está en la cabeza del autor original y en detalles del código. | Estos reportes lo capturan. El autor sigue siendo la mejor fuente para las tres decisiones de §2. |
| **Segundo sistema.** Reconstruir sobreingenierizando por reacción al MVP. | Microservicios y abstracciones prematuras están explícitamente descartados en §3.4. |
| **Regresión funcional invisible.** v2 sale sin algo que sí funcionaba. | El checklist de paridad del [reporte 02 §7](02-MVP-FEATURES.md#7-checklist-de-paridad-para-v2). |
| **Rehacer los prompts de IA desde cero.** | Portar textualmente y ajustar; son 19 commits de aprendizaje. |

---

## 7. Lo que conviene verificar antes de decidir

Cinco consultas que endurecen las estimaciones. Requieren acceso al panel de Supabase:

```sql
-- 1. Volumen real por tabla
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;

-- 2. Políticas de acceso vivas hoy (para confirmar el alcance de la fuga)
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename;

-- 3. Tablas con RLS desactivada  ← ya sabemos que workspaces sale aquí.
--    Lo que falta es descartar que salgan users o clientes, que tienen PII.
SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 4. ¿El cron diario está realmente programado?
SELECT * FROM cron.job;

-- 5. Usuarios de autenticación reales
SELECT count(*), max(last_sign_in_at) FROM auth.users;
```

Y en el panel: **qué secretos están configurados** — en particular `SITE_URL`, del que depende
que los enlaces de las alertas no lleven a una página 404.

**Actualización (confirmado en el panel):** `workspaces` **sí** aparece en la consulta 3 — RLS
desactivada, con advertencia visible en el panel de Supabase. Eso explica la fuga por completo:
ninguna política del repositorio se está aplicando sobre esa tabla. Lo que queda por descartar
es que `users` y `clientes` estén igual, porque esas sí contienen datos personales.

Esto refuerza el requisito **S5** y lo vuelve concreto: no basta con escribir buenas políticas —
hay que verificar que estén **activas**. Una prueba de aislamiento que consulte como cliente
anónimo habría detectado esto el día que ocurrió.

---

*Documentos de este paquete: [01 · Dominio](01-DOMINIO.md) · [02 · Features](02-MVP-FEATURES.md) ·
[03 · Lecciones](03-LECCIONES-DEL-MVP.md) · **04 · Requisitos v2***
