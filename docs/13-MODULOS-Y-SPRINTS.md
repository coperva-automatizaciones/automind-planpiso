# 13 · Módulos, pantallas y reparto por sprint

> **Propósito.** Inventario exhaustivo de todo lo que existe en el alcance de plan piso, para que
> nadie pregunte por una pantalla, un módulo o un comportamiento que no esté en el plan.
>
> **Fecha:** 14 de agosto de 2026 · **Entrega:** 1 de octubre de 2026 · 33 días hábiles
> **Alcance:** la funcionalidad de plan piso del MVP actual, más las features nuevas de §6.
> Sin integraciones con DMS ni terceros.

**Todo está verificado contra el código**, archivo y línea. Donde la documentación previa decía
otra cosa, se indica.

---

## 1 · Pantallas

### 1.1 Acceso — fuera del armazón de la aplicación

| # | Pantalla | Origen | Contenido |
|---|---|---|---|
| **A1** | Inicio de sesión | `login.jsx:214` | Correo y contraseña |
| **A2** | Recuperar contraseña | `login.jsx:220-236, 495-506` | «¿Olvidaste tu contraseña?» → envío de enlace por correo → confirmación en la misma pantalla |
| **A3** | Establecer contraseña | `login.jsx:4` | Se llega desde el enlace de invitación o de recuperación. Activa la cuenta |
| **A4** | Enlace inválido o expirado | `app.jsx` | Error con salida a inicio de sesión |
| **A5** | Selector de sucursal | `workspace-selector.jsx:226` | Lista de sucursales al entrar. Solo para propietarios de agencia |
| **A6** | Alta de sucursal | `workspace-selector.jsx:119` | Panel lateral desde el selector |

> **Corrección.** Mi versión anterior decía que la recuperación de contraseña no existía. **Sí
> existe** y está completa. Lo que hay que rehacer es el proveedor que la sostiene, no la pantalla.

### 1.2 Armazón

| # | Pieza | Origen | Contenido |
|---|---|---|---|
| **B1** | Barra lateral | `components.jsx:146` | Tres grupos de navegación. Ítems visibles según rol. Versión móvil con panel deslizante y velo |
| **B2** | Barra superior | `components.jsx` | Migas de ruta, identidad, sucursal activa, salir |
| **B3** | Menú de marca | `components.jsx:170` | «Editar páginas» (ALT 1), «Ver datos» (ALT 2), «Volver al inicio» (ALT 0). **No se reimplementa** |
| **B4** | Semáforo | `components.jsx:9` | Componente transversal: cinco estados con color, etiqueta y emoji |
| **B5** | Etiqueta de rol | `components.jsx:17` | Director, gerente, vendedor con su color |
| **B6** | Panel de personalización | `tweaks-panel.jsx` | Color de acento, color de barra lateral, densidad. **No se reimplementa** |

### 1.3 Plan piso

| # | Pantalla | Origen | Contenido |
|---|---|---|---|
| **C1** | **Tablero** | `dashboard.jsx` (793) | Ver desglose abajo |
| **C2** | **Inventario** | `inventario-editor.jsx` (699) | Tabla editable + formulario lateral. Ver desglose abajo |
| **C3** | **Detalle de unidad** | `app.jsx:17` | Panel lateral con semáforo, mensaje contextual por estado y desglose de fórmulas |
| **C4** | **Importar inventario** | `import.jsx` (644) | Asistente de tres pasos. Ver desglose abajo |
| **C5** | **Alertas** | `alertas.jsx` (1 612) | **Cinco** pestañas. Ver desglose abajo |

#### C1 · Tablero — cinco indicadores y siete paneles

**Indicadores** (`dashboard.jsx:717-763`): Total inventario · **Críticas** (⚫ + 🔴, con su
porcentaje) · **Interés acumulado** *(oculto al vendedor)* · Vendidos este mes · Dañados.

**Paneles:** Estado del semáforo (`:68`) · Días promedio en piso por estado (`:132`) · Por modelo
(`:164`) · Antigüedad del inventario (`:219`) · Carga por vendedor (`:247`) · Vendidos del mes
(`:611`) · **Lista detallada** (`:320`) con selección múltiple, asignación de vendedor y apertura
del detalle.

> **Los filtros son cruzados y acumulativos.** Un clic en un segmento del semáforo filtra la lista
> y se combina con los filtros de modelo y de gerente. Es la mitad del valor del tablero y lo más
> fácil de perder al reimplementar.

#### C2 · Inventario — dos secciones, 26 campos

**Datos generales:** INV · VIN · Tipo · Año · Descripción · Color exterior · Color interior ·
Estado físico · Estatus · Observaciones · Estado de venta.

**Plan piso:** Fecha factura · Fecha llegada · Monto financiado · Tasa anual · Días de gracia base
· Días de gracia extra.

**Calculados y de solo lectura:** Días de gracia total · Días en piso · % plan consumido · Días
libres restantes · Días vencidos · Fecha de vencimiento · Interés diario · Interés acumulado ·
Semáforo.

Comportamientos: **autoguardado a 1,5 s**, borrado individual, **borrado masivo por lotes de 100**,
y asignación de varios vendedores por unidad.

#### C4 · Importación — asistente de tres pasos

1. **Zona de arrastre** (`:247`) — Excel o CSV, con detección de delimitador
2. **Mapeo de columnas** (`:301`) — reconocimiento automático por sinónimos, 19 campos con sus alias
3. **Previsualización** (`:374`) — primeras cinco filas antes de confirmar

Más: **descarga de plantilla `.xlsx`** (`:28`), validación de fechas, normalización de porcentajes,
deduplicación por VIN y supresión de alertas durante la carga.

#### C5 · Alertas — cinco pestañas

| Pestaña | Contenido | Quién la ve |
|---|---|---|
| **Reglas** | Una fila por estado del semáforo: a quién notificar y si está activa | Gerente y director |
| **Mensajes** | Editor de plantillas por canal y por rol, con variables sustituibles y asunto | Gerente y director |
| **Telegram** | Vinculación de la cuenta personal con el bot mediante token temporal | **Todos, incluido el vendedor** |
| **WhatsApp** | Activación por regla y teléfonos de gerencia y dirección | Gerente y director |
| **Historial** | Bitácora de envíos desde `alert_log` | Gerente y director |

Más un **panel de envío de prueba** (`:1492`).

> **Corrección.** La documentación previa decía cuatro pestañas. Son **cinco**: faltaba
> **Historial**, que es justamente la que prueba que la alerta se envió.

### 1.4 Configuración y administración

| # | Pantalla | Origen | Contenido |
|---|---|---|---|
| **D1** | **Equipo** | `colaboradores.jsx` (804) | Dos pestañas: **Organigrama** interactivo y **Directorio** con buscador. Botón «+ Agregar usuario» |
| **D2** | Alta y edición de colaborador | `colaboradores.jsx` | Panel lateral: nombre, correo, teléfono, rol, superiores |
| **D3** | Invitaciones | `colaboradores.jsx:405` | Envío, **reenvío** y estado activo o pendiente |
| **D4** | Aviso de privacidad | `colaboradores.jsx:700` | Carga y descarga del documento. Solo directores y propietarios |
| **D5** | **Panel global** | `super-admin.jsx:440` | Lista de agencias, entrada a cualquiera, eliminación |
| **D6** | Alta de agencia | `super-admin.jsx:4` | Razón social, RFC, representante legal |
| **D7** | Sucursales de una agencia | `super-admin.jsx:236` | Modal con las sucursales y entrada directa |
| **D8** | Historial de auditoría | `super-admin.jsx:327` | Bitácora de acciones administrativas |

### 1.5 Fuera del alcance de la fase 1

`crm.jsx` (6 326) · `ventas.jsx` (459) · `database.jsx` (523, descartada para v2) ·
vista `usuarios` (duplica Equipo).

---

## 2 · Comportamientos que no son una pantalla

Se preguntan aunque no se vean en un mapa de pantallas:

| | Comportamiento | Dónde |
|---|---|---|
| **E1** | **Cinco identidades**: director, gerente, vendedor, propietario de agencia y super admin | `db.js:getUserContext` |
| **E2** | **Jerarquía con varios superiores** por persona, que define la cadena de notificación | `db.js:getReportaIds` |
| **E3** | **Varios vendedores por unidad** | `db.js:vendedor_ids` |
| **E4** | **Autoasignación de unidades** por el vendedor | `db.js:asignarVendedorAInventario` |
| **E5** | **Al vendedor se le oculta el estado ⚫** y se le muestra como 🔴 | `app.jsx:29` |
| **E6** | Al vendedor se le ocultan **monto financiado, tasa e interés** | `dashboard.jsx`, `components.jsx:182` |
| **E7** | **Estado de venta** DISPONIBLE / VENDIDO, con fecha | `db.js:estado_venta` |
| **E8** | **Unidades dañadas** — booleano, ya visible en el tablero | `db.js:609` |
| **E9** | Filtros cruzados y acumulativos | `dashboard.jsx` |
| **E10** | Búsqueda en directorio e inventario | `colaboradores.jsx`, `inventario-editor.jsx` |
| **E11** | Densidad cómoda o compacta | `tweaks-panel.jsx` — se conserva solo si se decide |

---

## 3 · Lo que corre en el servidor

No tiene pantalla, y sin ello el producto no cumple su promesa:

| | Función | Qué hace |
|---|---|---|
| **S1** | **Revisión diaria del semáforo** | Recorre todo el inventario cada día, detecta cambios de estado y dispara alertas. **Es el origen de la mayoría de las alertas**, porque la mayoría de los cambios los causa el calendario, no una edición |
| **S2** | **Envío de alerta** | Resuelve destinatarios desde la jerarquía y envía por correo, Telegram y WhatsApp. Escribe la bitácora |
| **S3** | **Invitación de usuario** | Crea la cuenta y envía el enlace de activación |
| **S4** | **Baja de usuario** | Elimina la cuenta de autenticación |
| **S5** | **Vinculación de Telegram** | Token temporal y webhook del bot |

---

## 4 · Promesas visibles que hoy no se cumplen

**Esto es lo que no hay que prometer el 1 de octubre sin decidirlo antes.** Están pintadas en la
interfaz y alguien puede darlas por hechas:

| | Qué se ve | Qué pasa en realidad |
|---|---|---|
| **X1** | **Selector de período** en el encabezado del tablero | Está pintado, muestra el mes actual y **no despliega nada** |
| **X2** | Vista de **Configuración del workspace** (`app.jsx:860`) | Dice «En construcción» y promete *umbrales del semáforo, notificaciones y ajustes del plan piso*. **No tiene entrada de menú y no hace nada** |
| **X3** | Subtítulo del tablero: *«Estado general de tus agentes y procesos»* | La pantalla solo muestra inventario. Es lenguaje de la visión de agentes |
| **X4** | **Verificación de contacto** | Sin credenciales de Twilio configuradas, solo valida el formato del número: no comprueba que exista |

> **X2 merece una decisión explícita.** Que los umbrales del semáforo sean configurables por
> agencia es una expectativa razonable y está escrita en el producto. Hoy son constantes en el
> código. O entra en el alcance, o se retira la promesa.

---

## 5 · Reparto por sprint

Siete semanas, cada una cerrando en algo verificable. **El reparto es orientativo: si un módulo
cae en otra semana no pasa nada, mientras el entregable de cada una se sostenga.**

| Semana | Módulos | Entregable | En pantalla |
|---|---|---|---|
| **17 – 21 ago** | Repositorio, compilación, integración continua, módulo de dominio con los 23 vectores. En paralelo: cuenta en la nube, dominio y **solicitud del servicio de correo** | Las pruebas del semáforo corren en verde | **Nada** |
| **24 – 28 ago** | Esquema, migraciones, aislamiento entre clientes con sus pruebas · **A1–A4** · **B1, B2, B4, B5** · **E1, E2** · modelo de permisos dirigido por datos (§6.4) | Se inicia sesión con los tres roles y se navega | Acceso completo y armazón con menú por rol |
| **31 ago – 4 sep** | API de inventario · **C2, C3** · **E3, E5, E6, E7, E8** · ciclo de vida al vender (§3.9) | Se ve y se edita el inventario con el semáforo correcto | Inventario editable y panel de detalle con desglose |
| **7 – 11 sep** | **C1, C4, D1–D4** · **E4, E9, E10** · correo de bienvenida al alta de agencia (§3.1) | Se carga un Excel real y el tablero lo refleja | Tablero completo, importador y equipo |
| **14 – 18 sep** *(corta, festivo el 16)* | **C5** · **S1, S2, S3, S5** · alerta de unidades dañadas (§3.6) | Un cambio de estado dispara un correo real | Alertas con sus cinco pestañas |
| **21 – 25 sep** | **D5–D8** en versión mínima · resolución de §4 · margen | Las promesas de §4 resueltas | Depende de lo que se decida |
| **28 sep – 1 oct** | Datos de piloto, endurecimiento, despliegue | Plan piso funcional en producción | Nada nuevo |

**Notas del reparto:**

- **La semana 1 no produce ninguna pantalla.** Conviene anunciarlo antes, no explicarlo después.
- La **semana 2** es el primer hito visible.
- Al terminar la **semana 4** el producto ya se puede demostrar.
- La **semana 5** depende de que el servicio de correo esté aprobado. Es la única dependencia
  externa del plan.
- La **semana 6** es la única recortable.

---

## 6 · Alcance aumentado — qué entra y qué no

Evaluado contra el *Documento de Alcance Aumentado v1.0*. **Se comprometen únicamente los puntos
que entran completos**, sin recortes ni definiciones pendientes.

### 6.1 Comprometido para el 1 de octubre

| § | Qué pide | Estado hoy |
|---|---|---|
| **3.1** | Correo de bienvenida al crear una agencia | La función de invitación ya existe; falta el disparo automático al alta |
| **3.1** | **Sin visibilidad cruzada entre agencias** | Es el aislamiento entre clientes. Ya es núcleo del plan, semana 2 |
| **3.1** | Permisos diferenciados por rol sobre datos sensibles | Ya existe: al vendedor se le ocultan monto, tasa e interés |
| **3.6** | **Alertas por unidades dañadas**, con seguimiento visible | El campo existe (`db.js:609`), el tablero ya las cuenta y el motor de alertas ya está |
| **3.9** | **Ciclo de vida de la unidad al venderse** | `estado_venta` existe. Se añade: confirmación por el rol con permiso, paso al registro de vendidas, y retiro del inventario disponible |

> **§3.9 cierra una pregunta que llevaba abierta desde `docs/01`**: una unidad sale del plan piso
> cuando el rol con permiso de verificación confirma la venta. Con eso el modelo de dominio queda
> completo.

### 6.2 Fuera de la fase 1

| § | Qué pide | Por qué no entra |
|---|---|---|
| **3.2** | **Integración con el DMS (W32)** | El propio documento deja el método sin definir —API o archivo—, y W32 no publica interfaz. El acceso a los datos del DMS es además una negociación comercial con plazos que no controlamos ([`docs/12`](12-DMS-E-INTEGRACION.md) §5). **No depende de nosotros** |
| **3.3** | Módulo de IA predictiva de intereses | Excluido por el propio documento (§9). Ver 6.3 |
| **3.4** | Catálogo de demos y **calendario de asignación** | El catálogo es un campo; el calendario es un módulo de reservas con su interfaz, gestión de conflictos y modelo propio. No entra completo |
| **3.5** | Trazabilidad de ubicación | Requiere catálogo de ubicaciones, asignación por unidad **e historial de movimientos**. Es un módulo nuevo, no un campo |
| **3.7** | Comprobante de apartado y aprobación | Introduce **almacenamiento de documentos en plan piso**, que hoy no existe: bucket, URLs firmadas, control de acceso y bitácora. Más un estado nuevo de unidad y un flujo de aprobación |
| **3.8** | **Pedido sugerido** | Pide sugerir compras *«con base en el comportamiento histórico de ventas»*. **El 1 de octubre la plataforma tendrá cero historial.** Aunque se construyera, no tendría nada que analizar. No es esfuerzo: es que el insumo no existe |
| **3.1** | Completar el catálogo de roles | *«Se irá construyendo conforme implementemos el piloto»*. **Un requisito sin frontera no puede tener fecha.** Ver 6.4 |

### 6.3 La parte de §3.3 que sí se puede entregar

El documento pide *«estimar cuánto se pagará de interés por unidad si continúa en inventario sin
venderse, proyectando distintos escenarios de tiempo»* y lo etiqueta como módulo de IA.

**Eso no necesita ningún modelo.** Tasa, saldo y días ya están: «si esta unidad sigue 30, 60 o 90
días más, costará X» es aritmética determinista sobre la fórmula que ya existe, y además es
verificable — que es lo que un número financiero necesita.

Queda **propuesto como añadido de bajo costo**, no comprometido, porque no es lo que el documento
pide. Si se acepta, es de las mejores relaciones entre valor y esfuerzo de todo el alcance.

### 6.4 Lo que sí conviene hacer aunque el catálogo de roles quede fuera

No se compromete ampliar los roles, pero sí **construir el modelo de permisos dirigido por datos
desde el primer día**, para que añadir un rol durante el piloto sea configuración y no un cambio
de código. Se entrega con los roles conocidos y crece sin tocar el producto.

Es trabajo de diseño, no de alcance: no añade pantallas ni semanas.

### 6.5 Dos consecuencias que simplifican el plan

Al quedar fuera §3.7 y §3.9 en su último punto —*la documentación se mueve junto con el registro
de venta*—, **el almacenamiento de archivos sale por completo del alcance de plan piso**. No hay
documentos adjuntos a unidades, así que no hay nada que mover.

Y al quedar fuera §3.4b, **no entra ningún módulo de calendario**, que es de los componentes de
interfaz que más caros salen respecto a lo que aparentan.

Las dos exclusiones liberan la semana 6, que era la única recortable del plan.

---

## 7 · Decisiones abiertas que mueven el reparto

| Decisión | Afecta a | Por qué importa |
|---|---|---|
| **Un solo nivel de tenant** | **A5, A6** | Si «ver varias agencias» es un permiso y no una jerarquía, el selector de sucursal desaparece y se sustituye por un cambio de alcance en la barra superior. **Son dos pantallas menos** |
| **Alcance del panel global** | **D5–D8** | Para un piloto puede bastar con crear la agencia por datos semilla |
| **¿Registro autoservicio?** | **A1, A3** | El MVP no lo tiene: se entra por invitación. Si hace falta registro abierto, es un módulo nuevo |
| **Canales de la fase 1** | **C5, S2** | Correo y Telegram están cubiertos. WhatsApp requiere aprobación de plantillas por Meta, con su propio plazo |
| **Umbrales configurables** | **X2** | Hoy son constantes en el código y la interfaz promete lo contrario |
| **¿Se conserva la densidad?** | **B6, E11** | El panel de personalización se descarta; la densidad puede sobrevivir como preferencia |

---

## 8 · Resumen para no dejar huecos

**23 pantallas y paneles** en el alcance: 6 de acceso, 6 de armazón, 5 de plan piso —con sus 12
sub-paneles— y 8 de configuración y administración.
**11 comportamientos transversales** que no son pantalla.
**5 funciones de servidor**, sin las cuales no hay alertas.
**4 promesas visibles** que hay que cumplir o retirar.
**5 puntos del alcance aumentado comprometidos** y **7 fuera de la fase 1**, cada uno con su
razón escrita.

**Nada de lo comprometido depende de un tercero, de una definición pendiente ni de datos que
todavía no existen.** Esa es la condición que hace defendible la fecha.

---

*Documento de trabajo. Jose Santiago · Full Stack Lead · 14 de agosto de 2026.*
