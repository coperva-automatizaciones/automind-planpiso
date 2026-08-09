# 02 · Qué hace el MVP hoy — y qué merece existir en v2

> **Propósito.** Inventario honesto de todo lo que el producto hace hoy, con dos veredictos
> separados por módulo: **estado actual** (¿funciona?) y **recomendación para v2**
> (¿debe existir?). Es el checklist de paridad funcional para la reconstrucción.

---

## TL;DR ejecutivo

El MVP tiene **ocho vistas navegables** y hace bastante más de lo que su nombre sugiere. Son
en realidad **dos productos conviviendo** en la misma aplicación:

1. **Plan Piso** — el semáforo de inventario financiado, sus alertas y su tablero. Es el
   producto que justifica el nombre y está **funcionalmente completo**.
2. **Asistente del vendedor (CRM)** — un pipeline de venta de ocho etapas con expediente
   digital, cumplimiento normativo y lectura de documentos con IA. Es **el 25 % del código**,
   está razonablemente completo, y **no aparece en ninguna documentación de producto**.

Además hay una capa de administración (super admin, gestión de agencias, equipo) y seis
integraciones externas reales.

**Lo que hay que saber para planear v2:**

- **Nada está a medias por descuido**, pero sí hay **código muerto** que aparenta ser función:
  un módulo completo desconectado, un archivo que solo devuelve `null`, y una vista
  inalcanzable desde el menú.
- **Dos features son de calidad notable y merecen sobrevivir conceptualmente**: la importación
  de Excel (tolerante al desorden del mundo real) y el desglose de fórmulas visible al usuario.
- **Un problema serio de permisos**: la importación masiva de inventario **no tiene control de
  rol** — un vendedor puede reemplazar el inventario de la agencia.
- **Un defecto de captura con consecuencia financiera**: el importador exige la fecha
  *irrelevante* (llegada) y hace opcional la que gobierna todo el producto (factura); cuando
  falta, **la inventa**.

---

## 1. Mapa de navegación

Tres grupos en la barra lateral ([components.jsx:146](../components.jsx#L146)):

| Grupo | Vista | Clave interna | Quién la ve |
|---|---|---|---|
| **Plan Piso** | Dashboard | `dashboard` | Todos |
| | Inventario | `inventario` | Todos |
| | Importar inventario | `importar` | Todos ⚠️ |
| | Alertas | `alertas` | Todos (vendedor ve solo Telegram) |
| **Ventas** | Dashboard de ventas | `ventas` | Todos |
| | Proceso de ventas (CRM) | `crm` | Todos |
| **Configuración** | Equipo | `colaboradores` | Todos (edición restringida) |

**Vistas que existen pero el menú no muestra:**

| Vista | Cómo se llega | Estado |
|---|---|---|
| `database` ("Ver datos") | Menú de la marca, arriba a la izquierda. Oculto a vendedores. | Funcional |
| `config` ("Configuración del workspace") | **No se llega.** Sin entrada de menú. | Placeholder — "en construcción" |
| `usuarios` | Ruta viva que renderiza el mismo componente que `colaboradores` | Duplicado |

**Pantallas fuera del shell:** login, establecer contraseña (invitación), selector de
workspace (para dueños de agencia), panel de super admin, y pantalla de enlace inválido.

---

## 2. Módulos — estado y veredicto

### 2.1 Dashboard · Plan Piso

**Archivo:** [dashboard.jsx](../dashboard.jsx) (793 líneas) · **Estado:** ✅ Completo

Once componentes: tarjetas KPI, tabla del semáforo, barra apilada, días por estado,
distribución por modelo, antigüedad, carga por vendedor, unidades dañadas, vendidos del mes
y lista detallada con filtros cruzados.

KPIs ([login.jsx:518](../login.jsx#L518)): total de unidades, conteo por cada estado del
semáforo, **interés total acumulado** y **monto total financiado**.

Detalle de buen diseño: los filtros son **cruzados y acumulativos** — clic en un segmento del
semáforo filtra la lista, y se combina con filtros por gerente y por modelo.

> **Veredicto v2: conservar el concepto, rehacer la implementación.** El conjunto de KPIs
> está bien elegido y validado por uso. La implementación recalcula todo en cada render
> ([app.jsx:777-779](../app.jsx#L777)), lo que no escala más allá de unos cientos de unidades.

### 2.2 Inventario (editor)

**Archivo:** [inventario-editor.jsx](../inventario-editor.jsx) (699 líneas) · **Estado:** ✅ Completo

Tabla editable con panel de detalle, autoguardado a 1.5 s, borrado individual y masivo (en
lotes de 100 para evitar tiempos de espera), y **desglose de fórmulas visible**: el usuario ve
*por qué* cada número es lo que es.

> **Veredicto v2: conservar, incluido el desglose de fórmulas.** Es un activo real de producto
> — genera confianza en cifras financieras y está explícitamente en los principios de diseño.
> ⚠️ Pero **este editor usa una variante divergente del semáforo**
> ([inventario-editor.jsx:33](../inventario-editor.jsx#L33)): muestra 🟢 donde el tablero
> muestra ⚫. Ver [reporte 01 §7.1](01-DOMINIO.md#71-️-unidad-sin-días-de-gracia-configurados--🟢-o-).

### 2.3 Importación desde Excel

**Archivo:** [import.jsx](../import.jsx) (644 líneas) · **Estado:** ✅ Completo, con dos defectos serios

Lo que hace bien — y es genuinamente bueno:

- **Auto-detección de columnas por sinónimos**: `vin` reconoce también `numero_serie`,
  `no_serie`, `serie`… ([import.jsx:5](../import.jsx#L5)). 19 campos con sus alias.
- Normalización de encabezados: minúsculas, sin acentos, sin espacios ni guiones.
- **Detección automática del delimitador** en CSV (`,` `;` tab `|`) y manejo de comillas.
- **Fechas en varios formatos** con validación real: rechaza `06/13/2026` como día 13 del
  mes 6 en vez de hacer rollover silencioso a enero ([import.jsx:121](../import.jsx#L121)).
- **Porcentajes flexibles**: acepta `14` o `0.14` y normaliza ([import.jsx:146](../import.jsx#L146)).
- **Deduplicación por VIN** antes de insertar, con confirmación.
- Plantilla `.xlsx` descargable con los campos obligatorios marcados.
- Supresión de alertas en carga masiva, para no disparar cientos de correos.

> **Veredicto v2: conservar el comportamiento completo.** Esta tolerancia al desorden es lo que
> hace usable el producto: las agencias exportan de sistemas heredados con encabezados
> impredecibles. Trátalo como especificación, no como código a portar.

**⚠️ Defecto 1 — sin control de rol.** `ImportarInventario` no recibe `usuarioActual` y no
comprueba nada ([import.jsx:436](../import.jsx#L436)); la barra lateral muestra la opción a
todos. **Un vendedor puede importar y alterar el inventario de toda la agencia.** Además, su
deduplicación por VIN se compara contra la lista *filtrada* que el vendedor ve (solo sus
unidades), así que además de poder hacerlo, es más probable que genere duplicados.

**⚠️ Defecto 2 — la fecha equivocada es la obligatoria.** `fechaLlegada` está marcada como
requerida y `fechaFactura` como opcional ([import.jsx:16-17](../import.jsx#L16)) — pero la
factura es la que gobierna el semáforo, el interés y las alertas. Cuando falta, el sistema
**la inventa**: `fechaLlegada − 7 días` ([import.jsx:163](../import.jsx#L163)). Eso produce
cifras financieras plausibles y falsas, sin ninguna señal al usuario. En v2 la fecha de
factura debe ser obligatoria, y su ausencia un error visible, no un relleno silencioso.

### 2.4 Alertas

**Archivo:** [alertas.jsx](../alertas.jsx) (1 612 líneas) · **Estado:** ✅ Completo

Cuatro pestañas:

| Pestaña | Contenido | Acceso |
|---|---|---|
| **Reglas** | Una fila por estado del semáforo: a quién notificar (vendedor/gerente/director) y si está activa. | Gerente / director |
| **Telegram** | Vinculación de la cuenta personal con el bot, vía token temporal. | **Todos, incluido vendedor** |
| **WhatsApp** | Activación por regla y teléfonos de director/gerente. | Gerente / director |
| **Mensajes** | Editor de plantillas por canal y por rol, con variables sustituibles. | Gerente / director |

Al vendedor se le abre directamente en Telegram y solo ve esa pestaña
([alertas.jsx:1264+](../alertas.jsx#L1264)) — decisión correcta: es lo único que le concierne.

Incluye envío de prueba y bitácora de alertas enviadas (`alert_log`: destinatarios, estados
origen/destino, errores).

> **Veredicto v2: conservar el modelo completo.** La granularidad —por estado × por rol × por
> canal, con plantillas editables— está bien pensada y es lo que hace el producto adaptable a
> cómo trabaja cada agencia. **La bitácora es imprescindible**, no opcional: sin ella no se
> puede demostrar que se avisó.

### 2.5 Asistente del vendedor (CRM)

**Archivo:** [crm.jsx](../crm.jsx) (**6 157 líneas**) · **Estado:** ✅ Funcional · ⚠️ Insostenible

El módulo más grande del sistema. 29 componentes, de los cuales `ClienteEditor` es
**uno solo de ~2 490 líneas** ([crm.jsx:2593](../crm.jsx#L2593)).

Cuatro formas de ver la misma cartera: tablero Kanban por etapa, lista en cuadrícula, vista
de urgentes, y tablero de métricas de venta.

El expediente del cliente cubre 21 secciones, entre ellas: datos del cliente, documentos de
identidad, origen del prospecto, preferencias de compra, aviso de privacidad, encuesta,
vehículo de interés, prueba de manejo, cotización con selección de unidad, proceso de crédito,
validación de expediente, aprobación del gerente, documentos de cumplimiento, confirmación de
pago y entrega.

Funciones destacadas:

- **Extracción de documentos con IA** — 7 extractores (identificación, licencia, domicilio,
  RFC, cotización, comprobante de pago, solicitud de crédito). Incluye **validación cruzada**:
  al leer una cotización, compara la unidad detectada contra la seleccionada y advierte.
- **Selector de unidad** conectado al inventario real, restringido a unidades `DISPONIBLE`.
- **Validación de pago con segregación de funciones**: el vendedor captura, solo gerente o
  director validan.
- **Recompra**: flujo para clientes que vuelven.
- **Verificación de contacto**: valida el correo (consulta MX) y el número de WhatsApp.
- **Historial automático** por cliente ante cambios de etapa, estado o asignación.

> **Veredicto v2: decisión de producto pendiente antes de decidir nada técnico.**
> Ver [reporte 01 §7.4](01-DOMINIO.md#74-el-crm-es-parte-de-este-producto). Si sobrevive, el
> contenido funcional es sólido y validado; lo insostenible es la forma. Un componente de
> 2 490 líneas no se mantiene ni se prueba: en v2, un paso del expediente por componente.

### 2.6 Equipo (colaboradores)

**Archivo:** [colaboradores.jsx](../colaboradores.jsx) (804 líneas) · **Estado:** ✅ Completo

Organigrama visual navegable, alta/edición con panel lateral, invitación por correo con
enlace de activación, y jerarquía con **múltiples superiores** por persona. Incluye la carga
del aviso de privacidad del workspace.

> **Veredicto v2: conservar.** El organigrama no es decorativo: es la representación directa
> de la cadena de notificación, y hace visible a quién le va a llegar cada alerta.

### 2.7 Datos (vista de tablas)

**Archivo:** [database.jsx](../database.jsx) (523 líneas) · **Estado:** ✅ Funcional · Oculta

Vista tabular genérica con columnas configurables, sumas y fórmulas. Oculta a vendedores y
alcanzable solo desde el menú de la marca.

> **Veredicto v2: descartar como vista de usuario.** Es una herramienta de depuración
> disfrazada de función. Lo que resuelve —inspección y exportación— se cubre mejor con una
> exportación explícita a Excel desde cada vista.

### 2.8 Dashboard de ventas

**Archivo:** [ventas.jsx](../ventas.jsx) (459 líneas) · **Estado:** ⚠️ Parcial

Embudo por etapa, anillos de conversión, barras horizontales. **`ProcesoVenta`, definido en
este archivo, nunca se renderiza** — es código muerto.

> **Veredicto v2: rediseñar junto con la decisión sobre el CRM.** Hoy solapa con el tablero de
> métricas que ya vive dentro de `crm.jsx`.

### 2.9 Super admin

**Archivo:** [super-admin.jsx](../super-admin.jsx) (819 líneas) · **Estado:** ✅ Completo

Alta de agencias con datos legales completos (razón social, RFC, representante legal), entrada
a cualquier workspace suplantando el contexto, y **bitácora de auditoría** de acciones
administrativas (`super_admin_audit_log`).

> **Veredicto v2: conservar, con la auditoría reforzada.** Es la herramienta de operación del
> negocio. La bitácora es correcta y debe extenderse: cuando un super admin entra al workspace
> de un cliente y ve expedientes con PII, eso tiene que quedar registrado.

### 2.10 Panel de personalización visual

**Archivo:** [tweaks-panel.jsx](../tweaks-panel.jsx) (540 líneas) · **Estado:** ✅ Funcional

Color de acento, color de barra lateral y densidad (cómodo/compacto). Persistente por
workspace.

> **Veredicto v2: conservar solo el branding por agencia** (color e iniciales, que sí importan
> a un concesionario con identidad de marca). El panel de personalización en vivo es una
> herramienta de autor, no una función de usuario.

---

## 3. Código muerto y funciones fantasma

Lo que parece existir y no existe:

| Elemento | Qué es | Evidencia |
|---|---|---|
| `financieras.jsx` (392 líneas) | Módulo completo de gestión de financieras. **Excluido del `index.html`** con un comentario explícito. | [index.html:1123](../index.html#L1123) |
| `usuarios.jsx` (4 líneas) | Devuelve `null`. Sigue cargándose en cada arranque. | [usuarios.jsx](../usuarios.jsx) |
| `ProcesoVenta` | Componente definido en `ventas.jsx`, nunca renderizado. | [ventas.jsx:139](../ventas.jsx#L139) |
| Vista `config` | Placeholder "en construcción" sin entrada de menú. | [app.jsx:860-877](../app.jsx#L860) |
| Vista `usuarios` | Ruta que renderiza el mismo componente que `colaboradores`. | [app.jsx:878](../app.jsx#L878) |
| 5 Edge Functions duplicadas en la raíz | `send-alert.ts`, `invite-user.ts`, etc. **No se despliegan**; divergen de las reales. | ver §4 |

> El `CLAUDE.md` del repositorio afirma que `financieras.jsx` sigue cargándose. Es incorrecto
> desde hace meses.

---

## 4. Integraciones externas

Contrastado contra el inventario real de secretos del panel (agosto 2026):

| Integración | Uso | Estado |
|---|---|---|
| **Supabase** | Base de datos, autenticación, almacenamiento, funciones | ✅ Núcleo del sistema |
| **Brevo** | Correo transaccional (alertas, invitaciones) | ✅ Configurado y en uso |
| **Telegram Bot API** | Alertas + vinculación de cuenta con token temporal | ✅ Completo (bot, webhook, enlace) |
| **Meta WhatsApp Cloud API** | Alertas a director/gerente | ✅ **Bien configurado** — con los nombres de secreto que el código espera |
| **OpenAI `gpt-4o`** | Extracción de datos de documentos | ✅ Activo (bajo el secreto `ANTHROPIC_API_KEY`) |
| **Twilio** | Verificar que un teléfono existe en WhatsApp | ❌ **No configurado** — ver abajo |
| **Resend** | — | ⚠️ **Secreto configurado que ninguna función lee** |
| **pg_cron + pg_net** | Recálculo diario del semáforo | ⬜ `CRON_SECRET` existe; falta confirmar que el job esté programado |

**❌ La verificación de teléfono corre a media capacidad.** `verify-contact` trata las
credenciales de Twilio como opcionales y degrada con elegancia: si no están, **valida solo el
formato E.164 mexicano** y no comprueba que el número exista realmente en WhatsApp
([verify-contact/index.ts:117-126](../supabase/functions/verify-contact/index.ts#L117)). El
diseño es correcto —no falla y reporta qué método usó— pero significa que la feature
«Verificación de contacto» del CRM **hoy no hace lo que su nombre promete**.
*Para v2:* decidir si se paga Twilio o se retira la promesa de la interfaz.

**⚠️ `RESEND_API_KEY` es un secreto huérfano.** Está configurado en producción y **ninguna
función lo lee**. Lo más probable: una migración de proveedor de correo empezada y no terminada.
Conviene preguntárselo al autor original antes de fijar el proveedor de v2 — puede haber una
razón detrás (entregabilidad, costo) que valga la pena conocer.

**Otras notas de configuración** (código contra `README.md`):

- El README dice que la IA es Anthropic Claude. **Es OpenAI.**
- El README documenta `META_WA_TOKEN` / `META_WA_PHONE_ID`; el código lee
  `META_WA_ACCESS_TOKEN` / `META_WA_PHONE_NUMBER_ID`. **Producción usa los correctos**, así que
  WhatsApp funciona hoy — pero cualquier montaje futuro que siga el README lo dejaría apagado
  en silencio.
- El README lista `EXTRACT_API_KEY`: ninguna función la lee y tampoco está configurada.
- Las funciones de alerta caen por defecto a
  `automatizacionia-stack.github.io/automind-planpiso`, que **responde 404**. `SITE_URL` sí está
  configurado, así que ese respaldo no se usa — queda comprobar que su *valor* apunte a Vercel.
- **⏳ Cinco funciones dependen de `SUPABASE_ANON_KEY`, que el panel ya marca como
  `DEPRECATED`.** Ver [reporte 03 §5](03-LECCIONES-DEL-MVP.md#-una-dependencia-con-fecha-de-caducidad).

---

## 5. Matriz de permisos

Reconstruida desde ~70 comprobaciones de rol dispersas en los `.jsx`. **Todo el control es de
interfaz**: la información viaja completa al navegador y solo se oculta al pintar.

| Capacidad | Vendedor | Gerente | Director | Agency owner | Super admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Ver dashboard | ◐ | ✅ | ✅ | ✅ | ✅ |
| Ver todo el inventario | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver montos financiados e intereses | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver el estado ⚫ "en intereses" | ❌ | ✅ | ✅ | ✅ | ✅ |
| Autoasignarse una unidad | ✅ | ✅ | ❌ | — | — |
| Editar vehículos | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Importar inventario** | **⚠️ Sí** | ✅ | ✅ | ✅ | ✅ |
| Configurar reglas de alerta | ❌ | ✅ | ✅ | ✅ | ✅ |
| Vincular su Telegram | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar el equipo | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver "Datos" y "Editar páginas" | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cargar documentos del cliente | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Validar un pago** | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cambiar el estado del crédito | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cambiar de workspace | ❌ | ◐ | ◐ | ✅ | ✅ |
| Crear agencias / workspaces | ❌ | ❌ | ❌ | ✅ | ✅ |

◐ = parcial · ⚠️ = permiso probablemente no intencionado

**Las tres reglas de negocio que hay que preservar:**

1. **El vendedor no ve el estado ⚫ ni las cifras financieras** — deliberado, ver
   [reporte 01 §4.3](01-DOMINIO.md#43-qué-no-ve-un-vendedor--regla-deliberada).
2. **Segregación de funciones en el pago**: quien captura no valida.
3. **El director no se autoasigna unidades** ([app.jsx:186](../app.jsx#L186)) — coherente con
   su rol de supervisión.

> **Requisito para v2:** estas reglas deben aplicarse **en el servidor**. Hoy son
> exclusivamente visuales.

---

## 6. Los dos flujos completos

### Flujo A — Del Excel a la alerta

```
1. Gerente descarga la plantilla .xlsx
2. Sube el archivo → auto-detección de columnas (con ajuste manual si hace falta)
3. Previsualización → deduplicación por VIN → confirmación
4. Alta masiva (alertas suprimidas) + autoasignación de vendedores
5. El semáforo se calcula en lectura, en cada carga
6. ⏰ Cron diario → detecta cambios de estado → dispara alertas
7. send-alert consulta las reglas del workspace y resuelve la jerarquía
8. Envío por correo / Telegram / WhatsApp según plantilla y rol
9. Registro en alert_log
```

### Flujo B — Del prospecto a la entrega

```
1. Alta del prospecto (manual, o desde una unidad del inventario con "Nuevo cliente")
2. Documentos de identidad → 📄 IA pre-llena los datos
3. Aviso de privacidad → aceptación registrada
4. Prueba de manejo → evidencia y encuesta
5. Cotización: selección de unidad DISPONIBLE + documento leído por IA
   └─ validación cruzada: ¿la unidad del documento es la seleccionada?
6. Aprobación del gerente
7. Solicitud de crédito → carta, solicitud, estado de cuenta, contrato
8. Validación de expediente (con excepción autorizada si procede)
9. Pago: el vendedor captura → gerente/director valida
10. Entrega: fecha, kilometraje, notas
11. La unidad pasa a VENDIDO → sale del plan piso
```

El punto 11 es donde los dos productos se tocan: **cerrar la venta es lo que detiene el reloj
de intereses**. Es el único acoplamiento real entre ambos módulos, y conviene tenerlo presente
al decidir si se separan.

---

## 7. Checklist de paridad para v2

**Imprescindible** (sin esto no es el mismo producto)
- [ ] Semáforo de 5 estados con la especificación del [reporte 01 §3](01-DOMINIO.md#3-el-semáforo--especificación-ejecutable)
- [ ] Detección de cambio de estado y alertas por correo
- [ ] Ejecución diaria programada (los cambios por paso del tiempo son la mayoría)
- [ ] Importación de Excel con tolerancia al desorden real
- [ ] Dashboard con KPIs y filtros cruzados
- [ ] Jerarquía de tres roles con resolución de destinatarios
- [ ] Editor de inventario con desglose de fórmulas
- [ ] Aislamiento entre tenants **verificado con pruebas**
- [ ] Bitácora de alertas

**Importante** (validado por uso, alto valor)
- [ ] Telegram con vinculación de cuenta
- [ ] Plantillas de mensaje editables por rol y canal
- [ ] Organigrama del equipo
- [ ] Invitación de usuarios por correo
- [ ] Branding por agencia
- [ ] Panel de super admin con auditoría

**Sujeto a decisión de producto**
- [ ] Módulo CRM completo — ver [reporte 01 §7.4](01-DOMINIO.md#74-el-crm-es-parte-de-este-producto)
- [ ] Extracción de documentos con IA
- [ ] WhatsApp
- [ ] Jerarquía agencia → workspace (hoy sin ningún caso real que la use)

**No reconstruir**
- [ ] ~~Vista genérica de tablas~~ — herramienta de depuración
- [ ] ~~Panel de personalización en vivo~~ — herramienta de autor
- [ ] ~~Módulo de financieras~~ — muerto desde junio 2026
- [ ] ~~Vista `usuarios` duplicada~~
- [ ] ~~Auto-sanado de asignaciones~~ — parche de datos, no función

**Corregir al reconstruir**
- [ ] Control de rol en la importación
- [ ] Fecha de factura obligatoria, sin relleno inventado
- [ ] Filtrado de datos financieros **en el servidor**, no en el render
- [ ] Una sola implementación del semáforo, compartida

---

*Documento siguiente: [03 · Lecciones del MVP](03-LECCIONES-DEL-MVP.md) — qué falló, por qué,
y el requisito que genera para v2.*
