# 01 · Dominio de negocio — Especificación

> **Propósito de este documento.** Es la especificación de dominio para reconstruir el
> producto. Todo lo que contiene fue extraído del código del MVP y verificado línea por
> línea; está escrito para sobrevivir a ese código y poder implementarse en cualquier stack.
> Si algo de aquí contradice al `README.md` o al `CLAUDE.md` del repositorio, este documento
> tiene razón: aquellos están desactualizados.

---

## TL;DR ejecutivo

Una agencia automotriz **no compra** los autos que tiene en el piso de exhibición: los
financia con un banco. Ese crédito viene con un **periodo de gracia** — típicamente 30 días
— durante el cual la agencia no paga intereses. Si el auto se vende dentro de ese plazo, el
financiamiento sale gratis. Si no se vende, a partir del día 31 **cada auto parado empieza a
costar dinero todos los días**, y ese costo sale directo del margen de la venta.

El problema real es que ese costo es invisible. Nadie en la agencia siente el día en que una
unidad cruzó la línea; simplemente el margen aparece más flaco al cierre del mes. Con 50 o
100 unidades en piso, nadie lleva la cuenta a mano.

**Automind · Plan Piso convierte ese plazo invisible en una señal de color.** Cada vehículo
tiene un semáforo de cinco estados que indica cuánto plan de gracia lleva consumido, y cuando
una unidad cambia de estado el sistema avisa por correo, Telegram o WhatsApp al vendedor, a
su gerente y al director. La promesa del producto cabe en una frase: **ninguna unidad empieza
a generar intereses en silencio.**

Alrededor de esa función central creció un segundo módulo — un CRM de proceso de venta de
ocho etapas, con expediente digital del cliente y extracción de documentos con IA — que hoy
es una cuarta parte del código.

**Lo que necesitas decidir antes de construir** está en la sección
[Ambigüedades del dominio](#ambigüedades-del-dominio-que-requieren-decisión): son cuatro
preguntas que el MVP responde de forma contradictoria consigo mismo.

---

## 1. El negocio: qué es el "plan piso"

### El modelo de financiamiento

| Concepto | Qué significa |
|---|---|
| **Plan piso** (*floor plan financing*) | Línea de crédito con la que la agencia financia su inventario de exhibición. El banco paga la unidad al fabricante; la agencia la debe. |
| **Días de gracia** | Periodo inicial sin intereses. Es el incentivo del banco para que la agencia rote inventario rápido. |
| **Monto financiado** | Lo que la agencia debe por esa unidad concreta. |
| **Tasa** | Interés anual sobre el monto financiado, aplicable **solo después** de agotados los días de gracia. |
| **Interés acumulado** | El costo real que esa unidad ya generó. Sale del margen de la venta. |

### La pregunta que el usuario trae a la pantalla

> *"¿Qué unidad está por costarme dinero — o ya me está costando — y quién debe actuar?"*

No es una pregunta analítica ni de reporteo mensual. Es operativa y diaria. De ahí que el
producto sea un semáforo y no un dashboard de métricas: la respuesta útil es **qué hacer hoy**.

### Los tres roles y por qué existen

La cadena de mando de una agencia automotriz mexicana se refleja directamente en el modelo:

| Rol | Qué le importa | Qué ve |
|---|---|---|
| **Vendedor** | Sus unidades asignadas. Cuáles debe empujar primero. | Solo su inventario. **No ve montos financiados, intereses ni el estado "en intereses"** (ver §4.3). |
| **Gerente** | Su equipo de vendedores y las unidades a su cargo. | Todo el inventario del workspace, con cifras financieras. |
| **Director** | El riesgo financiero agregado de la agencia. | Todo, más la visión de varias sucursales si aplica. |

La jerarquía es explícita y **determina a quién se notifica**: cada usuario declara a quién
reporta, y una alerta sobre una unidad sube por esa cadena desde el vendedor asignado.

---

## 2. Glosario operativo

Términos que vas a oír en la agencia y que aparecen en el código. Se conservan **en español**
en el modelo de datos: es vocabulario de negocio, no de programación.

| Término | Definición precisa | Notas |
|---|---|---|
| **Días en piso** | Días transcurridos desde la **fecha de factura**. | Ver §3.2 para el ajuste de −1. |
| **Días de gracia base** | Los que otorga el plan estándar del banco. Default de importación: **30**. | |
| **Días de gracia extra** | Extensión negociada caso por caso. | Se suman a la base. |
| **Días de gracia total** | `base + extra`. | Es el denominador del semáforo. |
| **Días libres restantes** | `graciaTotal − diasEnPiso`. Puede ser negativo. | Negativo = días ya en intereses. |
| **Días vencidos** | `max(0, −díasLibresRestantes)`. | Multiplicador del interés. |
| **% de plan consumido** | `diasEnPiso / graciaTotal × 100`. | **Determina el semáforo.** |
| **Interés diario** | `montoFinanciado × tasa / 365`. | Ver §3.3 sobre el redondeo. |
| **Interés acumulado** | `díasVencidos × interésDiario`. | El costo real ya incurrido. |
| **Fecha factura** | Cuándo el banco empezó a financiar la unidad. | **Es el origen del reloj.** |
| **Fecha llegada** | Cuándo llegó físicamente la unidad al piso. | Informativa; *no* alimenta el cálculo. |
| **Estatus** | Condición comercial: `NUEVOS`, seminuevo, etc. | Default `NUEVOS`. |
| **Estado de venta** | `DISPONIBLE` \| `VENDIDO` \| (apartado). | Distinto de *estatus*. Ver §5.1. |
| **Dañado** | Unidad con daño físico. Booleano. | Afecta vendibilidad, no el semáforo. |
| **VIN** | Identificador único del vehículo. | Llave natural del negocio. |
| **INV** | Folio interno de inventario de la agencia. | Convive con el VIN. |

> ⚠️ **Fecha factura vs. fecha llegada.** El reloj corre desde la **factura**, no desde la
> llegada física. Es correcto: el banco cobra desde que financia, no desde que el auto se
> estaciona. El MVP originalmente usaba fecha de llegada y se corrigió deliberadamente
> ([import.jsx:168-170](../import.jsx#L168) documenta el cambio).

---

## 3. El semáforo — especificación ejecutable

Esta es **la regla que decidiste conservar**. Está escrita para que puedas implementarla y
testearla el día uno, en cualquier lenguaje, sin abrir el código viejo.

### 3.1 Los cinco estados

| Estado | Clave | % plan consumido | Emoji | Etiqueta de UI | Color |
|---|---|---|---|---|---|
| Saludable | `saludable` | `≤ 61` | 🟢 | "Margen saludable" | `#1f9d57` |
| Rotación media | `rotacion` | `> 61` | 🟡 | "Rotación media" | `#d99613` |
| Comprometido | `comprometido` | `> 76` | 🟠 | "Margen comprometido" | `#e07a20` |
| Próximo a vencer | `vencer` | `> 86` | 🔴 | "Próximo a vencer" | `#e0492f` |
| En intereses | `intereses` | `> 100` | ⚫ | "En intereses" | `#2d3142` |

Fuente: [components.jsx:8-14](../components.jsx#L8).

> **Los umbrales son exclusivos (`>`), no inclusivos.** Consecuencia no obvia: una unidad con
> exactamente **100 %** de plan consumido — el último día de gracia — se clasifica como
> `vencer` (🔴), **no** como `intereses` (⚫). Es correcto: ese día todavía no genera interés.

### 3.2 Algoritmo canónico

```
CONSTANTES
  MS_DIA = 86_400_000

ENTRADAS
  fechaFactura     : fecha (puede faltar)
  diasGraciaBase   : entero ≥ 0
  diasGraciaExtra  : entero ≥ 0
  montoFinanciado  : decimal ≥ 0
  tasa             : decimal — fracción anual (0.14 = 14 %)

CÁLCULO
  1.  fFact       = fechaFactura ?? (hoy − 7 días)          # ver nota A
  2.  diasEnPiso  = max(0, round((hoy − fFact) / MS_DIA) − 1)   # ver nota B
  3.  graciaTotal = diasGraciaBase + diasGraciaExtra
  4.  diasLibres  = graciaTotal − diasEnPiso
  5.  diasVencidos= diasLibres < 0 ? |diasLibres| : 0
  6.  interesDiario = round2(montoFinanciado × tasa / 365)   # ver nota C
  7.  interesAcum   = round2(diasVencidos × interesDiario)
  8.  pctPlan = graciaTotal > 0
                  ? round(diasEnPiso / graciaTotal × 100)
                  : (diasEnPiso > 0 ? 101 : 0)               # ver nota D ⚠️
  9.  semaforo = pctPlan > 100 → "intereses"
               | pctPlan >  86 → "vencer"
               | pctPlan >  76 → "comprometido"
               | pctPlan >  61 → "rotacion"
               | otro          → "saludable"
```

Implementación de referencia: [app.jsx:267-303](../app.jsx#L267).

**Nota A — fecha de factura ausente.** El MVP asume `hoy − 7 días`. Es un valor de relleno
arbitrario que fabrica datos plausibles pero falsos. **Recomendación para v2:** tratar la
fecha de factura ausente como estado explícito `sin_datos`, no semaforizable, y exigirla en
la importación. Un semáforo inventado es peor que un hueco visible.

**Nota B — el ajuste de −1.** Una unidad facturada ayer tiene 0 días en piso, no 1. El día de
la factura no cuenta como día consumido. La resta se hace **después** del redondeo.

**Nota C — el redondeo del interés.** El interés diario se redondea a centavos *antes* de
multiplicarse por los días vencidos, así que el error de redondeo se multiplica. Con 200 días
vencidos la desviación puede llegar a ~$1.00 respecto al cálculo exacto. **Recomendación
para v2:** calcular a precisión completa (decimal, no punto flotante) y redondear solo al
mostrar. En un producto cuyo output es dinero, esto importa.

**Nota D — el caso sin días de gracia.** ⚠️ **Aquí el MVP se contradice a sí mismo.** Ver
[§7](#ambigüedades-del-dominio-que-requieren-decisión). Cuatro implementaciones devuelven
`101` (⚫ en intereses) y dos devuelven `0` (🟢 saludable).

### 3.3 Vectores de prueba

Conviértelos en tu primera test suite. Usan `diasEnPiso` directamente para no depender de la
fecha del sistema; añade aparte dos casos que ejerciten el paso 2.

**Grupo A — umbrales del semáforo** (`graciaBase = 30`, `graciaExtra = 0`)

| # | diasEnPiso | pctPlan | Semáforo esperado | Por qué importa |
|---|---|---|---|---|
| A1 | 0 | 0 | `saludable` | Unidad recién facturada |
| A2 | 18 | 60 | `saludable` | Justo debajo del primer corte |
| A3 | 19 | 63 | `rotacion` | Primer cruce (63 > 61) |
| A4 | 22 | 73 | `rotacion` | Justo debajo del segundo corte |
| A5 | 23 | 77 | `comprometido` | Segundo cruce (77 > 76) |
| A6 | 25 | 83 | `comprometido` | Justo debajo del tercero |
| A7 | 26 | 87 | `vencer` | Tercer cruce (87 > 86) |
| A8 | 30 | 100 | `vencer` | **Último día de gracia: aún no es ⚫** |
| A9 | 31 | 103 | `intereses` | Primer día con costo real |
| A10 | 60 | 200 | `intereses` | Muy vencida |

**Grupo B — días de gracia extra** (`graciaBase = 30`, `graciaExtra = 15` → total 45)

| # | diasEnPiso | pctPlan | Semáforo esperado |
|---|---|---|---|
| B1 | 30 | 67 | `rotacion` |
| B2 | 40 | 89 | `vencer` |
| B3 | 46 | 102 | `intereses` |

**Grupo C — cálculo de interés** (`montoFinanciado = 500 000`, `tasa = 0.14`, `gracia = 30`)

`interesDiario = round2(500000 × 0.14 / 365) = round2(191.780821…) = 191.78`

| # | diasEnPiso | diasVencidos | interesAcum esperado |
|---|---|---|---|
| C1 | 20 | 0 | `0.00` |
| C2 | 30 | 0 | `0.00` |
| C3 | 31 | 1 | `191.78` |
| C4 | 45 | 15 | `2 876.70` |
| C5 | 130 | 100 | `19 178.00` |

> C5 expone la Nota C: el valor exacto sería `19 178.0821…`; el algoritmo del MVP da
> `19 178.00`. Documenta cuál de los dos quieres en v2 **antes** de escribir el código.

**Grupo D — casos borde**

| # | Entrada | pctPlan | Semáforo | Comentario |
|---|---|---|---|---|
| D1 | gracia = 0, diasEnPiso = 0 | 0 | `saludable` | Coinciden todas las implementaciones |
| D2 | gracia = 0, diasEnPiso = 5 | **101 o 0** | **`intereses` o `saludable`** | ⚠️ **Decisión pendiente** |
| D3 | fechaFactura = hoy | 0 | `saludable` | `max(0, …)` evita negativos |
| D4 | fechaFactura = mañana | 0 | `saludable` | Fecha futura no rompe el cálculo |
| D5 | monto = 0, 60 días vencidos | — | `interesAcum = 0.00` | Sin monto no hay interés |

---

## 4. Reglas de negocio más allá del cálculo

### 4.1 Cuándo se dispara una alerta

Una alerta se emite **solo cuando el semáforo cambia de estado**, no en cada guardado. El
sistema persiste el último estado conocido (`semaforo_snapshot`) y lo compara contra el
recién calculado ([db.js:304-348](../db.js#L304)).

Dos disparadores independientes:

1. **Al guardar un vehículo** — cambio inmediato tras una edición manual.
2. **Cron diario** — recorre todo el inventario no vendido y detecta los cruces que ocurren
   por el simple paso del tiempo. **Este es el importante**: la mayoría de los cambios de
   semáforo no los causa una edición, los causa el calendario.

Excepción deliberada: la **importación masiva de Excel** suprime las alertas
(`skipAlert`), para no disparar cientos de correos al cargar un inventario nuevo.

> **Requisito para v2.** El disparo por paso del tiempo es la mitad del producto. Un
> vehículo que cruza a ⚫ un domingo debe notificarse, aunque nadie abra la aplicación. La
> arquitectura tiene que garantizar ejecución programada fiable, con reintentos y bitácora.

### 4.2 A quién se notifica

Se resuelve por la jerarquía, partiendo de los vendedores asignados a la unidad:

```
unidad → vendedores asignados (N) → sus gerentes (N) → los directores de esos gerentes (N)
```

Un usuario puede reportar a **varios** superiores (`reporta_ids`, array). El campo antiguo
`reporta_a` (uno solo) sigue existiendo por compatibilidad — en v2 debe quedar solo el array.

Por cada estado del semáforo, cada workspace configura una regla con:
`notify_vendedor` · `notify_gerente` · `notify_director` · `activa`, más plantillas de mensaje
por canal y por rol. Defaults al crear un workspace: alertas activas para
`comprometido`, `vencer` e `intereses`; apagadas para `saludable` y `rotacion`
([db.js:141-149](../db.js#L141)) — refleja bien la intención: solo avisar cuando importa.

### 4.3 Qué NO ve un vendedor — regla deliberada

Esto es diseño de producto, no un bug, y **debe preservarse en v2**:

- **El estado ⚫ "en intereses" se le oculta al vendedor**: se le muestra como 🔴 "por vencer"
  ([app.jsx:29](../app.jsx#L29)).
- Tampoco ve **monto financiado**, **tasa**, **interés acumulado** ni **% de plan consumido**
  ([app.jsx:95-124](../app.jsx#L95)).
- En la tarjeta de días restantes, donde un gerente lee "Vencido", el vendedor lee "—".

**La lógica de negocio detrás:** el costo financiero es información de la agencia, no del
vendedor; y decirle que la unidad "ya está perdida" desincentiva empujarla. Lo que el vendedor
necesita es urgencia, no contabilidad.

> ⚠️ **Advertencia de implementación.** En el MVP esto es **solo ocultamiento en la interfaz**:
> los datos financieros viajan completos al navegador del vendedor y son visibles en las
> herramientas de desarrollador. Si esta regla importa de verdad, en v2 el filtrado debe
> ocurrir **en el servidor**, no en el render.

### 4.4 Asignación de vendedores

- Una unidad admite **varios** vendedores (`vendedor_ids`).
- Un vendedor solo ve las unidades asignadas a él **más las que no tienen asignación**
  ([app.jsx:485-490](../app.jsx#L485)).
- Al dar de alta un vendedor, el sistema lo asigna automáticamente a **todo el inventario
  activo** ([db.js:525-548](../db.js#L525)), y en cada carga de workspace corre un proceso
  de "auto-sanado" que asigna todos los vendedores a las unidades huérfanas
  ([app.jsx:524-551](../app.jsx#L524)).

> **Esto merece revisión de producto.** El auto-sanado es un parche para datos inconsistentes
> que se ejecuta en cada login y escribe en la base de datos en segundo plano. Convierte
> "todos ven todo" en el estado por defecto, lo que vacía de sentido la asignación. En v2:
> decide si la asignación es real (y entonces las unidades sin asignar necesitan un dueño
> explícito) o si no lo es (y entonces elimina el concepto).

### 4.5 Vehículos vendidos

Las unidades `VENDIDO` de **meses anteriores** se excluyen de las vistas; las del mes en
curso permanecen visibles para el reporte de "vendidos del mes"
([app.jsx:474-482](../app.jsx#L474)). El cron también las excluye: una unidad vendida ya no
genera plan piso.

---

## 5. Modelo de información

Descrito por **significado**, no por implementación. El MVP lo materializó en PostgreSQL con
Supabase, pero nada aquí obliga a esa elección.

### 5.1 Entidades

```
Agencia (tenant raíz)
  └── Workspace (sucursal / punto de operación)
        ├── Usuario         (director | gerente | vendedor, con jerarquía)
        ├── Vehículo        (la unidad en plan piso)
        ├── Regla de alerta (una por estado del semáforo)
        ├── Cliente         (prospecto en el pipeline de venta)
        └── Bitácora de alertas
```

| Entidad | Qué representa | Identidad natural |
|---|---|---|
| **Agencia** | El cliente contratante. Datos legales: razón social, RFC, representante legal. | RFC |
| **Workspace** | La sucursal que opera día a día. Branding propio, aviso de privacidad propio. | — |
| **Usuario** | Colaborador con rol y jerarquía. | `(email, workspace)` |
| **Vehículo** | Unidad financiada. Datos físicos, financieros y de asignación. | VIN |
| **Cliente** | Prospecto con expediente y etapa. ~90 atributos. | — |
| **Regla de alerta** | Política de notificación por estado y canal. | `(workspace, semáforo)` |
| **Bitácora** | Evidencia de qué se envió, a quién y con qué resultado. | — |

> **Observación con peso para v2.** En producción hay **4 agencias con exactamente un
> workspace cada una** (verificado). La jerarquía de dos niveles **nunca se ejercitó con un
> caso real**. Antes de reconstruirla, confirma con negocio si un cliente va a tener varias
> sucursales bajo la misma razón social. Si la respuesta es "aún no", un solo nivel de tenant
> con posibilidad de crecer después es más barato y elimina toda una clase de bugs — en el
> MVP, la ambigüedad `workspace_id || agency_id` está esparcida por toda la capa de datos.

### 5.2 Atributos del vehículo

| Grupo | Campos |
|---|---|
| Identificación | `vin`, `inv`, `marca`, `modelo`, `anio`, `descripcion`, `tipo` |
| Físicos | `colorExterior`, `colorInterior`, `danado` |
| Financieros | `montoFinanciado`, `pctInteres`, `diasGraciaBase`, `diasGraciaExtra` |
| Temporales | `fechaFactura`, `fechaLlegada`, `fechaVenta` |
| Comerciales | `estatus`, `estadoVenta`, `observaciones`, `fotoUrl` |
| Asignación | `vendedorIds[]` |
| Derivado persistido | `semaforoSnapshot` — último estado notificado |

**Todo lo demás se calcula en lectura** y no se almacena: días en piso, interés acumulado,
% de plan consumido y el semáforo. La única excepción es `semaforoSnapshot`, que existe
exclusivamente para detectar cambios de estado. Es una decisión sensata que **conviene
conservar**: el semáforo es función del tiempo, y almacenarlo lo dejaría obsoleto cada
medianoche.

### 5.3 Datos personales — obligaciones regulatorias

El módulo de clientes maneja PII regulada por la **LFPDPPP** mexicana. Esto no es un detalle
de implementación: es una obligación legal que condiciona la arquitectura.

Se almacenan: nombre, teléfono, correo, **CURP**, **RFC**, fecha de nacimiento, sexo,
domicilio completo, número y vigencia de licencia de conducir; y como archivos: **INE**,
licencia, comprobante de domicilio, constancia de RFC, comprobantes de pago, estados de
cuenta bancarios y expediente de prevención de lavado de dinero.

Requisitos que esto impone a v2:

- **Aviso de privacidad** por workspace, versionado y con constancia de aceptación por
  cliente. El MVP ya lo contempla (con un genérico de respaldo).
- **Cifrado en reposo** y acceso por URL firmada de vida corta — nunca URL pública.
- **Bitácora de acceso** a documentos: quién vio qué y cuándo.
- **Política de retención y borrado**, incluido el derecho de supresión (ARCO).
- **Aislamiento entre tenants demostrable con pruebas automatizadas.** Es el requisito duro:
  el expediente de un cliente de una agencia no puede alcanzarse desde otra, y eso debe
  verificarse en cada despliegue, no auditarse a mano.

> El MVP acertó en lo esencial aquí: el almacenamiento de documentos está correctamente
> cerrado y usa URLs firmadas. Verificado por sondeo directo — un cliente anónimo no puede
> listar, leer ni firmar objetos del bucket.

---

## 6. El pipeline comercial (módulo CRM)

Ocho etapas, definidas en [crm.jsx:4-7](../crm.jsx#L4):

```
Prospección → Perfilamiento → Presentación → Cotización → Expediente → Crédito → Pago → Cierre
```

| Etapa | Qué ocurre | Artefactos |
|---|---|---|
| **Prospección** | Alta del prospecto: canal de origen, interés, presupuesto. | Encuesta de preferencias |
| **Perfilamiento** | Datos personales y documentos de identidad. | INE, licencia, domicilio, RFC, **aviso de privacidad firmado** |
| **Presentación** | Prueba de manejo. | Evidencia y encuesta post-prueba |
| **Cotización** | Selección de unidad del inventario y condiciones. | Documento de cotización (**leído por IA**) |
| **Expediente** | Aprobación del gerente y cumplimiento normativo. | Expediente de lavado de dinero, acta de conformación |
| **Crédito** | Solicitud ante la institución financiera. | Carta de aprobación, solicitud, estado de cuenta, contrato |
| **Pago** | Registro y **validación** del pago. | Comprobantes (varios, con monto); validación restringida a gerente/director |
| **Cierre** | Entrega de la unidad. | Fecha, kilometraje, notas de entrega |

Reglas transversales:

- **Vínculo con el inventario.** Al cotizar se elige una unidad real; solo se ofrecen las
  `DISPONIBLE` ([app.jsx:200-205](../app.jsx#L200)). Aquí se cierra el círculo con el plan
  piso: vender la unidad correcta es lo que detiene el reloj de intereses.
- **Segregación de funciones.** El vendedor captura el pago; **solo gerente o director lo
  validan** (`pago_validado_por`, `pago_validado_en`). Es un control interno real, no un
  permiso cosmético.
- **Excepciones autorizadas.** La validación de expediente admite excepción explícita
  (`e7_excepcion_auth` + nota justificativa) — refleja cómo opera de verdad una agencia.
- **Historial de actividad** automático por cliente ante cambios de etapa, estado y asignación.

### Extracción de documentos con IA

El usuario sube una foto o PDF y el sistema pre-llena el formulario. Siete extractores
especializados: identificación, licencia, comprobante de domicilio, RFC, cotización,
comprobante de pago y solicitud de crédito.

> **Corrección de la documentación existente:** el `README.md` dice que usa Anthropic Claude.
> **No es cierto.** El código llama a **OpenAI `gpt-4o`**, con la clave guardada bajo un
> secreto engañosamente llamado `ANTHROPIC_API_KEY`
> ([extract-document/index.ts:153](../supabase/functions/extract-document/index.ts#L153)).

En v2 esto es una decisión abierta de proveedor y de costo. La extracción tiene además una
validación cruzada útil que conviene conservar: al leer una cotización, compara la unidad
detectada contra la seleccionada y advierte si no coinciden.

---

## 7. Ambigüedades del dominio que requieren decisión

Cuatro preguntas que el MVP responde de forma contradictoria consigo mismo. **Son decisiones
de producto tuyas**; las dejo planteadas, no resueltas.

### 7.1 ⚠️ Unidad sin días de gracia configurados — ¿🟢 o ⚫?

**El conflicto.** Siete implementaciones del semáforo conviven en el MVP y no coinciden:

| Implementación | `graciaTotal = 0` y `diasEnPiso > 0` |
|---|---|
| [app.jsx:284](../app.jsx#L284), [db.js:283](../db.js#L283), [import.jsx:178](../import.jsx#L178), `daily-semaforo-check` | `pct = 101` → ⚫ **intereses** |
| [inventario-editor.jsx:33](../inventario-editor.jsx#L33), [login.jsx:307](../login.jsx#L307) | `pct = 0` → 🟢 **saludable** |

**Efecto observable hoy:** la misma unidad aparece 🟢 al iniciar sesión y ⚫ al recargar la
página — porque el login y la recarga usan pipelines distintos. Y aparece 🟢 en el editor
mientras el tablero la muestra ⚫.

**Las tres lecturas posibles:**

1. **Es dato faltante.** Nadie capturó los días de gracia. Marcar `sin_datos`, excluir de los
   conteos y exigir la corrección. *Es la más honesta: no inventa una señal.*
2. **Es una unidad sin plan.** No tiene financiamiento con gracia, luego genera interés desde
   el día 1 → ⚫ es correcto.
3. **No aplica.** La unidad no está en plan piso (pagada de contado) y no debería semaforizarse.

**Recomendación:** distinguir en el modelo entre *"sin plan piso"* y *"días de gracia no
capturados"*. Son situaciones de negocio distintas que el MVP colapsa en un mismo `0`, y
esa colisión es la raíz del conflicto. Con eso, la regla se vuelve obvia en cada caso.

### 7.2 ¿El reloj corre desde la factura o desde la llegada?

Ya resuelto **a favor de la factura**, deliberadamente. Pero el MVP conserva `fechaLlegada`
como campo informativo y hubo una migración explícita al respecto. **Confirma con negocio**
que el banco efectivamente cobra desde la factura en todos los contratos de plan piso — si
algún banco cuenta desde la recepción de la unidad, el modelo necesita que el origen del
reloj sea configurable por agencia.

### 7.3 ¿El interés se calcula en lectura o se materializa?

Hoy: **en lectura**, siempre. Ventaja: nunca queda obsoleto. Desventaja: no hay registro
histórico — no puedes responder *"¿cuánto interés habíamos acumulado el 30 de junio?"*, y el
cierre contable de un mes cambia si lo consultas después.

**Recomendación:** conservar el cálculo en lectura para la operación diaria **y** añadir una
foto diaria inmutable por unidad para reportes históricos. El cron ya recorre todo el
inventario cada día; capturar la foto ahí es casi gratis.

### 7.4 ¿El CRM es parte de este producto?

El módulo de clientes es **el 25 % del código** y no aparece en ninguna documentación de
producto. Tiene su propio ciclo de vida, sus propios usuarios y su propia complejidad
regulatoria. Convive con el plan piso solo en un punto: la selección de unidad al cotizar.

**Es una decisión de producto que antecede a la de arquitectura.** Si son un solo producto,
comparten modelo de datos y despliegue. Si son dos, la frontera entre ellos debe ser una
interfaz explícita desde el primer día. Reconstruirlos entrelazados "porque así estaban" es
heredar un accidente histórico.

---

## Anexo · Cómo se verificó

- **Código:** lectura completa de `db.js` (1 391 líneas) y `app.jsx` (901), más los pasajes
  citados de `login.jsx`, `import.jsx`, `inventario-editor.jsx`, `components.jsx`, `crm.jsx`,
  `dashboard.jsx`, `alertas.jsx` y las 9 Edge Functions.
- **Producción** (`wjdntftoyqkkycaozlhn.supabase.co`), solo lectura: existencia de tablas,
  conteo y estructura de `workspaces`, y verificación de que el bucket `expedientes` está
  cerrado a acceso anónimo.
- **Historial git:** 324 commits; se rastrearon los cambios deliberados en las fórmulas
  (paso de `/360` a `/365` y de fecha de llegada a fecha de factura).

**Lo que no pude verificar** y conviene confirmar con acceso al panel de Supabase: qué
secretos están configurados y si el cron diario está efectivamente programado.

> **Confirmado después de escribir este documento:** `workspaces` tiene RLS desactivada en
> producción. Las políticas correctas existen pero están inertes. Detalle y arreglo en
> [03 · Lección 2](03-LECCIONES-DEL-MVP.md#lección-2--el-aislamiento-entre-clientes-no-era-verificable).

---

*Documento siguiente: [02 · Features del MVP](02-MVP-FEATURES.md) — qué existe hoy y qué
merece existir en v2.*
