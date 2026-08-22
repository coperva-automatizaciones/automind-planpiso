# 11 · Cuestionario de producto y dominio

> **Para:** Ricardo Ávalos (CTO) · con preguntas que corresponden a Jhonatan (Operaciones) y a
> Alan y Luis (modelo de ingresos), señaladas donde toca.
> **De:** Jose Santiago · Full Stack Lead · 12 de agosto de 2026
> **Origen:** las decisiones de arquitectura de [`docs/10`](10-ARQUITECTURA-OBJETIVO.md)
> descansan sobre supuestos. Estas son las preguntas cuya respuesta los confirma o los tumba.

---

# PARTE 1 · La sesión del 13 de agosto

**Tres preguntas.** Encadenadas: la tercera depende de la primera, y la segunda alimenta el trabajo
de integración independientemente de lo que salga en las otras dos.

Todo lo demás de este documento es **banco de preguntas para sesiones siguientes** (parte 2).

---

## P1 · El alcance del asistente de ventas

**Lo que entiendo hasta ahora.** El módulo se llamaba «CRM» y se pidió cambiarlo a **«asistente
del vendedor»**. Leo ese cambio como deliberado y como posicionamiento: si se llama CRM, cae en una
casilla que el DMS ya tiene ocupada —W32, GDS y el resto traen su propio módulo de CRM— y el
comprador compara feature por feature. Si se llama asistente, entra en una casilla que el DMS **no
tiene**. Encaja además con cómo la empresa describe el producto: *agentes que se hacen cargo de
procesos concretos*.

**El problema.** El nombre cambió; la construcción no. Hoy el módulo sigue siendo un **sistema de
registro del proceso de venta**: pipeline de ocho etapas, Kanban, lista, vista de urgentes, tablero
de métricas. La propia pantalla lo dice — el título es «Asistente del vendedor» y el subtítulo,
«Pipeline de ventas».

**La pregunta.**

> Si es un asistente y no un CRM: **¿qué debería hacer que un CRM no hace, y qué de lo que hoy
> tiene sobra?**

**Por qué la hago.** Porque el módulo se parte en dos mitades muy desiguales, y la respuesta decide
cuál se reconstruye:

| Parece asistente de verdad — ningún DMS lo hace | Parece mobiliario de CRM — el DMS ya lo trae |
|---|---|
| Extracción de documentos con IA, con validación cruzada contra la unidad cotizada. 195 líneas afinadas en 19 commits | Kanban, lista, vista de urgentes y tablero de métricas: cuatro formas de ver la misma cartera |
| El expediente que se arma solo desde una foto del INE | Las ocho etapas de pipeline como registro |
| Verificación de contacto | El embudo de `ventas.jsx`, que además ya solapa con el tablero interno del CRM |

**Qué cambia según la respuesta.** Si el asistente es la columna izquierda, hay una consecuencia
inmediata: **consume la cartera de clientes, no la posee** — y hoy no existe ninguna vía de entrada
de datos, las ocho integraciones del MVP son de salida. Ese hueco pasa de detalle a pieza central.

---

## P2 · Los DMS que aparecen de verdad

**Lo que entiendo hasta ahora.** El DMS es la norma en una distribuidora, y mencionaste
**MultiMarca W32**. Lo revisé: 25 años, desarrollo mexicano, **certificado por las armadoras** —
y **no cubre plan piso**. Tiene registro de inventarios, pero ni control de piso, ni días de
gracia, ni costo financiero. Es literalmente el hueco que describiste el día 6.

**La pregunta.**

> **¿Qué sistemas usan las agencias con las que se ha hablado, y qué tan abiertos son?** Y de una
> de ellas: ¿podemos ver **un reporte de inventario exportado** y **el documento de la financiera**
> con las condiciones del plan piso? No hace falta acceso ni datos reales — dos archivos de ejemplo
> bastan.

**La segunda mitad pesa más que la primera.** Cuál DMS usan importa menos que **cuánto dejan
leer**, y eso no es una pregunta técnica sino comercial y contractual. En Estados Unidos el acceso
a los datos del DMS terminó en una década de litigio antimonopolio: CDK y Reynolds acordaron
restringir el acceso de terceros para eliminar a los integradores independientes, y acabó en
acuerdos de **630 millones de dólares** con proveedores de software y **100 millones** con las
propias distribuidoras. Hoy CDK opera un mercado de APIs con certificación, cuota de listado y
**cargo de alta por cada distribuidora**.

En México no hay litigio conocido, pero la estructura es equivalente: **W32 está certificado por
las armadoras**, que es una posición de guardián a la que se llegó por otro camino. Tres cosas que
conviene saber antes de apostar el producto a esta vía:

1. **El único camino robusto es el que no depende del proveedor** — que la agencia exporte sus
   propios datos. No es solo el más barato: es el que **no puede cerrarse por decisión comercial de
   un tercero**.
2. **Si la integración se cobra por distribuidora, es costo variable por cliente** — y eso entra
   directo en el modelo de ingresos, que sigue pendiente desde el día 5. Un cargo de alta × 900
   agencias es una línea del margen, no un detalle de implementación.
3. **El contrato de la agencia con su DMS puede prohibirle dar acceso a un tercero**, aunque los
   datos sean suyos. Es exactamente lo que se litigó allá, y es el punto ciego: puede bloquear
   todo lo demás. **Convendría ver un contrato real.**

**Por qué la hago.** Encontré algo que cambia el planteamiento: **plan piso necesita dos fuentes,
y el DMS solo es una.**

| Dato | Quién lo tiene |
|---|---|
| VIN, modelo, fecha de factura, estado de la unidad | El DMS |
| **Monto financiado, tasa, días de gracia** | **La financiera** — y no tiene API conocida |

Eso explica por qué el importador del MVP tolera veinte variantes de encabezado: **no está
comiendo la exportación de un sistema, está comiendo un Excel hecho a mano que ya fusionó las dos
fuentes.**

**Y una subpregunta que puede ser la causa raíz de un defecto:**

> ¿Los días de gracia y la tasa son **por unidad**, o son condiciones de la **línea de crédito** que
> aplican a todo lo que se disponga bajo ella?

El MVP los guarda por unidad. Si en realidad cuelgan del contrato, el modelo está en el nivel
equivocado — y explicaría por qué tantas unidades tienen ese campo vacío, que es el origen de que
la misma unidad se vea 🟢 al entrar y ⚫ al recargar.

*Detalle completo en [`12-DMS-E-INTEGRACION.md`](12-DMS-E-INTEGRACION.md).*

---

## P3 · ¿Delimitamos la reconstrucción a plan piso?

*Depende de P1: la respuesta cambia el tamaño del asistente y por tanto el argumento.*

**La propuesta.**

> Cerrar el alcance de la reconstrucción a **plan piso**, y dejarlo impecable —con pruebas, alertas
> fiables y los defectos corregidos— antes de tocar el asistente.

**No es un recorte de producto, es un orden de construcción.** El compromiso del día 5 —que el MVP
cubre los dos primeros de los nueve procesos críticos— sigue en pie. Lo que planteo es cuál va
primero, y hay una razón que lo decide sola:

> **Plan piso está desbloqueado. El asistente no.** El asistente depende de la respuesta a P1:
> hasta saber qué es asistente y qué es mobiliario de CRM, portarlo sería reconstruir justo lo que
> el cambio de nombre quiso dejar atrás. Plan piso no depende de ninguna respuesta pendiente.

### El costo, lado a lado

| Dimensión | Plan piso | Asistente de ventas |
|---|---|---|
| **Código a reconstruir** | 3 826 líneas | **6 785 — 1,8 veces más** |
| **Integración con el DMS** | Una dirección, ~10 campos, diaria, sin conflictos de escritura | **Bidireccional**, cartera completa, cuasi tiempo real, con resolución de conflictos |
| **Datos personales** | Casi ninguno: vehículos y usuarios internos | INE, CURP, RFC, licencia, domicilio, comprobantes de ingresos |
| **Carga regulatoria** | Mínima | Ley de datos personales nueva desde 2025, conservación a diez años, transferencia a un tercero al llamar al modelo de IA, bitácora de accesos |
| **Dependencias externas** | Correo y Telegram — ya funcionan | Modelo de IA, almacenamiento de documentos, verificación de teléfono (hoy a media capacidad) |
| **Competencia** | **Ninguna**: nadie cubre este hueco | Todos los DMS traen CRM |
| **Decisiones pendientes** | Ninguna que bloquee | Qué es asistente y qué es mobiliario |
| **Estado hoy** | Funcionalmente completo | Funcional pero insostenible: un solo componente de 2 490 líneas |

Las cifras están medidas sobre `origin/main`. El reparto del código de funcionalidad es
**36 % plan piso · 64 % asistente**.

### Tres argumentos más

1. **Es lo que ya decía el análisis previo.** [`docs/04`](04-REQUISITOS-V2.md) §5 pone el CRM en
   fase 3 y marca la fase 2 —alertas fiables— como *«el punto de corte para volver a poner
   clientes»*. Se escribió antes de saber nada de esto y coincide.
2. **Los defectos que importan están todos en plan piso**: la unidad que se ve verde y negra, el
   porcentaje multiplicado por cien, el importador abierto al vendedor, la fecha de factura
   inventada cuando falta. Son **los números con los que la agencia decide**. El asistente puede
   estar impecable y no arregla ninguno.
3. **Difiere casi toda la exposición legal.** Todo el frente de datos personales vive en el
   expediente, que es del asistente. Plan piso solo maneja vehículos y usuarios internos.

### El costo real de la propuesta, dicho de frente

**La extracción con IA vive dentro del asistente**, y es lo único que hoy demuestra «IA que hace
trabajo» — que es la promesa central de la empresa. No se puede reubicar: en plan piso no hay
documentos que leer.

Así que la versión honesta es: **plan piso primero deja sin demostración de IA durante ese tramo.**
Si lo que se está enseñando a distribuidoras se apoya en eso, hay que saberlo antes de decidir —
y esa parte es tanto de Alan como tuya.

---

> **Fin de la sesión del 13.** Lo que sigue es el banco de preguntas para más adelante.

---

# PARTE 2 · Banco de preguntas

## Cómo está organizado

**No es una lista: es un árbol.** Hay **seis preguntas raíz**, y cada una **abre o cierra un bloque
entero** de las siguientes. Preguntarlo todo de golpe haría perder tiempo en ramas que quizá ni
existan.

> **Dos de las seis quedaron absorbidas por la parte 1.** **R1** (¿convivir con el DMS o
> sustituirlo?) está prácticamente respondida: W32 no cubre plan piso, y el cambio de nombre a
> «asistente» apunta a no competir. **R4** (¿el módulo de clientes es parte del producto?) es hoy
> **P1**, mejor planteada. Se conservan por si la sesión las reabre.

```
RONDA 1 · las seis raíz — una sesión de trabajo, sin preparación previa
   │
   ├─ R1  ¿Convivimos con el DMS o lo sustituimos?  ──────►  rama A · frente fiscal
   ├─ R2  ¿De dónde sale hoy la lista de unidades?  ──────►  rama B · ingesta de datos
   ├─ R3  ¿El grupo de agencias solo mira, u opera? ──────►  rama C · identidad y permisos
   ├─ R4  ¿El módulo de clientes es parte del producto? ──►  rama D · expediente y cumplimiento
   ├─ R5  ¿Cuáles son los siete procesos críticos?  ──────►  rama E · alcance y roadmap
   └─ R6  ¿Cuándo deja una unidad de costar dinero? ──────►  rama F · modelo de dominio

RONDA 2 · solo las ramas que la ronda 1 haya abierto

RONDA 3 · reglas finas del dominio — no dependen de nada.
          Se pueden responder por escrito, sin sesión.
```

**Cada pregunta lleva por qué la hago y qué cambia según la respuesta**, para que se vea qué está
en juego. Donde tengo un supuesto de trabajo lo digo — **corregirlo es más útil que confirmarlo**.

🔴 = bloquea trabajo que estoy haciendo ahora mismo.

---

## Ruta corta · solo los dos módulos que ya existen

**Si el objetivo de la sesión es desbloquear el diseño y no cerrar el roadmap**, este es el
recorte. Son las preguntas que condicionan cómo tiene que estar construido **plan piso** y
**asistente de ventas** — los dos procesos que el MVP ya cubre y que se van a reconstruir sí o sí.
Todo lo demás puede esperar sin frenar nada.

Quince preguntas, agrupadas por lo que definen. El número remite a dónde está desarrollada.

**El reloj y el dato del plan piso**

| | Pregunta | Qué define |
|---|---|---|
| **R2** | ¿De dónde sale hoy la lista de unidades en piso? | Por dónde entra el dato |
| **B1** 🔴 | ¿Podemos ver un archivo real de una agencia? | El diseño concreto de la ingesta |
| **B2** | Gracia, tasa y saldo: ¿quién es la fuente de verdad? | Si hay que validar la captura o confiar en el origen |
| **B3** | ¿Cuántas financieras usa una agencia a la vez? | Si el **contrato de financiamiento** tiene que ser una entidad propia |
| **3.2** | ¿El reloj corre siempre desde la factura? | Si el origen del reloj es fijo o configurable |
| **3.3** | ¿Qué «factura»: la del CFDI o un documento interno? | De dónde se toma el dato del que cuelga todo |
| **3.1** | Unidad sin días de gracia: ¿verde o negro? | Tres estados que hoy están colapsados en un cero |

**La frontera entre los dos módulos** — es lo que hoy directamente no existe

| | Pregunta | Qué define |
|---|---|---|
| **R6** 🔴 | ¿Cuándo deja exactamente una unidad de generar intereses? | El evento central del producto |
| **F1** | ¿«Vendida» y «liberada del financiamiento» son uno o dos estados? | Si hay un hueco en el que la unidad ya se vendió y sigue costando |
| **A2** | La «carta factura»: ¿aparece en ese momento? | Si falta una transición en el modelo |

**El expediente del asistente de ventas**

| | Pregunta | Qué define |
|---|---|---|
| **D3** | ¿El expediente se armó para el crédito o para el cumplimiento? | Si son una cosa o dos, y qué campos son obligatorios |
| **D4** | El aviso de privacidad: ¿lo pone la agencia o nosotros? | Quién asume la responsabilidad del documento |

**Quién ve qué** — atraviesa los dos módulos

| | Pregunta | Qué define |
|---|---|---|
| **R3** 🔴 | ¿El grupo de agencias solo mira, u opera? | El modelo de identidad y permisos completo |
| **3.4** | Unidad con dos vendedores: ¿de quién es? | Comisiones, alertas y carga de trabajo |
| **3.5** | ¿Qué debería distinguir a un director de un gerente? | Si sobra un rol o le falta contenido |

### Lo que esta ruta deja fuera a propósito

No porque no importe, sino porque **no bloquea el diseño de estos dos módulos**:

| Queda fuera | Por qué puede esperar |
|---|---|
| **R1** · convivir o sustituir al DMS | Su parte que sí afecta ahora —de dónde llega el inventario— ya la cubre R2. Lo demás (facturación, posventa, contabilidad) es alcance futuro |
| **R5** · los siete procesos críticos | Ordena el roadmap, no la arquitectura de lo que ya está definido |
| **D1 y D2** · el frente antilavado | Si se confirma, es un **módulo nuevo**, no un cambio en estos dos. Merece su propia conversación |
| **Rama E** · posventa y promesa comercial | Alcance futuro |
| **Rama A** salvo A2 · frente fiscal | Depende de R1 |
| **Modelo de ingresos** | No es de Ricardo |

> Dicho eso: **si sobra tiempo, D2 vale la pena aunque esté fuera de esta ruta.** No cambia el
> diseño de los dos módulos, pero puede cambiar el argumento comercial del producto entero, y
> Ricardo es exactamente quien sabe si eso es un dolor real en las agencias.

---

# RONDA 1 · Las seis preguntas raíz

---

## R1 · ¿Automind convive con el DMS de la agencia, o aspira a sustituirlo?

**Mi supuesto de trabajo: convive.** He diseñado asumiendo que el sistema de gestión de la agencia
sigue siendo el registro oficial del inventario y de la facturación, y que Automind vigila y actúa
sobre él.

**Por qué lo pregunto.** Es la decisión que más superficie de producto define, y la tomé yo por
omisión al no tener con quién contrastarla. Si la intención real es sustituir al DMS, el producto
es varias veces más grande y el argumento de venta cambia por completo: pasa de «te aviso antes de
que pierdas dinero» a «cambia el sistema con el que opera tu empresa».

**Qué cambia según la respuesta.**

| Si… | Entonces |
|---|---|
| **Convive** | El producto reconcilia datos que llegan de fuera y acepta que no manda sobre ellos. La facturación, la posventa y la contabilidad quedan fuera del alcance. Se abre la **rama A** para acotar la frontera |
| **Sustituye** | Entran facturación electrónica, posventa, refacciones y contabilidad. Es otro proyecto, con otro plazo. Se abre la **rama A′**, que es un cuestionario entero por sí sola |

No hay punto medio barato: la frontera puede moverse, pero tiene que existir y estar dibujada.

---

## R2 · ¿De dónde sale hoy la lista de unidades en piso, en una agencia real?

¿Del DMS, de un reporte que manda la financiera, de un Excel que mantiene alguien a mano, o de las
tres cosas a la vez sin que coincidan?

**Por qué lo pregunto.** El MVP tiene un importador de Excel que tolera veinte variantes de nombre
de columna. Esa tolerancia se construyó por algo — sugiere que cada agencia llega con un archivo
distinto. Necesito saber si eso es la norma o fue un caso aislado, porque de ahí cuelga toda la
capa de integración.

**Qué cambia según la respuesta.**

| Si… | Entonces |
|---|---|
| **Archivo** (Excel, reporte, exportación) | La integración es importación robusta y el trabajo está acotado. Es el camino que sé construir sin depender de nadie. **Rama B** |
| **DMS directo** | Hay que negociar acceso con un tercero, con plazos comerciales que no controlamos. **Rama B′** |
| **Las tres a la vez** | El problema real es la reconciliación, no la lectura. Cambia el diseño del modelo de datos |

---

## R3 · El grupo de agencias: ¿solo mira, o también opera? 🔴

**Doy por hecho que van a existir los dos casos** —agencias sueltas y grupos con varias— porque
así es el mercado. Lo que necesito saber no es cuál de los dos, sino **qué es un grupo por
dentro**.

**Por qué lo pregunto.** Es la decisión de modelado que tengo que cerrar esta semana, y hay una
contradicción heredada: la visión del día 7 sitúa al **director** por encima de varias agencias,
mientras que en el MVP el director opera dentro de una sucursal, con un propietario de agencia por
encima. Son dos modelos incompatibles conviviendo en el mismo sistema. Y la jerarquía de dos
niveles que existe hoy **nunca se ha ejercitado**: en producción hay cuatro agencias con
exactamente una sucursal cada una.

Mi propuesta es modelar «ver varias agencias» como un **permiso**, no como un nivel de jerarquía.
Con eso la agencia suelta es simplemente el caso de una, y no hay que inventarle un padre vacío —
que es justo lo que el sistema hace hoy. Pero eso solo funciona **si el grupo no tiene vida
propia**.

**La pregunta concreta, entonces:** ¿un grupo es solo alguien que ve varias agencias, o es una
entidad con operación y datos propios?

| Si el grupo… | Entonces |
|---|---|
| **Solo agrega para ver** — el director del grupo consulta el consolidado, pero las unidades, los usuarios y las ventas pertenecen a cada agencia | El permiso basta. Cubre además al auditor externo y al consultor sin inventar un nivel para cada uno. Mi propuesta se sostiene |
| **Opera de verdad** — se trasladan unidades entre agencias del grupo, hay inventario compartido, hay gente contratada por el grupo y no por una agencia, o hay consolidación contable con efectos fiscales | El grupo es una entidad real y necesita ser un nivel, con datos colgando de él. Más caro, pero mucho más barato ahora que con clientes dentro. **Rama C** |

**Cuatro señales que lo resuelven en un minuto**, si la respuesta general no es evidente: ¿puede
una unidad pasar de una agencia del grupo a otra? · ¿un vendedor puede atender clientes de dos
agencias? · ¿el grupo compra el financiamiento centralizado o cada agencia el suyo? · ¿alguien
pide un reporte consolidado que sirva para algo más que mirar?

---

## R4 · El módulo de clientes: ¿es parte de este producto o se vende aparte?

**Por qué lo pregunto.** Es el 25 % del código, tiene sus propios usuarios, su propio ciclo de vida
y su propia carga regulatoria. Toca al plan piso en un solo punto —elegir la unidad al cotizar— y
en el sistema actual **ni siquiera están conectados**: verifiqué que cerrar una venta ahí no retira
la unidad del plan piso.

**Qué cambia según la respuesta.** Voy a construir la frontera desde el primer día en cualquier
caso, porque es barata ahora y muy cara después. Lo que cambia es todo lo demás:

| Si… | Entonces |
|---|---|
| **Es parte del producto** | El expediente del cliente es nuestro, y con él toda la carga de datos personales y de identificación. Se abre la **rama D**, que es la de mayor consecuencia legal |
| **Se vende aparte** | Se despliegan y se cobran por separado. La rama D se convierte en un producto distinto, con su propio calendario |

---

## R5 · ¿Cuáles son los siete procesos críticos que faltan por detallar?

**Por qué lo pregunto.** De los más de cincuenta procesos documentados, nueve se marcaron como
críticos y el MVP cubre dos —plan piso y asistente de ventas—. Los otros siete se mencionaron pero
no se detallaron, y aparecen como pendiente en los reportes de los días 5, 6 y 7.

**Qué cambia según la respuesta.** No bloquea la arquitectura: he diseñado para los dos procesos
actuales con las costuras puestas donde harán falta. Pero **bloquea el roadmap** — sin ellos no hay
forma de priorizar más allá de la fase 2, ni de saber qué tiene que poder soportar el sistema sin
construirlo todavía.

Y hay un caso concreto que depende de esta respuesta: si **el cumplimiento antilavado** está entre
esos siete, hay un módulo entero que no aparece en ningún plan. Se abre la **rama E**.

---

## R6 · ¿En qué momento exacto una unidad deja de generar intereses? 🔴

¿Al cerrarse la venta, al facturar, al entregar la unidad, o cuando la agencia liquida el saldo con
el banco?

**Por qué lo pregunto.** Es el evento central del producto y hoy **no existe en el sistema**.
Verifiqué que cerrar la venta en el módulo de clientes no retira la unidad del plan piso: los dos
módulos no se tocan en ningún punto. Una unidad vendida sigue sumando intereses en el tablero.

**Qué cambia según la respuesta.** Define la transición más importante del sistema y la única
frontera real entre los dos procesos del MVP. También decide si «vendida» y «liberada del
financiamiento» son el mismo estado o dos distintos — y de ahí cuelga la **rama F**, que son las
reglas del ciclo de vida de la unidad.

---

> **Fin de la ronda 1.** Con estas seis respuestas puedo cerrar el modelo de datos y saber qué
> ramas abrir. Lo que sigue solo tiene sentido después.

---

# RONDA 2 · Las ramas

Cada rama arranca con la respuesta que la abre. **Si esa respuesta fue otra, la rama entera se
salta.**

---

## Rama A · Frontera fiscal *(si R1 = convive)*

Si convivimos con el DMS, estas cuatro acotan exactamente dónde termina nuestro producto.

### A1 · ¿Confirmas que Automind **no emite factura**?

**Por qué lo pregunto.** Emitir CFDI en México no es una funcionalidad más: es timbrado con un PAC,
complementos obligatorios, cancelaciones, sustituciones y responsabilidad fiscal frente al SAT.
Para venta de vehículos hay complemento propio para unidades nuevas, y otro obligatorio cuando se
recibe un usado a cuenta del nuevo. Si eso entrara al alcance, sería un proyecto dentro del
proyecto.

**Qué cambia.** Si consumimos, el frente fiscal desaparece del roadmap y solo leemos datos. Si en
algún momento emitimos, hay que elegir PAC, certificarse, y asumir que un error nuestro es un
problema fiscal del cliente.

### A2 · La «carta factura»: ¿aparece en el ciclo que nos interesa?

**Por qué lo pregunto.** Es un documento habitual en la operación de agencia y no aparece en
ninguna parte del MVP. Si tiene relación con el momento en que una unidad se considera vendida o
liberada, es un hueco en nuestro modelo — y conecta directamente con R6.

### A3 · REPUVE y el NIV: ¿hay alguna obligación registral que se espere del sistema?

**Por qué lo pregunto.** El NIV es la llave natural para identificar una unidad, y ya lo usamos
para deduplicar en la importación. Quiero confirmar que se queda ahí, como identificador, y que no
se espera de nosotros ningún trámite registral.

### A4 · ¿Qué sistemas usan hoy las agencias con las que se ha hablado?

*Probablemente sea pregunta para Jhonatan.*

**Por qué lo pregunto.** He identificado varios DMS con presencia en México; uno de ellos declara
alrededor de 188 concesionarias. Saber cuáles aparecen de verdad en nuestras conversaciones ordena
la cola de integraciones.

**Qué cambia.** Si se repiten dos o tres nombres, se integra con esos y el resto por archivo. Si
cada agencia trae uno distinto, la ingesta genérica deja de ser el plan B y pasa a ser el plan A.

---

## Rama A′ · Si R1 = sustituye

No desarrollo las preguntas todavía, a propósito: **si la respuesta es «sustituye», el cuestionario
que hace falta es otro y más largo**, y lo prepararía con tiempo. Lo que quedaría por definir, para
que se vea el tamaño: facturación y timbrado, posventa y refacciones, órdenes de servicio,
inventario de partes, cuentas por cobrar, contabilidad, y la migración desde el sistema que la
agencia ya opera.

---

## Rama B · Ingesta de datos *(si R2 = archivo)*

### B1 · ¿Podemos conseguir de una agencia el archivo real con el que lleva su piso? 🔴

Con datos reales o anonimizados, da igual. Uno del inventario y, si existe, uno del portal de la
financiera.

**Por qué lo pregunto.** Es la petición que más trabajo desbloquea de todo el cuestionario. Sin ver
un archivo real, cualquier diseño de la ingesta es especulación: no sé qué campos vienen, con qué
nombres, con qué formato de fecha, ni qué falta.

**Qué cambia.** Con un archivo en la mano, la capa de integración se diseña en una tarde y las
pruebas se escriben contra datos verdaderos. Sin él, construimos contra el juego de datos que yo
mismo inventé, y lo descubrimos el día de la primera instalación.

### B2 · Días de gracia, tasa y saldo: ¿quién es la fuente de verdad?

¿La financiera los publica en un portal, los manda por correo, o los captura la agencia a mano?

**Por qué lo pregunto.** Son los tres números de los que depende **todo** el cálculo del semáforo.

**Qué cambia.** Si se capturan a mano, el producto hereda el error humano de la captura y hay que
diseñar para detectarlo —avisar de que una tasa es imposible—. Si vienen de una fuente autorizada,
el producto puede conciliarse contra ella.

### B3 · ¿Cuántas financieras usa una agencia a la vez, y cambian las condiciones entre ellas?

**Por qué lo pregunto.** El MVP guarda días de gracia por unidad y una configuración por sucursal.
Si una agencia opera con tres financieras y cada una tiene su calendario y su tasa, esa
configuración no puede vivir donde está hoy.

**Qué cambia.** Si es una financiera por agencia, el modelo actual sirve. Si son varias, hace falta
el **contrato de financiamiento** como entidad propia, con sus condiciones, y cada unidad colgando
de uno.

---

## Rama B′ · Acceso al DMS *(si R2 = DMS directo)*

### B′1 · ¿Alguien ha explorado ya el acceso a los datos del DMS?

¿Hay contrato, API documentada, exportación programada, o de momento nadie ha preguntado?

**Por qué lo pregunto.** No encontré evidencia pública de APIs abiertas en ninguno de los DMS del
mercado mexicano. Si el acceso se negocia caso por caso con el proveedor, tiene un plazo comercial
que conviene empezar ya, porque no lo acelera ninguna decisión técnica.

### B′2 · Cuando el dato del DMS y el nuestro no coinciden, ¿quién gana?

**Por qué lo pregunto.** Va a pasar. Alguien edita una unidad en Automind y otro la edita en el DMS
el mismo día. El sistema necesita una regla, y esa regla es de negocio, no técnica.

**Qué cambia.** «Gana el DMS siempre» es simple y se implementa en un día. «Gana el más reciente»
exige marcas de tiempo fiables en ambos lados. «Que decida un humano» exige una bandeja de
conflictos, que es una pantalla entera.

---

## Rama C · Identidad y permisos *(si R3 = el grupo opera de verdad)*

Solo si el grupo resultó ser una entidad con operación propia. Si únicamente agrega para ver, esta
rama entera se salta.

### C1 · Cuando una unidad se traslada de una agencia del grupo a otra, ¿qué pasa con el reloj?

**Por qué lo pregunto.** Es la consecuencia más incómoda de que el grupo opere. Si el plan piso lo
contrató la agencia de origen, la deuda no se mueve con la unidad — pero el vendedor que la tiene
enfrente sí es de la otra. Hay que decidir a quién se le avisa, a quién se le cuenta y contra qué
contrato corre el interés.

**Qué cambia.** Determina si la unidad pertenece a una agencia o a un contrato de financiamiento,
que no es lo mismo. Es la diferencia entre dos modelos de datos distintos.

### C2 · ¿El financiamiento se contrata por grupo o por agencia?

**Por qué lo pregunto.** Si la línea de crédito la firma el grupo y se reparte entre sus agencias,
entonces el sujeto del plan piso es el grupo, no la agencia — y el semáforo que importa de verdad
es el consolidado.

### C3 · ¿Quién firma el contrato con nosotros y quién usa el producto todos los días?

**Por qué lo pregunto.** Si quien paga es el dueño del grupo pero quien vive dentro del sistema es
el gerente de piso, el producto tiene que convencer a dos personas distintas con argumentos
distintos. Eso ordena qué se construye primero.

---

## Rama D · Expediente y cumplimiento *(si R4 = el CRM es parte del producto)*

Esta rama salió del análisis regulatorio y es la que más me sorprendió. La planteo como hipótesis,
no como afirmación: **la industria la conoces tú, yo llevo cinco días en ella.**

### D1 · ¿Cómo cumple hoy una agencia con la Ley Antilavado, y quién lo hace?

**Por qué lo pregunto.** La compraventa de vehículos es actividad vulnerable: obliga a identificar
al cliente por encima de cierto monto, a presentar aviso mensual a la autoridad y a conservar
expedientes. Quiero saber si en la práctica lo lleva el contador, un despacho externo, un sistema
especializado, o si es un frente descuidado.

**Qué cambia.** Si ya hay una herramienta que lo resuelve, no competimos con ella. Si lo lleva
alguien en hojas de cálculo, es un dolor real y desatendido.

### D2 · La reforma de 2025: ¿la están sintiendo las agencias? 🔴

**Por qué lo pregunto.** Encontré algo que no está en ninguno de nuestros documentos. La reforma de
julio de 2025 obliga a los sujetos obligados —es decir, a nuestros clientes— a operar **mecanismos
automatizados de monitoreo**, capacitación anual, auditoría anual y conservación de expedientes a
diez años. Si eso es correcto, **la ley obliga a la agencia a comprar software que hoy la mayoría
no tiene.**

**Qué cambia.** Puede ser el argumento comercial más fuerte del producto —una obligación legal con
fecha, no una mejora de eficiencia— o puede ser un frente ya cubierto por otros. Necesito saber
cuál de las dos antes de darle peso en ningún documento que salga de aquí.

*Lo tengo verificado contra fuentes públicas, no contra asesor jurídico. Si va a sostener una
decisión comercial, conviene que lo confirme uno.*

### D3 · El expediente del MVP: ¿se diseñó para el crédito o para el cumplimiento?

**Por qué lo pregunto.** El sistema pide INE, CURP, RFC, comprobante de domicilio y comprobantes de
ingresos, y tiene un apartado llamado «Prevención de lavado de dinero» donde se sube un archivo.
Eso me hace pensar que alguien tuvo el requisito en mente. Pero hoy es solo un adjunto: no hay
acumulado por cliente, ni comparación contra umbral, ni generación de aviso.

**Qué cambia.** Si nació para el cumplimiento, hay una intención de producto que rescatar y
completar. Si nació para armar el expediente de crédito ante la financiera, son dos cosas distintas
y conviene separarlas.

### D4 · El aviso de privacidad: ¿lo pone cada agencia o lo ponemos nosotros?

**Por qué lo pregunto.** El MVP permite subir un documento por agencia y ofrece uno genérico por
defecto. Ese detalle tiene consecuencia legal: si el genérico es nuestro y la agencia lo usa tal
cual, estamos redactando un documento que compromete a nuestro cliente frente a la autoridad.

**Qué cambia.** Si cada agencia pone el suyo, el producto solo lo almacena y registra la
aceptación. Si damos plantilla, alguien tiene que mantenerla al día — y la ley de datos personales
**cambió por completo en marzo de 2025**.

---

## Rama E · Alcance y roadmap *(según lo que salga de R5)*

### E1 · ¿La posventa está en el horizonte?

**Por qué lo pregunto.** Del análisis de la industria salió que la posventa y el financiamiento
aportan el grueso del margen de una agencia con una fracción de los ingresos. Si ahí hay más
utilidad que defender que en la venta de unidades nuevas, es una lectura mía que quiero contrastar
contigo antes de darle valor.

**Qué cambia.** Nada de lo inmediato. Pero si la posventa entra en algún momento, prefiero saberlo
antes de haber modelado el sistema entero alrededor del piso de exhibición.

### E2 · En la demostración a una distribuidora, ¿qué se promete exactamente?

**Por qué lo pregunto.** El MVP se está enseñando ya a clientes potenciales. Lo que se compromete
en esa conversación es lo que de verdad marca la prioridad, por encima de cualquier plan escrito.

---

## Rama F · Ciclo de vida de la unidad *(a partir de R6)*

### F1 · ¿«Vendida» y «liberada del financiamiento» son el mismo estado o dos?

**Por qué lo pregunto.** Es la consecuencia directa de R6. Si entre la venta y la liquidación del
saldo pasan días, la unidad sigue costando dinero durante ese hueco — y ese hueco es información
que hoy nadie ve.

### F2 · El punto de no retorno de 120 a 180 días: ¿es real, y varía por financiera?

**Por qué lo pregunto.** Lo recogí de fuentes públicas: pasado ese plazo, el financiamiento suele
exigir la liquidación del saldo con efectivo propio. Si es cierto, es un momento mucho más grave
que cualquier estado del semáforo actual, y el sistema no lo representa.

**Qué cambia.** Podría justificar un aviso distinto: más temprano, y dirigido a quien maneja la
tesorería, no al vendedor.

---

# RONDA 3 · Reglas finas del dominio

**No dependen de ninguna respuesta anterior.** Son cuatro casos donde el sistema actual se responde
a sí mismo de dos maneras distintas. No son errores de programación: son preguntas de negocio que
nunca se decidieron, y las heredé sin respuesta.

Se pueden contestar por escrito, sin sesión.

### 3.1 · Una unidad sin días de gracia capturados: ¿está sana o está costando dinero?

**Por qué lo pregunto.** Hoy el sistema responde las dos cosas. La misma unidad aparece **verde** al
iniciar sesión y **negra** al recargar la página, porque hay dos cálculos que no coinciden cuando
ese dato falta. Lo reproduje: una unidad con quince días vencidos y $2 571 de interés acumulado se
muestra como «Margen saludable, 0 % del plan consumido».

**Lo que creo que pasa de verdad.** El sistema mezcla tres situaciones en un mismo cero: *nadie
capturó el dato*, *la unidad no tiene gracia y genera interés desde el día uno*, y *la unidad no
está en plan piso porque se pagó de contado*. Son tres cosas que un gerente distingue sin pensar,
y el sistema no.

**Qué cambia.** Si me confirmas que son tres situaciones distintas, el modelo las separa y la regla
se vuelve obvia en cada caso. Es la corrección con mejor relación entre esfuerzo y efecto de todo
el análisis.

### 3.2 · ¿El reloj corre siempre desde la factura, en todos los contratos?

**Por qué lo pregunto.** El MVP arranca desde la fecha de factura, y hubo un cambio deliberado en
el historial para que fuera así — antes contaba desde la llegada de la unidad. Alguien tomó esa
decisión con criterio; quiero confirmar que aplica a **todas** las financieras.

**Qué cambia.** Si alguna cuenta desde la recepción física, el origen del reloj tiene que ser
configurable por contrato. Es mejor saberlo antes de escribir la fórmula que después.

### 3.3 · ¿La fecha de factura que usamos es la del CFDI o la de un documento interno?

**Por qué lo pregunto.** Es el número del que cuelga todo el semáforo. Si «factura» significa cosas
distintas en el sistema de la agencia, en el del fabricante y en el nuestro, el reloj puede estar
corriendo desde el día equivocado sin que nadie lo note.

### 3.4 · Una unidad asignada a dos vendedores: ¿de quién es?

**Por qué lo pregunto.** Encontré dos pantallas que cuentan distinto para el mismo día y la misma
sucursal: el tablero reparte seis y cinco unidades entre dos vendedores; el directorio de equipo
reparte siete y tres. Ninguna es obviamente la correcta — hay unidades compartidas y cada vista
aplica su propio criterio.

**Qué cambia.** Necesito saber qué significa «las unidades de un vendedor» cuando la unidad es
compartida: ¿cuenta para los dos, se reparte, o hay un responsable principal? De ahí cuelgan las
comisiones, las alertas y la carga de trabajo.

### 3.5 · Director y gerente: ¿qué debería distinguirlos?

**Por qué lo pregunto.** Al recorrer la aplicación con las seis cuentas encontré que **director y
gerente ven exactamente lo mismo**: las mismas pantallas, las mismas unidades, las mismas cifras.
La distinción existe en la base de datos y en la validación de pagos, pero no en lo que el sistema
deja hacer.

**Qué cambia.** O el rol de gerente sobra, o le falta lo que lo distingue. Las dos son correcciones
baratas ahora y caras con clientes dentro.

---

# Aparte · Para Alan y Luis

### · Modelo de ingresos, precio y paquetes

Pendiente desde el día 5. **No es del ámbito de Ricardo**; lo incluyo para no perderlo de vista.

**Por qué importa técnicamente, y no solo comercialmente.** Si el producto ejecuta acciones que
consumen servicios de terceros —mensajes, llamadas a modelos de inteligencia artificial,
integraciones—, entonces **medir el consumo y limitarlo por plan es una decisión de arquitectura**,
no un añadido posterior. Retrofitear medición sobre un sistema que no la contempló es de las cosas
más caras que hay.

**Qué necesito, mínimamente.** No el precio: solo si el cobro va por agencia, por sucursal, por
usuario o por volumen, y si va a haber límites que el sistema deba hacer cumplir.

---

## Qué voy a hacer con las respuestas

| Ronda | Efecto |
|---|---|
| **Ronda 1** | Cierra el modelo de datos y decide qué ramas abrir. Es lo que tiene fecha: cada semana sin respuesta es más código escrito sobre un supuesto mío |
| **Ronda 2** | Entra en el diseño de la capa de integración, la frontera con el DMS y el alcance del expediente |
| **Ronda 3** | Se convierte directamente en pruebas. Cada respuesta es un caso verificable, no una opinión |

Lo que se responda queda registrado en [`docs/10`](10-ARQUITECTURA-OBJETIVO.md) §11, que es donde
llevo la cuenta de lo que está abierto y de quién depende.

---

*Documento de elaboración propia a partir del análisis de F1 y F2.*
